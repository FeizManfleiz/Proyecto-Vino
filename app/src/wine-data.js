// Datos compartidos por la landing (demo) y el dashboard
export const LABELS = {
  'fixed acidity': 'Acidez fija (g/L)', 'volatile acidity': 'Acidez volátil (g/L)', 'citric acid': 'Ácido cítrico (g/L)',
  'residual sugar': 'Azúcar residual (g/L)', chlorides: 'Cloruros (g/L)', 'free sulfur dioxide': 'SO₂ libre (mg/L)',
  'total sulfur dioxide': 'SO₂ total (mg/L)', density: 'Densidad (g/cm³)', pH: 'pH', sulphates: 'Sulfatos (g/L)', alcohol: 'Alcohol (% vol)',
};

// Ejemplos reales del dataset, en el orden de model.features
export const PRESETS = {
  Tinto: [7.4, 0.7, 0, 1.9, 0.076, 11, 34, 0.9978, 3.51, 0.56, 9.4],
  Blanco: [7, 0.27, 0.36, 20.7, 0.045, 45, 170, 1.001, 3, 0.45, 8.8],
  'Tinto premium': [7.3, 0.65, 0, 1.2, 0.065, 15, 21, 0.9946, 3.39, 0.47, 10],
  // No viene del dataset: estimación de un Pinot Noir Grand Cru tipo Romanée-Conti (DRC no publica análisis).
  // ~13.2% vol y pH ~3.55 de fichas de Grand Cru de Vosne; acidez 3.6 g/L H₂SO₄ ≈ 5.5 g/L tartárico; seco; SO₂ bajo.
  'Romanée-Conti (estimado)': [5.5, 0.5, 0.2, 1.5, 0.06, 15, 50, 0.9945, 3.55, 0.65, 13.2],
};

export const shortLabel = f => LABELS[f].replace(/ \(.*\)/, '');
export const unit = f => LABELS[f].match(/\((.*)\)/)?.[1] || '';

// Mínimo y máximo de cada medición en los 6,497 vinos de wine.csv: lo que el modelo conoce.
// check.js verifica que coincidan con el CSV.
export const RANGES = {
  'fixed acidity': [3.8, 15.9], 'volatile acidity': [0.08, 1.58], 'citric acid': [0, 1.66], 'residual sugar': [0.6, 65.8],
  chlorides: [0.009, 0.611], 'free sulfur dioxide': [1, 289], 'total sulfur dioxide': [6, 440], density: [0.98711, 1.03898],
  pH: [2.72, 4.01], sulphates: [0.22, 2], alcohol: [8, 14.9],
};

// Texto corto si `v` está fuera de lo que conoce el modelo; null si está dentro
export function rangeIssue(f, v) {
  const [lo, hi] = RANGES[f];
  return v < lo || v > hi ? `Fuera de rango: ${lo} a ${hi}` : null;
}

// Problema de un campo del análisis tal como se escribió, o null.
// bad: impide calcular (mismas reglas que analysis.js); si no, sólo avisa que está fuera de rango.
export function fieldIssue(f, raw) {
  const t = String(raw).trim();
  if (t === '') return { bad: true, empty: true, text: 'Falta este valor' };
  const v = Number(t.replace(',', '.'));
  if (!Number.isFinite(v)) return { bad: true, text: 'Escribe un número (punto o coma)' };
  if (v < 0) return { bad: true, text: 'No puede ser negativo' };
  const text = rangeIssue(f, v);
  return text ? { bad: false, text } : null;
}
