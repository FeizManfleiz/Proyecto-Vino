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
console.log('OK', red.quality.toFixed(2), white.quality.toFixed(2));
