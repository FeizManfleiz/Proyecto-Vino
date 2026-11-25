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
assert.strictEqual(model.metrics.validation.length, 4, 'se comparan 4 modelos');
assert.ok(model.metrics.validation.every((s, i, a) => !i || a[i - 1].mse <= s.mse), 'ordenados por MSE');
assert.deepStrictEqual(red.models.map(m => m.name), model.metrics.validation.map(s => s.name));
assert.strictEqual(red.models[0].quality, red.quality, 'la app usa el de menor MSE');
assert.strictEqual(model.quality.name, model.metrics.validation[0].name, 'se guarda el de menor MAE de validación');
console.log('OK', model.quality.name, red.quality.toFixed(2), white.quality.toFixed(2));
