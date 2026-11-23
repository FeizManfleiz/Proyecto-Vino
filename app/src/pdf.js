import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const wrap = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:Helvetica,Arial,sans-serif;color:#2b1a1f;padding:32px;line-height:1.5}
h1{color:#7b1e3a;border-bottom:3px solid #7b1e3a;padding-bottom:6px}h2{color:#7b1e3a;margin-top:24px}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:6px 8px;text-align:left}
th{background:#f6e9ec}.big{font-size:40px;font-weight:bold;color:#7b1e3a}small{color:#777}</style>
</head><body>${body}</body></html>`;

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

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function reportBody(model, labels, values, r) {
  const rows = model.features.map((f, i) => `<tr><td>${labels[f]}</td><td>${esc(values[i])}</td></tr>`).join('');
  return `<h1>Reporte de predicción</h1><small>${new Date().toLocaleString()}</small>
<h2>Resultado</h2><p class="big">${r.quality.toFixed(1)} / 10</p>
<p><b>Gama:</b> ${r.tier.name} — ${r.tier.desc}</p>
<p><b>Tipo:</b> ${r.isRed ? 'Tinto' : 'Blanco'} (probabilidad de tinto ${(r.pRed * 100).toFixed(0)}%)</p>
<h2>Perfil de sabor</h2><table>
<tr><th>Dulzor</th><td>${r.flavor.dulzor}</td></tr><tr><th>Acidez</th><td>${r.flavor.acidez}</td></tr>
<tr><th>Cuerpo</th><td>${r.flavor.cuerpo}</td></tr><tr><th>Notas</th><td>${r.flavor.notes.join(', ') || '—'}</td></tr>
<tr><th>Maridaje</th><td>${r.flavor.pairing}</td></tr></table>
<h2>Datos ingresados</h2><table>${rows}</table>
<p><small>Modelo de regresión lineal entrenado con ${model.metrics.n} vinos (error medio ±${model.metrics.mae.toFixed(2)} puntos).
El perfil de sabor se deduce por reglas enológicas, no por cata.</small></p>`;
}

export const GUIDES = [
  {
    title: 'Guía: química del vino',
    body: `<h1>Química del vino</h1>
<p>Las 11 variables que usa el modelo y qué dicen del vino:</p><table>
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
<h2>Maridaje básico</h2><table><tr><th>Vino</th><th>Combina con</th></tr>
<tr><td>Tinto robusto</td><td>Carnes rojas, parrilla, quesos curados</td></tr>
<tr><td>Tinto ligero</td><td>Pastas, aves, embutidos</td></tr>
<tr><td>Blanco seco</td><td>Pescados, mariscos, ensaladas</td></tr>
<tr><td>Blanco dulce</td><td>Postres, quesos azules, comida picante</td></tr></table>
<h2>Temperatura de servicio</h2><p>Tintos 15–18 °C · Blancos 8–12 °C · Espumosos 6–8 °C</p>`,
  },
];
