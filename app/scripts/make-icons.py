# Genera el ícono, el ícono adaptativo de Android, el favicon y el splash desde el logo vectorial (src/brand/logo-svg.js).
# Uso: python scripts/make-icons.py   (requiere: pip install pymupdf pillow)
# Ícono: centro de la vid (hojas + racimo) en arena sobre tinta, con los extremos desvanecidos. Splash: logo completo.
import io, json, re
import pymupdf
from PIL import Image

INK, SAND, WHITE = '#20151d', '#d3be91', '#ffffff'

src = open('src/brand/logo-svg.js', encoding='utf8').read()
SVG = json.loads(src[src.index('export default ') + len('export default '):].strip().rstrip(';'))


def render(colors, height=2400):
    """Dibuja el logo con los colores dados ('none' oculta una parte) y recorta al contenido."""
    svg = re.sub(r'\{\{(\w+)\}\}', lambda m: colors[m.group(1)], SVG)
    svg = svg.replace('viewBox="385 245 710 365"', 'width="710" height="365" viewBox="385 245 710 365"', 1)
    page = pymupdf.open(stream=svg.encode(), filetype='svg')[0]
    zoom = height / page.rect.height
    img = Image.open(io.BytesIO(page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=True).tobytes('png'))).convert('RGBA')
    return img.crop(img.getbbox())


def vine_mark(color):
    """Centro de la vid (la vid completa es 3.6:1, demasiado ancha para un ícono) con desvanecido lateral."""
    vine = render({'VINE': color, 'TITLE': 'none', 'SCRIPT': 'none'})
    w, h = vine.size
    mark = vine.crop((int(w * 0.33), 0, int(w * 0.67), h))
    mark = mark.crop(mark.getbbox())
    alpha = mark.getchannel('A')
    px, mw, fade = alpha.load(), mark.width, int(mark.width * 0.22)
    for x in range(mw):
        k = min(1, x / fade, (mw - 1 - x) / fade)
        if k < 1:
            for y in range(mark.height):
                px[x, y] = int(px[x, y] * k)
    mark.putalpha(alpha)
    return mark


def place(mark, size, frac, bg=None, height=None):
    """Centra la marca en un lienzo cuadrado (o de alto `height`) ocupando `frac` del ancho."""
    canvas = Image.new('RGBA', (size, height or size), bg or (0, 0, 0, 0))
    m = mark.copy()
    m.thumbnail((int(size * frac), int(size * frac)), Image.LANCZOS)
    canvas.alpha_composite(m, ((canvas.width - m.width) // 2, (canvas.height - m.height) // 2))
    return canvas


sand = vine_mark(SAND)
place(sand, 1024, 0.72, INK).convert('RGB').save('assets/icon.png')
place(sand, 48, 0.88, INK).convert('RGB').save('assets/favicon.png')
# Adaptativo: el sistema recorta a un círculo de ~61% del lienzo; la marca queda dentro
place(sand, 512, 0.52).save('assets/android-icon-foreground.png')
place(vine_mark(WHITE), 432, 0.52).save('assets/android-icon-monochrome.png')
# Splash: Android 12+ enmascara el ícono a un círculo de 2/3 del lienzo; el logo a 64% de ancho cabe completo
full = render({'VINE': SAND, 'TITLE': WHITE, 'SCRIPT': SAND})
place(full, 1024, 0.64).save('assets/splash-icon.png')
print('ok')
