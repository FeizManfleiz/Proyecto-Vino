// Lógica de predicción compartida por la app (Android/web) y por train.js.

const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

// x: valores en el orden de model.features. red: 1/0, o undefined para usar el tipo predicho.
function predict(model, x, red) {
  const z = x.map((v, j) => (v - model.mean[j]) / model.std[j]);
  const pRed = 1 / (1 + Math.exp(-dot([1, ...z], model.typeWeights)));
  const isRed = red ?? (pRed > 0.5 ? 1 : 0);
  const raw = dot([1, ...z, isRed], model.qualityWeights);
  const quality = Math.min(10, Math.max(0, raw));
  return { quality, pRed, isRed, tier: tier(quality, model.cuts), flavor: flavor(model, x, isRed) };
}

// cuts = [Premium, Bueno, Estándar], calibrados en train.js; [7, 6, 5] solo si el model.json es anterior.
function tier(q, [premium, bueno, estandar] = [7, 6, 5]) {
  if (q >= premium) return { name: 'Premium', desc: 'Calidad alta, por encima de la gran mayoría del dataset.' };
  if (q >= bueno) return { name: 'Bueno', desc: 'Calidad sobre el promedio.' };
  if (q >= estandar) return { name: 'Estándar', desc: 'Calidad promedio, vino de consumo diario.' };
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

// Acciones de proceso por variable (viñedo → bodega). Densidad y azúcar residual se omiten:
// dependen del estilo y del alcohol, y moverlas solas en el modelo lineal no es realista.
const ACTIONS = {
  'volatile acidity': { steps: ['Cosechar uva sana y hacer selección de racimos en mesa', 'Usar levaduras seleccionadas y controlar la temperatura de fermentación', 'Mantener depósitos y barricas llenos y limpios para evitar oxígeno y bacterias acéticas', 'Proteger con SO₂ libre adecuado desde la recepción de la uva'] },
  alcohol: { steps: ['Cosechar con mayor madurez (°Brix más alto)', 'Reducir rendimiento por hectárea con aclareo de racimos', 'Manejar la canopia para mejorar la exposición solar', 'Asegurar una fermentación completa con nutrientes para la levadura'] },
  sulphates: { steps: ['Ajustar la adición de metabisulfito potásico dentro del límite legal', 'Medir SO₂ y sulfatos antes del embotellado'] },
  'fixed acidity': { steps: ['Ajustar la fecha de cosecha (antes = más acidez)', 'Corregir con ácido tartárico en mosto si falta, o desacidificar si sobra'] },
  'citric acid': { steps: ['Ajustar con ácido cítrico permitido después de la fermentación', 'Evitar la fermentación maloláctica si se busca más frescura'] },
  pH: { steps: ['Acidificar con ácido tartárico en mosto para bajar el pH', 'Cosechar antes para conservar acidez natural', 'Evitar el exceso de potasio en la fertilización del viñedo'] },
  chlorides: { steps: ['Revisar la salinidad del agua de riego y del suelo', 'Evitar riego con agua salobre en las semanas previas a la cosecha'] },
  'free sulfur dioxide': { steps: ['Medir SO₂ libre con regularidad y dosificar en función del pH', 'Repartir las adiciones en lugar de una sola dosis grande'] },
  'total sulfur dioxide': { steps: ['Reducir las adiciones de SO₂ mejorando la higiene de la bodega', 'Usar gas inerte en trasiegos y embotellado para necesitar menos sulfitos'] },
};

// Recomendaciones para el productor: qué variable mover hacia el perfil de los vinos ≥7 y cuánto sube la calidad según el modelo.
function improve(model, x, isRed) {
  const target = model.targets[isRed ? 'red' : 'white'];
  const w = model.qualityWeights;
  return model.features
    .map((f, j) => {
      const a = ACTIONS[f];
      if (!a) return null;
      const gap = target[j] - x[j];
      const gain = (w[j + 1] * gap) / model.std[j]; // Δcalidad del modelo lineal
      if (Math.abs(gap) / model.std[j] < 0.25 || gain < 0.03) return null; // diferencia irrelevante o no mejora
      return { feature: f, current: x[j], target: target[j], gain, direction: gap > 0 ? 'Subir' : 'Bajar', steps: a.steps };
    })
    .filter(Boolean)
    .sort((a, b) => b.gain - a.gain);
}

// % de vinos del mismo tipo en el dataset con calidad real menor a la predicha
function percentile(model, quality, isRed) {
  const d = model.dist[isRed ? 'red' : 'white'];
  const total = d.reduce((a, b) => a + b, 0);
  const below = d.reduce((s, n, k) => s + (k < quality ? n : 0), 0);
  return Math.round((100 * below) / total);
}

module.exports = { predict, improve, percentile };
