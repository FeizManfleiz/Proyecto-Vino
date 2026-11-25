// Velo de las fotos de encabezado del celular (PhotoHeader en components.js). Sin React Native: check.js también
// lo prueba, y la revisión de contraste usa exactamente estas paradas.
//
// Paradas [posición 0–1, opacidad del color de fondo]. Entre dos paradas la opacidad sigue una curva suave
// (smoothstep): la pendiente es cero en cada parada, así no hay quiebres que el ojo lea como una raya o un corte
// (bandas de Mach), por ejemplo donde la foto empieza sobre el fondo liso.
//
// Criterio: cada texto chico (hora, logo, saludo, párrafo, chips) tiene contraste ≥ 4.5:1 sobre el píxel MÁS
// CLARO de la foto bajo él, y los títulos ≥ 3:1. Revisado en iPhone (375–430 pt, 3×, isla y muesca) y Android
// (360–412 dp, 2.6×–3.5×).

// v: de arriba abajo (barra de estado y logo arriba, texto abajo) · h: de izquierda a derecha (el texto va alineado
// a la izquierda) · radial: del centro a las esquinas (logo centrado).
export const VEIL = {
  tab: {
    v: [[0, 0.78], [0.25, 0.55], [0.5, 0.42], [0.8, 0.72], [1, 1]],
    h: [[0, 0.8], [0.45, 0.5], [0.9, 0]],
  },
  // Vista aérea: tierra clara en toda la foto y el texto la cubre de arriba abajo
  aerial: {
    v: [[0, 0.84], [0.25, 0.66], [0.5, 0.56], [0.8, 0.78], [1, 1]],
    h: [[0, 0.84], [0.5, 0.64], [1, 0.15]],
  },
  logo: {
    v: [[0, 0.72], [0.3, 0.5], [0.7, 0.5], [1, 0.88]],
    radial: [[0, 0.9], [0.5, 0.74], [1, 0.25]],
  },
};

// Foto más angosta que la pantalla: su borde izquierdo nace del color liso y se abre poco a poco
const EDGE = [[0, 1], [0.55, 0]];
const STEPS = 10; // paradas intermedias por tramo: el mayor salto entre vecinas queda ≤ 0.15

export function smooth(stops) {
  const out = [stops[0]];
  for (let i = 1; i < stops.length; i++) {
    const [p0, a0] = stops[i - 1];
    const [p1, a1] = stops[i];
    for (let k = 1; k <= STEPS; k++) {
      const t = k / STEPS;
      const s = t * t * (3 - 2 * t);
      out.push([p0 + (p1 - p0) * t, a0 + (a1 - a0) * s]);
    }
  }
  return out;
}

// Capas del velo para la foto visible. clipped: la foto es más alta que el encabezado y se recorta;
// narrow: es más angosta que la pantalla y va a la derecha.
export function veilLayers(veil, { clipped, narrow }) {
  // Si la foto termina antes que el encabezado, su borde de abajo acaba en el color liso
  const v = clipped ? veil.v : veil.v.map(([p, a], i) => [p, i === veil.v.length - 1 ? 1 : a]);
  const layers = [{ type: 'linear', dir: 'to bottom', stops: smooth(v) }];
  if (narrow) layers.push({ type: 'linear', dir: 'to right', stops: smooth(EDGE) });
  if (veil.h) layers.push({ type: 'linear', dir: 'to right', stops: smooth(veil.h) });
  if (veil.radial) layers.push({ type: 'radial', stops: smooth(veil.radial) });
  return layers;
}

const rgba = (hex, a) =>
  `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${+a.toFixed(3)})`;

// Valor de `backgroundImage` (gradientes CSS de React Native)
export function veilCss(color, layers) {
  return layers.map(({ type, dir, stops }) => {
    const list = stops.map(([p, a]) => `${rgba(color, a)} ${+(p * 100).toFixed(2)}%`).join(', ');
    return type === 'radial' ? `radial-gradient(ellipse at center, ${list})` : `linear-gradient(${dir}, ${list})`;
  }).join(', ');
}
