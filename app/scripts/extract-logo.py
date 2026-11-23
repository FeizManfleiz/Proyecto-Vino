# Extrae el logo vectorial del BrandBook a src/brand/logo-svg.js con colores reemplazables.
# Uso: python scripts/extract-logo.py "BrandBook (1).pdf"   (requiere: pip install pymupdf)
import json, re, sys
import pymupdf

svg = pymupdf.open(sys.argv[1])[1].get_svg_image(text_as_path=True)  # página 2: logo sobre blanco
svg = re.sub(r' (data-text="[^"]*"|xmlns:inkscape="[^"]*")', '', svg)  # atributos que React no acepta
svg = (svg.replace('fill="#ffffff"', 'fill="none"')       # quita el fondo
          .replace('#546548', '{{VINE}}')                    # vid
          .replace('#20151d', '{{TITLE}}')                   # LOS TRES GARCÍA
          .replace('#5e192c', '{{SCRIPT}}')                  # Vineyard
          .replace('width="1440" height="810" viewBox="0 0 1440 810"', 'viewBox="385 245 710 365"'))
assert svg.count('{{') >= 3, 'el PDF cambió: revisar colores'
open('src/brand/logo-svg.js', 'w', encoding='utf8').write(
    '// Generado por scripts/extract-logo.py, no editar a mano.\nexport default ' + json.dumps(svg) + ';\n')
print('ok', len(svg))
