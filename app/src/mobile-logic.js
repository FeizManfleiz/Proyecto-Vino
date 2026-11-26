// Lógica de las pantallas del celular sin React Native: check.js también la prueba con node.

// Mis vinos en el orden elegido, sin cambiar la lista original.
// 'date': el guardado más reciente primero. 'quality': la calificación más alta primero y, si empatan, el más reciente.
export function sortWines(list, by) {
  const time = w => Date.parse(w.date) || 0;
  const newest = (a, b) => time(b) - time(a);
  return [...list].sort(by === 'quality' ? (a, b) => b.quality - a.quality || newest(a, b) : newest);
}
