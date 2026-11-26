// Autoverificación rápida: node check.js
const assert = require('assert');
const model = require('./src/model.json');
const { predict } = require('./src/model-core');

const red = predict(model, [7.4, 0.7, 0, 1.9, 0.076, 11, 34, 0.9978, 3.51, 0.56, 9.4]);
const white = predict(model, [7, 0.27, 0.36, 20.7, 0.045, 45, 170, 1.001, 3, 0.45, 8.8]);
assert.strictEqual(red.isRed, 1);
assert.strictEqual(white.isRed, 0);
assert.ok(red.quality > 4 && red.quality < 6.5, `tinto real calidad 5, predijo ${red.quality}`);
assert.strictEqual(white.flavor.dulzor, 'Semidulce'); // 20.7 g/L
assert.strictEqual(red.flavor.dulzor, 'Seco');
assert.ok(predict(model, Array(11).fill(1e6)).quality <= 10, 'la calidad se acota a 0–10');
const { improve } = require('./src/model-core');
const recs = improve(model, [7.4, 0.7, 0, 1.9, 0.076, 11, 34, 0.9978, 3.51, 0.56, 9.4], 1);
assert.ok(recs.length > 0 && recs.every(r => r.gain > 0), 'un tinto de calidad 5 debe tener recomendaciones que suban la calidad');
assert.ok(recs.some(r => r.feature === 'volatile acidity' && r.direction === 'Bajar'), 'acidez volátil 0.7 es alta: debe recomendar bajarla');
assert.ok(!recs.some(r => r.feature === 'density' || r.feature === 'residual sugar'));
console.log('recs', recs.map(r => `${r.direction} ${r.feature} +${r.gain.toFixed(2)}`).join(' | '));
const { percentile } = require('./src/model-core');
assert.strictEqual(percentile(model, 0, 1), 0);
assert.strictEqual(percentile(model, 10, 0), 100);
assert.ok(percentile(model, 6.2, 1) > percentile(model, 5.2, 1));
assert.ok(model.cuts[0] > model.cuts[1] && model.cuts[1] > model.cuts[2], 'cortes de gama ordenados');
const rc = predict(model, [5.5, 0.5, 0.2, 1.5, 0.06, 15, 50, 0.9945, 3.55, 0.65, 13.2]); // = PRESETS['Romanée-Conti (estimado)'] = REFERENCES en train.js
assert.strictEqual(rc.isRed, 1);
assert.ok(rc.quality >= 7, `entrenado como referencia de alta gama, debe predecir ≥7: ${rc.quality}`);
assert.strictEqual(rc.tier.name, 'Premium', `Romanée-Conti estimado debe ser Premium, predijo ${rc.quality}`);

// Rangos del celular: mínimo y máximo de wine.csv, y ningún ejemplo debe salir marcado
const { PRESETS, RANGES, rangeIssue, fieldIssue } = require('./src/wine-data.js');
const [head, ...csv] = require('fs').readFileSync(`${__dirname}/wine.csv`, 'utf8').trim().split(/\r?\n/);
const cols = head.split(',');
const rows = csv.map(l => l.split(',')).map(v => model.features.map(f => +v[cols.indexOf(f)])).filter(x => x.every(Number.isFinite));
model.features.forEach((f, j) => {
  const col = rows.map(x => x[j]);
  assert.deepStrictEqual(RANGES[f], [Math.min(...col), Math.max(...col)], `RANGES['${f}'] debe ser el mín–máx de wine.csv`);
});
Object.entries(PRESETS).forEach(([name, xs]) => xs.forEach((v, i) => assert.strictEqual(rangeIssue(model.features[i], v), null, `${name}: ${model.features[i]} = ${v} sale fuera de rango`)));
assert.ok(rangeIssue('pH', 35) && rangeIssue('alcohol', 0), 'pH 35 y alcohol 0 deben marcarse');
assert.strictEqual(fieldIssue('pH', '3,51'), null, 'la coma decimal es válida');
assert.ok(fieldIssue('pH', ' ').bad && fieldIssue('pH', 'abc').bad && fieldIssue('pH', '-1').bad, 'vacío, texto y negativo impiden calcular');
assert.strictEqual(fieldIssue('pH', '35').bad, false, 'fuera de rango sólo avisa');

