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
