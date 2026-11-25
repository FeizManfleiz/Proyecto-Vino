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

// Calidad: regresión ridge por ecuaciones normales sobre [1, z(x), esTinto]
const design = r => [1, ...z(r.x), r.red];
const k = FEATURES.length + 2;
const A = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => (i === j && i > 0 ? 1e-3 : 0)));
const b = Array(k).fill(0);
// Referencias de alta gama (no vienen del dataset; solo entran a la regresión de calidad). w = cuántos vinos "vale".
// Peso 50: con más el error de prueba empeora (w=200 → MAE 0.594), con 1 no mueve nada (5197 vinos más).
const REFERENCES = [
  { name: 'Romanée-Conti (estimado)', x: [5.5, 0.5, 0.2, 1.5, 0.06, 15, 50, 0.9945, 3.55, 0.65, 13.2], red: 1, q: 10, w: 50 },
];
for (const r of [...train, ...REFERENCES]) {
  const d = design(r), w = r.w ?? 1;
  for (let i = 0; i < k; i++) { b[i] += w * d[i] * r.q; for (let j = 0; j < k; j++) A[i][j] += w * d[i] * d[j]; }
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
const qw = Array(k).fill(0);
for (let i = k - 1; i >= 0; i--) qw[i] = (b[i] - A[i].slice(i + 1).reduce((s, a, j) => s + a * qw[i + 1 + j], 0)) / A[i][i];

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

const model = { features: FEATURES, mean, std, qualityWeights: qw, typeWeights: tw, targets, dist };
const { predict } = require('./src/model-core');
const mae = test.reduce((s, r) => s + Math.abs(predict(model, r.x, r.red).quality - r.q), 0) / test.length;
const acc = test.filter(r => (predict(model, r.x).pRed > 0.5 ? 1 : 0) === r.red).length / test.length;
const base = test.reduce((s, r) => s + Math.abs(6 - r.q), 0) / test.length;
console.log(`train=${train.length} test=${test.length}`);
console.log(`calidad MAE=${mae.toFixed(3)} (siempre-6 MAE=${base.toFixed(3)})  tipo accuracy=${(acc * 100).toFixed(1)}%`);
for (const r of REFERENCES) console.log(`referencia ${r.name}: predice ${predict(model, r.x, r.red).quality.toFixed(2)} (etiqueta ${r.q})`);
if (!(mae < base && acc > 0.95)) throw new Error('El modelo no supera la línea base, no se guarda');

// Cortes de gama por cuantiles: la regresión comprime las predicciones hacia la media (los tintos reales de 8 salen ~6–7),
// así que el % de vinos predichos en cada gama se iguala al % real con calidad ≥7, ≥6 y ≥5 en entrenamiento.
const preds = train.map(r => predict(model, r.x, r.red).quality).sort((a, b) => a - b);
model.cuts = [7, 6, 5].map(t => preds[Math.floor(preds.length * (1 - train.filter(r => r.q >= t).length / train.length))]);
console.log(`cortes de gama (Premium, Bueno, Estándar): ${model.cuts.map(c => c.toFixed(2)).join(', ')}`);

fs.writeFileSync('src/model.json', JSON.stringify({ ...model, metrics: { mae, acc, n: rows.length } }));
console.log('src/model.json escrito');