// Velo de las fotos del celular: opacidades válidas, sin cortes duros y fundido al color liso
const { VEIL, veilLayers } = require('./src/photo-veil.js');
Object.entries(VEIL).forEach(([name, veil]) => [false, true].forEach(clipped => [false, true].forEach(narrow => {
  const layers = veilLayers(veil, { clipped, narrow });
  layers.forEach(({ stops }) => stops.forEach(([p, a], i) => {
    assert.ok(a >= 0 && a <= 1 && p >= 0 && p <= 1, `${name}: parada fuera de 0–1`);
    if (i) assert.ok(p >= stops[i - 1][0], `${name}: paradas desordenadas`);
    // sin quiebres: entre paradas vecinas la opacidad cambia poco (la curva es suave)
    if (i) assert.ok(Math.abs(a - stops[i - 1][1]) <= 0.15, `${name}: salto de opacidad ${stops[i - 1][1]} → ${a}`);
  }));
  const v = layers[0].stops;
  if (!clipped) assert.strictEqual(v[v.length - 1][1], 1, `${name}: la foto debe terminar en el color liso`);
  if (narrow) {
    const edge = layers[1].stops;
    assert.ok(edge[0][1] === 1 && edge[1][1] > 0.97, `${name}: el borde izquierdo de una foto angosta debe nacer suave del color`);
  }
  // Veil (components.js) dibuja con SVG sólo estas formas: lineal hacia abajo o a la derecha, o radial
  layers.forEach(l => assert.ok(l.type === 'radial' || (l.type === 'linear' && ['to bottom', 'to right'].includes(l.dir)), `${name}: capa ${l.type} ${l.dir}`));
})));

// Mis vinos del celular: por fecha el más reciente primero; por calificación la más alta y, si empatan, el más reciente
const { sortWines } = require('./src/mobile-logic.js');
const ws = [
  { id: 'a', quality: 6, date: '2026-01-02T10:00:00.000Z' },
  { id: 'b', quality: 7.5, date: '2026-01-01T10:00:00.000Z' },
  { id: 'c', quality: 6, date: '2026-01-03T10:00:00.000Z' },
];
assert.deepStrictEqual(sortWines(ws, 'date').map(w => w.id), ['c', 'a', 'b']);
assert.deepStrictEqual(sortWines(ws, 'quality').map(w => w.id), ['b', 'c', 'a'], 'empate de calificación: el más reciente primero');
assert.deepStrictEqual(ws.map(w => w.id), ['a', 'b', 'c'], 'sortWines no cambia la lista original');
assert.deepStrictEqual(sortWines([], 'quality'), []);

// Nombre del PDF al compartir: sin caracteres prohibidos, con acentos, y la fecha sólo si se pide
const { pdfFileName } = require('./src/mobile-logic.js');
assert.strictEqual(pdfFileName('Guía: cómo mejorar tu vino'), 'Guía cómo mejorar tu vino.pdf');
assert.strictEqual(pdfFileName('Reporte de predicción', new Date(2026, 10, 5)), 'Reporte de predicción 2026-11-05.pdf');
assert.strictEqual(pdfFileName('a/b\\c*d?"e"<f>|g'), 'a b c d e f g.pdf');
assert.strictEqual(pdfFileName(' : '), 'Documento.pdf');

// Pestaña Mejorar: el nombre del vino que se está mejorando y lo que se ganaría aplicando todo
const { wineTitle, potentialGain } = require('./src/mobile-logic.js');
assert.strictEqual(wineTitle(null, false), 'Tu análisis', 'valores escritos a mano');
assert.strictEqual(wineTitle(null, true), 'Tu análisis');
assert.strictEqual(wineTitle({ kind: 'example', name: 'Tinto' }, false), 'Ejemplo «Tinto»');
assert.strictEqual(wineTitle({ kind: 'example', name: 'Tinto' }, true), 'Ejemplo «Tinto» · con cambios');
assert.strictEqual(wineTitle({ kind: 'wine', name: 'Merlot · 2021' }, false), 'Merlot · 2021');
assert.strictEqual(wineTitle({ kind: 'wine', name: 'Merlot · 2021' }, true), 'Merlot · 2021 · con cambios');
assert.strictEqual(potentialGain([]), 0);
assert.strictEqual(potentialGain([{ gain: 0.5 }, { gain: 0.25 }]), 0.75);
assert.ok(Math.abs(potentialGain(recs) - recs.reduce((s, k) => s + k.gain, 0)) < 1e-12, 'la misma suma que mostraba la tarjeta de mejoras');

console.log('OK', red.quality.toFixed(2), white.quality.toFixed(2), 'RC', rc.quality.toFixed(2), rc.tier.name, '· rangos', rows.length, 'vinos');
