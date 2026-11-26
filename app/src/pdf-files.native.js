// PDFs en el celular (iOS y Android; la web usa pdf-files.js, que no hace nada).
// - Fuentes de la marca dentro del PDF: Oswald y Montserrat en base64, desde los mismos archivos que ya carga la app.
//   Así el PDF se genera sin internet (en la bodega hay poca señal) y no espera a Google Fonts.
// - Nombre legible: el archivo que crea expo-print tiene un nombre aleatorio; se mueve a uno como
//   "Guía cómo mejorar tu vino.pdf" antes de compartirlo.
import { Montserrat_400Regular, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat';
import { Oswald_500Medium, Oswald_700Bold } from '@expo-google-fonts/oswald';
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';

const FACES = [
  ['Oswald', 500, Oswald_500Medium],
  ['Oswald', 700, Oswald_700Bold],
  ['Montserrat', 400, Montserrat_400Regular],
  ['Montserrat', 600, Montserrat_600SemiBold],
];

// Los @font-face se arman una vez por sesión (unos 1.1 MB). Si algo falla resuelve '' y el PDF sale con las fuentes
// del sistema; el siguiente PDF lo vuelve a intentar.
let fonts = null;
export function pdfFonts() {
  fonts ??= Promise.all(FACES.map(async ([family, weight, mod]) => {
    const asset = Asset.fromModule(mod);
    await asset.downloadAsync();
    const data = await new File(asset.localUri).base64();
    return `@font-face{font-family:${family};font-weight:${weight};font-style:normal;src:url(data:font/ttf;base64,${data}) format('truetype')}`;
  }))
    .then(faces => faces.join('\n'))
    .catch(() => { fonts = null; return ''; });
  return fonts;
}

// Mueve el PDF a la caché con `name` (reemplaza uno anterior con el mismo nombre). Si no se puede, se comparte con el
// nombre original: nunca impide compartir.
export async function namedPdf(uri, name) {
  try {
    const dest = new File(Paths.cache, name);
    await new File(uri).move(dest, { overwrite: true });
    return dest.uri;
  } catch {
    return uri;
  }
}
