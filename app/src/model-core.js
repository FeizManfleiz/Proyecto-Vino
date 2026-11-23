// Lógica de predicción compartida por la app (Android/web) y por train.js.

const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

// x: valores en el orden de model.features. red: 1/0, o undefined para usar el tipo predicho.
function predict(model, x, red) {
  const z = x.map((v, j) => (v - model.mean[j]) / model.std[j]);
  const pRed = 1 / (1 + Math.exp(-dot([1, ...z], model.typeWeights)));
  const isRed = red ?? (pRed > 0.5 ? 1 : 0);
  const raw = dot([1, ...z, isRed], model.qualityWeights);
  const quality = Math.min(10, Math.max(0, raw));
  return { quality, pRed, isRed, tier: tier(quality), flavor: flavor(model, x, isRed) };
}

function tier(q) {
  if (q >= 7) return { name: 'Premium', desc: 'Calidad alta, por encima de la gran mayoría del dataset.' };
  if (q >= 6) return { name: 'Bueno', desc: 'Calidad sobre el promedio.' };
  if (q >= 5) return { name: 'Estándar', desc: 'Calidad promedio, vino de consumo diario.' };
  return { name: 'Bajo', desc: 'Calidad por debajo del promedio; revisar defectos.' };
}

const level = (v, cuts, labels) => labels[cuts.filter(c => v >= c).length];

// Perfil de sabor por reglas enológicas sobre la química (no es un modelo entrenado: el dataset no trae sabores).
function flavor(model, x, isRed) {
  const g = name => x[model.features.indexOf(name)];
  const notes = [];
  const dulzor = level(g('residual sugar'), [4, 12, 45], ['Seco', 'Semiseco', 'Semidulce', 'Dulce']);
  const acidez = level(g('pH'), [3.1, 3.4], ['Alta (vibrante)', 'Media', 'Baja (suave)']);
  const cuerpo = level(g('alcohol'), [11, 12.5], ['Ligero', 'Medio', 'Robusto']);
  if (g('citric acid') >= 0.4) notes.push('frescura cítrica');
  if (g('volatile acidity') >= 0.7) notes.push('posibles notas avinagradas (acidez volátil alta)');
  if (g('total sulfur dioxide') >= 200) notes.push('sulfitos altos, aroma punzante');
  if (g('sulphates') >= 0.8) notes.push('buena estructura y conservación');
  const pairing = isRed
    ? (cuerpo === 'Robusto' ? 'carnes rojas, cortes a la parrilla, quesos curados' : 'pastas, aves, embutidos')
    : (dulzor === 'Dulce' || dulzor === 'Semidulce' ? 'postres, quesos azules, comida picante' : 'pescados, mariscos, ensaladas');
  return { dulzor, acidez, cuerpo, notes, pairing };
}

module.exports = { predict };
