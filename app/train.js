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
for (const r of train) {
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

const model = { features: FEATURES, mean, std, qualityWeights: qw, typeWeights: tw };
const { predict } = require('./src/model-core');
const mae = test.reduce((s, r) => s + Math.abs(predict(model, r.x, r.red).quality - r.q), 0) / test.length;
const acc = test.filter(r => (predict(model, r.x).pRed > 0.5 ? 1 : 0) === r.red).length / test.length;
const base = test.reduce((s, r) => s + Math.abs(6 - r.q), 0) / test.length;
console.log(`train=${train.length} test=${test.length}`);
console.log(`calidad MAE=${mae.toFixed(3)} (siempre-6 MAE=${base.toFixed(3)})  tipo accuracy=${(acc * 100).toFixed(1)}%`);
if (!(mae < base && acc > 0.95)) throw new Error('El modelo no supera la línea base, no se guarda');

fs.writeFileSync('src/model.json', JSON.stringify({ ...model, metrics: { mae, acc, n: rows.length } }));
console.log('src/model.json escrito');
