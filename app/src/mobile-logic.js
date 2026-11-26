// Lógica de las pantallas del celular sin React Native: check.js también la prueba con node.

// Mis vinos en el orden elegido, sin cambiar la lista original.
// 'date': el guardado más reciente primero. 'quality': la calificación más alta primero y, si empatan, el más reciente.
export function sortWines(list, by) {
  const time = w => Date.parse(w.date) || 0;
  const newest = (a, b) => time(b) - time(a);
  return [...list].sort(by === 'quality' ? (a, b) => b.quality - a.quality || newest(a, b) : newest);
}

// Nombre del PDF al compartirlo: el título sin los caracteres que Windows, Android o iOS no aceptan en un nombre de
// archivo (\ / : * ? " < > |), conservando los acentos. Con `date` (el reporte) se agrega el día: "… 2026-11-25.pdf".
export function pdfFileName(title, date) {
  const clean = String(title).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Documento';
  if (!date) return `${clean}.pdf`;
  const two = n => String(n).padStart(2, '0');
  return `${clean} ${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}.pdf`;
}
