// Entrena los modelos a partir del CSV y escribe model.json (lo usa la app, sin servidor).
// Uso: node train.js wine.csv
const fs = require('fs');

const FEATURES = ['fixed acidity', 'volatile acidity', 'citric acid', 'residual sugar', 'chlorides',
  'free sulfur dioxide', 'total sulfur dioxide', 'density', 'pH', 'sulphates', 'alcohol'];

const [header, ...lines] = fs.readFileSync(process.argv[2] || 'wine.csv', 'utf8').trim().split(/\r?\n/);
const cols = header.split(',');
const rows = lines.map(l => l.split(',')).map(v => ({
  x: FEATURES.map(f => +v[cols.indexOf(f)]),
  red: v[cols.indexOf('type')] === 'red' ? 1 : 0,
  q: +v[cols.indexOf('quality')],
})).filter(r => r.x.every(Number.isFinite) && Number.isFinite(r.q));

// Mezcla determinista para que el resultado sea reproducible
let seed = 42;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
rows.sort(() => rand() - 0.5);
const cut = Math.floor(rows.length * 0.8);
const train = rows.slice(0, cut), test = rows.slice(cut);

const mean = FEATURES.map((_, j) => train.reduce((s, r) => s + r.x[j], 0) / train.length);
const std = FEATURES.map((_, j) => Math.sqrt(train.reduce((s, r) => s + (r.x[j] - mean[j]) ** 2, 0) / train.length));
const z = x => x.map((v, j) => (v - mean[j]) / std[j]);

// ---------- Candidatos para calidad. Se elige el de menor MAE en validación (20% del train) y se reentrena con todo el train.
const { predict, quality, walk } = require('./src/model-core');
const r4 = v => Math.round(v * 1e4) / 1e4;

