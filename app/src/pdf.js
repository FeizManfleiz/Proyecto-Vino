import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import LOGO from './brand/logo-svg';
import { LOGO_COLORS } from './components';
import { notify } from './dialogs';

// Mismo logo que en la app (fondo oscuro en el encabezado). Como <img> data-URI: un <svg> en línea con <use> sólo se dibuja en la primera página impresa
const logo = `<img alt="Los Tres García Vineyard" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  LOGO.replace(/\{\{(\w+)\}\}/g, (_, k) => LOGO_COLORS[k]))}">`;

// Colores y tipografías del BrandBook. El encabezado con logo es position:fixed → se repite en cada página impresa.
const wrap = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Montserrat:wght@400;600&display=swap" rel="stylesheet">
<style>@page{margin:0}
body{font-family:Montserrat,Helvetica,Arial,sans-serif;color:#20151d;line-height:1.55;margin:0}
header{position:fixed;top:0;left:0;right:0;height:92px;display:flex;align-items:center;justify-content:space-between;
  padding:0 40px;border-bottom:3px solid #d3be91;background:#20151d;-webkit-print-color-adjust:exact;print-color-adjust:exact}
header img{height:72px;width:auto}
header span{font-family:Oswald,Impact,sans-serif;letter-spacing:2px;color:#d3be91;font-size:12px}
footer{-webkit-print-color-adjust:exact;print-color-adjust:exact}
footer{position:fixed;bottom:0;left:0;right:0;height:36px;background:#5e192c;color:#d3be91;font-size:10px;
  display:flex;align-items:center;justify-content:center;letter-spacing:1px}
table.page{width:100%;border:0}table.page td{border:0;padding:0}
.top{height:116px}.bottom{height:56px}main{padding:0 40px}
h1,h2{font-family:Oswald,Impact,sans-serif;font-weight:700}
h1{color:#20151d;border-bottom:4px solid #bec7a8;padding-bottom:8px}h2{color:#5e192c;margin-top:24px;page-break-after:avoid}
table.t{border-collapse:collapse;width:100%}table.t td,table.t th{border:1px solid #e4ddd2;padding:6px 8px;text-align:left;vertical-align:top}
table.t th{background:#bec7a8;color:#20151d}tr{page-break-inside:avoid}
.big{font-family:Oswald,Impact,sans-serif;font-size:48px;font-weight:700;color:#5e192c;margin:0}
.rec{border-left:4px solid #d3be91;background:#f7f4ee;padding:10px 14px;margin:10px 0;page-break-inside:avoid}
.rec b{color:#5e192c}small{color:#5c4b53}</style>
</head><body>
<header>${logo}<span>${esc(title).toUpperCase()}</span></header>
<footer>LOS TRES GARCÍA · VINEYARD</footer>
<table class="page"><thead><tr><td class="top"></td></tr></thead><tfoot><tr><td class="bottom"></td></tr></tfoot>
<tbody><tr><td><main>${body}</main></td></tr></tbody></table>
</body></html>`;

// Android: genera el archivo y abre el menú para guardarlo/compartirlo. Web: diálogo de impresión → "Guardar como PDF".
export async function savePdf(title, body) {
  const html = wrap(title, body);
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (!w) throw new Error('El navegador bloqueó la ventana emergente; permítela para descargar el PDF.');
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: title });
}

// [título que se está generando, descargar(título, cuerpo)]; los errores se avisan con un diálogo
export function usePdf() {
  const [busy, setBusy] = useState('');
  const download = useCallback(async (title, body) => {
    setBusy(title);
    try { await savePdf(title, body); } catch (e) { notify(e.message); } finally { setBusy(''); }
  }, []);
  return [busy, download];
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const fmt = v => v.toFixed(Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : Math.abs(v) >= 1 ? 2 : 3);

const recsHtml = (recs, labels) => (recs.length
  ? recs.map(r => `<div class="rec"><b>${r.direction}: ${labels[r.feature]}</b>
 · actual ${fmt(r.current)} → meta ${fmt(r.target)} · <b>+${r.gain.toFixed(2)} pts</b> estimados
<ul>${r.steps.map(s => `<li>${s}</li>`).join('')}</ul></div>`).join('')
  : '<p>El vino ya está cerca del perfil de los vinos de calidad alta; no hay ajustes prioritarios.</p>');

export function reportBody(model, labels, values, r, recs) {
  const rows = model.features.map((f, i) => `<tr><td>${labels[f]}</td><td>${esc(values[i])}</td></tr>`).join('');
  return `<h1>Reporte de predicción</h1><small>${new Date().toLocaleString()}</small>
<h2>Resultado</h2><p class="big">${r.quality.toFixed(1)} / 10</p>
<p><b>Gama:</b> ${r.tier.name} — ${r.tier.desc}</p>
<p><b>Tipo:</b> ${r.isRed ? 'Tinto' : 'Blanco'} (probabilidad de tinto ${(r.pRed * 100).toFixed(0)}%)</p>
<h2>Perfil de sabor</h2><table class="t">
<tr><th>Dulzor</th><td>${r.flavor.dulzor}</td></tr><tr><th>Acidez</th><td>${r.flavor.acidez}</td></tr>
<tr><th>Cuerpo</th><td>${r.flavor.cuerpo}</td></tr><tr><th>Notas</th><td>${r.flavor.notes.join(', ') || '—'}</td></tr>
<tr><th>Maridaje</th><td>${r.flavor.pairing}</td></tr></table>
<h2>Cómo mejorar este vino</h2>
<p>Comparado con el promedio de los vinos ${r.isRed ? 'tintos' : 'blancos'} con calidad ≥ 7 del dataset. Las ganancias son estimaciones
del modelo si sólo cambiara esa variable; en la práctica las variables se influyen entre sí.</p>
${recsHtml(recs, labels)}
<h2>Datos ingresados</h2><table class="t">${rows}</table>
<p><small>Modelo de regresión lineal entrenado con ${model.metrics.n} vinos (error medio ±${model.metrics.mae.toFixed(2)} puntos).
El perfil de sabor se deduce por reglas enológicas, no por cata.</small></p>`;
}

// Tabla de referencia generada desde model.json para que no se desactualice al reentrenar
const refTable = (model, labels) => {
  const keys = ['alcohol', 'volatile acidity', 'sulphates', 'pH', 'chlorides', 'total sulfur dioxide'];
  return `<table class="t"><tr><th>Variable</th><th>Tintos</th><th>Blancos</th></tr>${keys.map(k => {
    const j = model.features.indexOf(k);
    return `<tr><td>${labels[k]}</td><td>${fmt(model.targets.red[j])}</td><td>${fmt(model.targets.white[j])}</td></tr>`;
  }).join('')}</table>`;
};

export const guides = (model, labels) => [
  {
    title: 'Guía: cómo mejorar tu vino',
    body: `<h1>Guía para el productor: cómo mejorar la calidad</h1>
<p>Según el modelo entrenado con ${model.metrics.n.toLocaleString('es-MX')} vinos, lo que más se asocia con una calificación alta es
<b>más alcohol</b> (uva más madura), <b>menos acidez volátil</b> y <b>más sulfatos</b>. Esta guía recorre el proceso completo, del viñedo a la botella.</p>

<h2>1. Viñedo</h2><table class="t"><tr><th>Práctica</th><th>Qué mejora</th></tr>
<tr><td>Limitar el rendimiento por hectárea (aclareo de racimos)</td><td>Concentración, madurez y grado alcohólico</td></tr>
<tr><td>Manejo de canopia: deshojado y poda en verde</td><td>Exposición solar, sanidad y madurez</td></tr>
<tr><td>Riego deficitario controlado</td><td>Bayas más pequeñas y concentradas</td></tr>
<tr><td>Agua de riego de baja salinidad</td><td>Menos cloruros (sabor salado)</td></tr>
<tr><td>Fertilización equilibrada, sin exceso de potasio</td><td>pH más bajo y mejor acidez</td></tr>
<tr><td>Control preventivo de hongos (botrytis, oídio)</td><td>Uva sana: menos acidez volátil</td></tr></table>

<h2>2. Cosecha</h2><ul>
<li>Decidir la fecha midiendo °Brix, acidez total y pH, y probando la uva: buscar el equilibrio entre madurez y acidez.</li>
<li>Cosechar en horas frescas y llevar la uva rápido a la bodega en cajas pequeñas.</li>
<li>Seleccionar racimos y bayas en mesa: descartar uva podrida o dañada.</li></ul>

<h2>3. Vinificación</h2><table class="t"><tr><th>Paso</th><th>Buena práctica</th></tr>
<tr><td>Recepción</td><td>Proteger el mosto con SO₂ libre ajustado al pH</td></tr>
<tr><td>Corrección</td><td>Acidificar con ácido tartárico si el pH es alto (&gt; 3.6 en tintos, &gt; 3.4 en blancos)</td></tr>
<tr><td>Fermentación</td><td>Levaduras seleccionadas, nutrientes y temperatura controlada (tintos 24–28 °C, blancos 14–18 °C)</td></tr>
<tr><td>Maloláctica</td><td>Hacerla en tintos para suavizar; evitarla en blancos frescos</td></tr>
<tr><td>Higiene</td><td>Limpiar y desinfectar equipos, depósitos y mangueras: la primera defensa contra la acidez volátil</td></tr></table>

<h2>4. Crianza en barrica</h2><ul>
<li>Barricas de roble en buen estado, limpias y siempre llenas (rellenos frecuentes) para evitar oxidación y bacterias acéticas.</li>
<li>Trasiegos con gas inerte; controlar SO₂ libre cada 2–4 semanas.</li>
<li>Análisis periódicos de acidez volátil: actuar antes de que supere 0.6 g/L.</li></ul>

<h2>5. Embotellado</h2><ul>
<li>Estabilización tartárica y proteica, y filtración adecuada al estilo.</li>
<li>Ajuste final de SO₂ y sulfatos dentro de los límites legales.</li>
<li>Embotellar con mínima exposición al oxígeno y guardar en un lugar fresco y oscuro.</li></ul>

<h2>Valores de referencia</h2>
<p>Promedio de los vinos con calidad ≥ 7 del dataset:</p>
${refTable(model, labels)}
<p><small>Cada predicción en la app incluye recomendaciones específicas para ese vino.</small></p>`,
  },
  {
    title: 'Guía: química del vino',
    body: `<h1>Química del vino</h1>
<p>Las 11 variables que usa el modelo y qué dicen del vino:</p><table class="t">
<tr><th>Variable</th><th>Qué es</th><th>Efecto en sabor/calidad</th></tr>
<tr><td>Acidez fija</td><td>Ácidos tartárico y málico (g/L)</td><td>Da frescura y estructura</td></tr>
<tr><td>Acidez volátil</td><td>Ácido acético (g/L)</td><td>En exceso sabe a vinagre; baja la calidad</td></tr>
<tr><td>Ácido cítrico</td><td>g/L</td><td>Aporta frescura y notas cítricas</td></tr>
<tr><td>Azúcar residual</td><td>Azúcar sin fermentar (g/L)</td><td>&lt;4 seco, 4–12 semiseco, 12–45 semidulce, &gt;45 dulce</td></tr>
<tr><td>Cloruros</td><td>Sal (g/L)</td><td>Valores altos dan sabor salado</td></tr>
<tr><td>SO₂ libre / total</td><td>Sulfitos (mg/L)</td><td>Conservan el vino; en exceso dan aroma punzante</td></tr>
<tr><td>Densidad</td><td>g/cm³</td><td>Depende de azúcar y alcohol</td></tr>
<tr><td>pH</td><td>Acidez real</td><td>Menor pH = más ácido; típico 2.9–3.8</td></tr>
<tr><td>Sulfatos</td><td>Sulfato de potasio (g/L)</td><td>Ayudan a conservar; asociados a mayor calidad</td></tr>
<tr><td>Alcohol</td><td>% vol</td><td>La variable más ligada a la calidad; da cuerpo</td></tr></table>`,
  },
  {
    title: 'Guía: cata y maridaje',
    body: `<h1>Cata y maridaje</h1>
<h2>Cómo catar</h2><ol><li><b>Vista:</b> color e intensidad; los tintos se aclaran con la edad, los blancos se oscurecen.</li>
<li><b>Nariz:</b> aromas primarios (fruta), secundarios (fermentación) y terciarios (barrica, crianza).</li>
<li><b>Boca:</b> dulzor, acidez, taninos, cuerpo y persistencia.</li></ol>
<h2>Maridaje básico</h2><table class="t"><tr><th>Vino</th><th>Combina con</th></tr>
<tr><td>Tinto robusto</td><td>Carnes rojas, parrilla, quesos curados</td></tr>
<tr><td>Tinto ligero</td><td>Pastas, aves, embutidos</td></tr>
<tr><td>Blanco seco</td><td>Pescados, mariscos, ensaladas</td></tr>
<tr><td>Blanco dulce</td><td>Postres, quesos azules, comida picante</td></tr></table>
<h2>Temperatura de servicio</h2><p>Tintos 15–18 °C · Blancos 8–12 °C · Espumosos 6–8 °C</p>`,
  },
];

