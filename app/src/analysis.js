// Lógica del análisis, compartida por el dashboard web (Predictor.js) y la pestaña Analizar del celular
import { useMemo, useState } from 'react';
import model from './model.json';
import { improve, percentile, predict } from './model-core';
import { PRESETS } from './wine-data';

const parse = values => values.map(v => Number(String(v).replace(',', '.')));
const badFields = (values, x) => x.map((v, i) => !Number.isFinite(v) || v < 0 || String(values[i]).trim() === '');

export function useAnalysis() {
  const [values, setValues] = useState(() => PRESETS.Tinto.map(String));
  const [preset, setPreset] = useState('Tinto');
  const [type, setType] = useState(undefined);
  const [sim, setSim] = useState(() => new Set()); // recomendaciones activadas en el simulador

  // Todo se calcula en vivo mientras se escribe
  const live = useMemo(() => {
    const x = parse(values);
    const bad = badFields(values, x);
    if (bad.some(Boolean)) return { bad, recs: [] };
    const r = predict(model, x, type);
    return { bad, x, r, recs: improve(model, x, r.isRed), pct: percentile(model, r.quality, r.isRed) };
  }, [values, type]);
  const { r, recs, x } = live;

  // Simulador: aplica las metas de las recomendaciones elegidas y vuelve a predecir
  const simulated = useMemo(() => {
    const chosen = recs.filter(k => sim.has(k.feature));
    if (!r || !chosen.length) return null;
    const xs = [...x];
    chosen.forEach(k => (xs[model.features.indexOf(k.feature)] = k.target));
    return { xs, r: predict(model, xs, r.isRed) };
  }, [recs, sim, r, x]);

  const setField = (i, t) => { setPreset(null); setValues(vs => vs.map((v, j) => (j === i ? t : v))); };
  const loadValues = (vals, name = null) => { setPreset(name); setValues(vals.map(v => String(+v))); setSim(new Set()); };
  const toggleSim = f => setSim(s => { const n = new Set(s); n.has(f) ? n.delete(f) : n.add(f); return n; });
  const clearSim = () => setSim(new Set());
  // Sólo se redondean las metas aplicadas (3 cifras significativas: 11.5, 0.413); los valores del usuario quedan intactos
  const applySim = () => {
    const applied = new Set(recs.filter(k => sim.has(k.feature)).map(k => model.features.indexOf(k.feature)));
    loadValues(simulated.xs.map((v, i) => (applied.has(i) ? +v.toPrecision(3) : v)));
  };

  return { values, preset, type, setType, sim, live, simulated, setField, loadValues, toggleSim, clearSim, applySim };
}

// "Guardar en Mis vinos": nombre opcional y año de cosecha validado
export function useSaveWine({ live, history, save }) {
  const [wineName, setWineName] = useState('');
  const [vintage, setVintage] = useState('');
  const [saveMsg, setSaveMsg] = useState(null); // { ok: boolean, text }
  const { r, x } = live;

  const onSave = async () => {
    if (!r) return setSaveMsg({ ok: false, text: 'No se puede guardar: corrige los valores marcados en rojo del análisis.' });
    const year = vintage.trim();
    const maxYear = new Date().getFullYear();
    if (year && !(/^\d{4}$/.test(year) && +year >= 1900 && +year <= maxYear)) {
      return setSaveMsg({ ok: false, text: `El año de cosecha debe tener 4 dígitos, entre 1900 y ${maxYear}.` });
    }
    const name = wineName.trim() || `${r.isRed ? 'Tinto' : 'Blanco'} #${history.length + 1}`;
    try {
      await save({ name, vintage: year || null, values: x, quality: r.quality, tier: r.tier.name, isRed: r.isRed });
      setSaveMsg({ ok: true, text: `Guardado en Mis vinos: ${name}${year ? ` · ${year}` : ''} (${r.quality.toFixed(1)}/10)` });
      setWineName(''); setVintage('');
    } catch {
      setSaveMsg({ ok: false, text: 'No se pudo guardar en este dispositivo. Intenta de nuevo.' });
    }
  };
  const onNameChange = t => { setWineName(t); setSaveMsg(null); };
  const onVintageChange = t => { setVintage(t.replace(/\D/g, '')); setSaveMsg(null); };

  return { wineName, vintage, saveMsg, onNameChange, onVintageChange, onSave };
}