// Ridge por ecuaciones normales sobre [1, z(x), esTinto]
function fitRidge(rs) {
  const design = r => [1, ...z(r.x), r.red];
  const k = FEATURES.length + 2;
  const A = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => (i === j && i > 0 ? 1e-3 : 0)));
  const b = Array(k).fill(0);
  for (const r of rs) {
    const d = design(r);
    for (let i = 0; i < k; i++) { b[i] += d[i] * r.q; for (let j = 0; j < k; j++) A[i][j] += d[i] * d[j]; }
  }
  for (let i = 0; i < k; i++) { // eliminación de Gauss con pivoteo
    const p = A.slice(i).reduce((m, row, idx) => (Math.abs(row[i]) > Math.abs(A[m][i]) ? idx + i : m), i);
    [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    for (let r = i + 1; r < k; r++) {
      const f = A[r][i] / A[i][i];
      for (let c = i; c < k; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  const w = Array(k).fill(0);
  for (let i = k - 1; i >= 0; i--) w[i] = (b[i] - A[i].slice(i + 1).reduce((s, a, j) => s + a * w[i + 1 + j], 0)) / A[i][i];
  return { kind: 'ridge', w };
}

// Lasso (L1) por descenso por coordenadas sobre [z(x), esTinto]; intercepto sin penalizar.
// λ se elige con un 20% interno de rs; los pesos en 0 son variables que el lasso descarta.
function lassoW(rs, lambda) {
  const X = rs.map(r => [...z(r.x), r.red]), y = rs.map(r => r.q), n = rs.length, P = X[0].length;
  const w = Array(P).fill(0), sq = w.map((_, j) => X.reduce((s, v) => s + v[j] * v[j], 0) / n);
  let b0 = y.reduce((s, v) => s + v, 0) / n;
  const res = y.map(v => v - b0);
  for (let it = 0; it < 200; it++) {
    let maxStep = 0;
    for (let j = 0; j < P; j++) {
      const rho = X.reduce((s, v, i) => s + v[j] * (res[i] + v[j] * w[j]), 0) / n;
      const nw = Math.sign(rho) * Math.max(0, Math.abs(rho) - lambda) / sq[j];
      if (nw !== w[j]) { X.forEach((v, i) => (res[i] -= v[j] * (nw - w[j]))); maxStep = Math.max(maxStep, Math.abs(nw - w[j])); w[j] = nw; }
    }
    const shift = res.reduce((s, v) => s + v, 0) / n; // reajusta el intercepto
    b0 += shift; res.forEach((_, i) => (res[i] -= shift));
    if (maxStep < 1e-6) break;
  }
  return { kind: 'linear', w: [b0, ...w] };
}
function fitLasso(rs) {
  const c = Math.floor(rs.length * 0.8), a = rs.slice(0, c), b = rs.slice(c);
  const mseOf = q => b.reduce((s, r) => s + (quality({ mean, std, quality: q }, r.x, r.red) - r.q) ** 2, 0) / b.length;
  const lambda = [0.001, 0.003, 0.01, 0.03, 0.1].reduce((best, l) => (mseOf(lassoW(a, l)) < mseOf(lassoW(a, best)) ? l : best));
  const q = lassoW(rs, lambda);
  console.log(`  lasso: λ=${lambda}, variables descartadas: ${[...FEATURES, 'tipo'].filter((_, j) => q.w[j + 1] === 0).join(', ') || 'ninguna'}`);
  return { ...q, lambda };
}

// Árbol de regresión (CART, base de random forest y boosting, varianza). Nodo = hoja (número) o [variable, umbral, izq, der]; v = [...x, esTinto].
function buildTree(V, Y, idx, { maxDepth, minLeaf, mtry }, depth = 0) {
  const n = idx.length, total = idx.reduce((s, i) => s + Y[i], 0);
  if (depth >= maxDepth || n < 2 * minLeaf) return r4(total / n);
  const P = V[0].length;
  let feats = [...Array(P).keys()];
  if (mtry) for (let i = P - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [feats[i], feats[j]] = [feats[j], feats[i]]; }
  if (mtry) feats = feats.slice(0, mtry);
  let best = { score: (total * total) / n + 1e-9 };
  for (const f of feats) {
    const s = [...idx].sort((a, b) => V[a][f] - V[b][f]);
    let sumL = 0;
    for (let i = 0; i < n - 1; i++) {
      sumL += Y[s[i]];
      const nL = i + 1;
      if (nL < minLeaf || n - nL < minLeaf || V[s[i]][f] === V[s[i + 1]][f]) continue;
      const score = (sumL * sumL) / nL + ((total - sumL) ** 2) / (n - nL);
      if (score > best.score) best = { score, f, t: (V[s[i]][f] + V[s[i + 1]][f]) / 2, s, cut: nL };
    }
  }
  if (best.f === undefined) return r4(total / n);
  const o = { maxDepth, minLeaf, mtry };
  return [best.f, r4(best.t), buildTree(V, Y, best.s.slice(0, best.cut), o, depth + 1), buildTree(V, Y, best.s.slice(best.cut), o, depth + 1)];
}
const vec = r => [...r.x, r.red];

// Random forest: 40 árboles con bootstrap y 4 de 12 variables por corte.
// shortcut: hiperparámetros fijos (sin búsqueda en malla); subir árboles o bajar minLeaf hace crecer model.json.
function fitForest(rs) {
  const V = rs.map(vec), Y = rs.map(r => r.q);
  const trees = Array.from({ length: 40 }, () =>
    buildTree(V, Y, rs.map(() => Math.floor(rand() * rs.length)), { maxDepth: 16, minLeaf: 5, mtry: 4 }));
  return { kind: 'forest', trees };
}

// Gradient boosting: 300 árboles poco profundos sobre los residuos, tasa 0.05.
function fitBoost(rs) {
  const V = rs.map(vec), base = rs.reduce((s, r) => s + r.q, 0) / rs.length, lr = 0.05;
  const F = rs.map(() => base), idx = rs.map((_, i) => i), trees = [];
  for (let t = 0; t < 300; t++) {
    const tree = buildTree(V, rs.map((r, i) => r.q - F[i]), idx, { maxDepth: 4, minLeaf: 10 });
    trees.push(tree);
    V.forEach((v, i) => (F[i] += lr * walk(tree, v)));
  }
  return { kind: 'boost', base: r4(base), lr, trees };
}

// Se comparan 4 modelos por MSE en validación; los 3 se guardan (predict(...).models trae todas las predicciones) y se usa el de menor MSE.
const CANDIDATES = { 'Ridge (lineal)': fitRidge, 'Lasso (lineal L1)': fitLasso, 'Random forest': fitForest, 'Gradient boosting': fitBoost };
const errOf = (q, rs) => {
  const e = rs.map(r => quality({ mean, std, quality: q }, r.x, r.red) - r.q);
  return { mse: e.reduce((s, v) => s + v * v, 0) / e.length, mae: e.reduce((s, v) => s + Math.abs(v), 0) / e.length };
};
const vcut = Math.floor(train.length * 0.8), fit = train.slice(0, vcut), val = train.slice(vcut);
const scores = Object.entries(CANDIDATES).map(([name, f]) => ({ name, ...errOf(f(fit), val) })).sort((a, b) => a.mse - b.mse);
const winner = scores[0].name;
// Reentrenados con todo el train, en orden de MSE de validación (el primero es el que usa la app)
const qualityModels = scores.map(({ name }) => {
  const q = CANDIDATES[name](train);
  return { name, ...q, ...errOf(q, test) };
});
console.log('calidad:            MSE val   MSE prueba  MAE prueba');
scores.forEach((s, i) => console.log(`  ${s.name.padEnd(18)} ${s.mse.toFixed(3)}     ${qualityModels[i].mse.toFixed(3)}       ${qualityModels[i].mae.toFixed(3)}`));
console.log(`ganador (menor MSE en validación): ${winner}`);
const ridge = qualityModels.find(m => m.kind === 'ridge');

// Tipo (tinto/blanco): regresión logística por descenso de gradiente sobre [1, z(x)]
const sig = t => 1 / (1 + Math.exp(-t));
const tw = Array(FEATURES.length + 1).fill(0);
for (let epoch = 0; epoch < 500; epoch++) {
  const g = Array(tw.length).fill(0);
  for (const r of train) {
    const d = [1, ...z(r.x)];
    const err = sig(d.reduce((s, v, i) => s + v * tw[i], 0)) - r.red;
    d.forEach((v, i) => (g[i] += err * v));
  }
  tw.forEach((_, i) => (tw[i] -= (0.5 * g[i]) / train.length));
}

// Perfil de referencia: promedio de los vinos de calidad ≥ 7 por tipo (meta para las recomendaciones al productor)
const avgOf = rs => FEATURES.map((_, j) => rs.reduce((s, r) => s + r.x[j], 0) / rs.length);
const good = red => train.filter(r => r.q >= 7 && r.red === red);
const targets = { red: avgOf(good(1)), white: avgOf(good(0)) };
console.log(`referencia calidad≥7: ${good(1).length} tintos, ${good(0).length} blancos`);

// Distribución de calidades reales por tipo (para "mejor que el X% de los tintos")
const dist = { red: Array(11).fill(0), white: Array(11).fill(0) };
for (const r of rows) dist[r.red ? 'red' : 'white'][Math.round(r.q)]++;

// qualityWeights (ridge) se guarda siempre: el README explica los pesos y sirve de respaldo.
const model = { features: FEATURES, mean, std, qualityWeights: ridge.w, quality: qualityModels[0], qualityModels, typeWeights: tw, targets, dist };
const { mae, mse } = qualityModels[0];
const acc = test.filter(r => (predict(model, r.x).pRed > 0.5 ? 1 : 0) === r.red).length / test.length;
const base = test.reduce((s, r) => s + Math.abs(6 - r.q), 0) / test.length;
console.log(`train=${train.length} test=${test.length}`);
console.log(`calidad (${winner}) MSE prueba=${mse.toFixed(3)} MAE prueba=${mae.toFixed(3)} (siempre-6 MAE=${base.toFixed(3)})  tipo accuracy=${(acc * 100).toFixed(1)}%`);
if (!(mae < base && acc > 0.95)) throw new Error('El modelo no supera la línea base, no se guarda');

fs.writeFileSync('src/model.json', JSON.stringify({ ...model, metrics: { mae, mse, acc, n: rows.length, model: winner, validation: scores } }));
console.log('src/model.json escrito');
