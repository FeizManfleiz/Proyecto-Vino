# Predictor de Vinos (React Native / Expo)

Una sola base de código para **Android** y **web**. Predice calidad (0–10), tipo (tinto/blanco) y perfil de sabor, y descarga PDFs (reporte + guías).

```bash
npm install
npm run web        # webapp en el navegador
npm start          # escanea el QR con Expo Go en el celular Android
npm test           # autoverificación del modelo
```

APK instalable: `npx eas-cli build -p android --profile preview` (requiere cuenta gratis de Expo).

## Pantallas
Navegación con **Expo Router**: las rutas están en `src/app/` y pintan las pantallas de `src/screens/`.

| Ruta | Web | Celular |
|---|---|---|
| `/` | Landing (`Landing.js`) sin sesión; dashboard (`Predictor.js`) con sesión | Redirige a Iniciar sesión o a Analizar |
| `/iniciar-sesion`, `/crear-cuenta` | `AuthForm.js` | `AuthForm.js` (la app abre aquí si no hay sesión) |
| `/analizar`, `/mis-vinos`, `/guias`, `/cuenta` | — (todo está en el dashboard) | Pestañas nativas (`src/app/(app)/_layout.js`) |

- Las rutas se protegen con `Stack.Protected` en `src/app/_layout.js` según la sesión (`src/session.js`). Al entrar o salir, Atrás no regresa al login.
- El dashboard web y las pestañas comparten la lógica (`src/analysis.js`), las tarjetas (`src/analysis-ui.js`) y "Mis vinos" (`src/wines.js`).
- En Android, Atrás recorre las pestañas visitadas y luego sale. Las áreas seguras las ponen `TabHeader` (arriba) y la barra de pestañas (abajo).

Diseño con el BrandBook de Los Tres García: colores en `src/theme.js`, componentes (logo, botones, campos, barra) en `src/components.js`.
El logo vectorial se extrae del PDF con `python scripts/extract-logo.py "BrandBook (1).pdf"` y se usa en una sola versión (título blanco, vid y "Vineyard" arena, siempre sobre fondo oscuro): `LOGO_COLORS` en `src/components.js`.
Ícono, ícono adaptativo, favicon y splash salen del mismo logo con `python scripts/make-icons.py` (vid arena sobre tinta `#20151d`).
Tipografías: Oswald (marca) + Montserrat (texto), vía `@expo-google-fonts`.
Fotos en `assets/img/` (Licencia Unsplash, uso libre): viñedos de Sven Wilhelm, Boudewijn Boer y Matt Benson; barricas de David Goldman; botellas de Klara Kulikova.
Landing: sin acceso a la predicción hasta registrarse; secciones que aparecen al hacer scroll
y contadores animados (`src/motion.js`, respetan "reducir movimiento"), y preguntas frecuentes.
Dashboard: predicción en vivo, percentil frente al dataset, simulador de recomendaciones ("Aplicar al formulario") y "Mis vinos" (`src/history.js`).
PDFs: el logo y el pie se repiten en cada página; incluyen la guía "Cómo mejorar tu vino" para el productor.
Cuentas: `src/auth.js` guarda los usuarios en el dispositivo (contraseña con hash SHA-256 + salt). **No es auth real**: cambiar por un backend antes de producción.

## Modelo
`train.js` lee `wine.csv` (= `wine-quality-white-and-red.csv` de la rama `DB_Vinos`, 6497 vinos) y genera `src/model.json`:
- Calidad: regresión lineal → error medio ±0.55 pts (prueba 20%).
- Tipo: regresión logística → 99.3% de acierto.
- Sabor (dulzor, acidez, cuerpo, maridaje): reglas enológicas sobre la química; el dataset no trae sabores ni precios.

Reentrenar: `npm run train` (los coeficientes de abajo cambian si cambian los datos).

## Fórmulas

### 1. Datos y partición
Cada vino tiene 11 variables químicas $x_1 \dots x_{11}$, el tipo $r$ (1 = tinto, 0 = blanco) y la calidad $q$ (0–10).
Se mezclan con semilla fija (generador de Lehmer $s_{k+1} = 16807\, s_k \bmod (2^{31}-1)$, $s_0 = 42$) y se separa
80% entrenamiento ($n = 5197$) / 20% prueba (1300).

### 2. Estandarización (z-score)
Con la media y desviación estándar **del conjunto de entrenamiento**:

$$\mu_j = \frac{1}{n}\sum_{i=1}^{n} x_{ij} \qquad \sigma_j = \sqrt{\frac{1}{n}\sum_{i=1}^{n}(x_{ij}-\mu_j)^2} \qquad z_j = \frac{x_j-\mu_j}{\sigma_j}$$

| Variable | $\mu$ | $\sigma$ |
|---|---|---|
| Acidez fija | 7.2140 | 1.2858 |
| Acidez volátil | 0.3399 | 0.1650 |
| Ácido cítrico | 0.3174 | 0.1433 |
| Azúcar residual | 5.4323 | 4.7884 |
| Cloruros | 0.0559 | 0.0338 |
| SO₂ libre | 30.6239 | 17.8602 |
| SO₂ total | 115.9128 | 56.5409 |
| Densidad | 0.9947 | 0.0030 |
| pH | 3.2207 | 0.1604 |
| Sulfatos | 0.5297 | 0.1460 |
| Alcohol | 10.4941 | 1.1946 |

### 3. Calidad: regresión lineal (ridge)
Vector de diseño $\mathbf{d} = [1, z_1, \dots, z_{11}, r]$ (13 componentes). Predicción:

$$\hat q = \mathbf{w}^\top \mathbf{d} = w_0 + \sum_{j=1}^{11} w_j z_j + w_{12}\, r \qquad \hat q_{\text{final}} = \min(10, \max(0, \hat q))$$

Los pesos se obtienen resolviendo las ecuaciones normales con regularización ridge ($\lambda = 10^{-3}$, sin penalizar el intercepto),
por eliminación de Gauss con pivoteo parcial:

$$(D^\top W D + \lambda I')\,\mathbf{w} = D^\top W \mathbf{q} \qquad I' = \operatorname{diag}(0,1,\dots,1)$$

$W$ es diagonal: peso 1 para cada vino del dataset y $w_{\text{ref}} = 50$ para la referencia de alta gama
(Romanée-Conti estimado, calidad 10; ver `REFERENCES` en `train.js` y la sección 6). La referencia solo entra a esta regresión.

| Término | Peso $w$ | Sin referencia |
|---|---|---|
| Intercepto | 5.7738 | 5.7413 |
| Acidez fija | −0.1376 | 0.1278 |
| Acidez volátil | −0.2828 | −0.2410 |
| Ácido cítrico | −0.0000 | −0.0076 |
| Azúcar residual | 0.0159 | 0.3099 |
| Cloruros | −0.0386 | −0.0174 |
| SO₂ libre | 0.0768 | 0.0810 |
| SO₂ total | −0.0601 | −0.0824 |
| Densidad | 0.1929 | −0.3277 |
| pH | −0.0219 | 0.0815 |
| Sulfatos | 0.0734 | 0.1119 |
| Alcohol | 0.5507 | 0.2557 |
| Es tinto ($r$) | 0.2988 | 0.3221 |

Como las variables están estandarizadas, el peso indica cuánto sube la calidad por cada desviación estándar.
Lo que más sube la calidad: alcohol. Lo que más la baja: acidez volátil y acidez fija.
Densidad, alcohol y azúcar están muy correlacionados, por eso la referencia cambia tanto esos pesos sin mover el error (MAE 0.554 → 0.555).

### 4. Tipo: regresión logística
Vector $\mathbf{d}' = [1, z_1, \dots, z_{11}]$:

$$P(\text{tinto}) = \sigma(\mathbf{v}^\top \mathbf{d}') = \frac{1}{1+e^{-\mathbf{v}^\top \mathbf{d}'}} \qquad \text{tipo} = \begin{cases}\text{tinto} & P > 0.5\\ \text{blanco} & \text{si no}\end{cases}$$

Entrenada con descenso de gradiente por lotes sobre la entropía cruzada, tasa $\eta = 0.5$, 500 épocas, $\mathbf{v}^{(0)} = \mathbf{0}$:

$$\mathbf{v} \leftarrow \mathbf{v} - \frac{\eta}{n}\sum_{i=1}^{n}\big(\sigma(\mathbf{v}^\top \mathbf{d}'_i) - r_i\big)\,\mathbf{d}'_i$$

| Término | Peso $v$ |
|---|---|
| Intercepto | −3.3114 |
| Acidez fija | 1.0339 |
| Acidez volátil | 1.2062 |
| Ácido cítrico | −0.3162 |
| Azúcar residual | −1.3072 |
| Cloruros | 0.8521 |
| SO₂ libre | 0.2579 |
| SO₂ total | −2.3586 |
| Densidad | 1.5646 |
| pH | 0.7740 |
| Sulfatos | 0.8282 |
| Alcohol | 0.3381 |

En la app, si el usuario elige el tipo, se usa ese $r$; en "Auto" se usa el tipo predicho.

### 5. Métricas (conjunto de prueba, $m = 1300$)

$$\text{MAE} = \frac{1}{m}\sum_{i=1}^{m}|\hat q_i - q_i| = 0.555 \qquad \text{MAE}_{\text{base}} = \frac{1}{m}\sum_{i=1}^{m}|6 - q_i| = 0.631$$

$$\text{Accuracy} = \frac{\#\{\text{tipo predicho} = \text{tipo real}\}}{m} = 99.3\%$$

`train.js` no guarda el modelo si $\text{MAE} \ge \text{MAE}_{\text{base}}$ o si accuracy $\le 95\%$.

### 6. Gama (a partir de $\hat q$)
La regresión comprime las predicciones hacia la media: los 198 vinos reales de calidad ≥8 se predicen entre ~5.9 y 7.0,
así que con cortes fijos en 7/6/5 solo 2 de ellos salían Premium. Los cortes $c_t$ se calibran por cuantiles en entrenamiento:
el % de vinos con $\hat q \ge c_t$ es igual al % con calidad real $q \ge t$ (`train.js` → `model.json → cuts`).

$$c_t = \text{cuantil}_{1-p_t}(\hat q) \qquad p_t = \frac{\#\{q_i \ge t\}}{n} \qquad t \in \{7, 6, 5\}$$

| Condición | Gama |
|---|---|
| $\hat q \ge c_7 = 6.31$ | Premium |
| $c_6 = 5.63 \le \hat q < c_7$ | Bueno |
| $c_5 = 5.00 \le \hat q < c_6$ | Estándar |
| $\hat q < c_5$ | Bajo |

Resultado en los 6497 vinos: vinos de calidad ≥8 en Premium 2 → 113; gama correcta 45.5% → 51.9% (53.1% sin la referencia).

**Ejemplo Romanée-Conti (estimado).** DRC no publica análisis de laboratorio; el preset usa valores típicos de un Pinot Noir
Grand Cru de Vosne-Romanée: alcohol 13.2%, pH 3.55, acidez total ~3.6 g/L H₂SO₄ (≈5.5 g/L tartárico), seco (1.5 g/L),
SO₂ bajo (15/50 mg/L). Se usa como referencia de alta gama en el entrenamiento (calidad 10, peso 50).
Predicción: 6.29 sin la referencia → 7.22 con ella (Premium). Peso 1 no mueve nada (6.32); peso 200 llega a 8.41 pero
empeora el MAE de prueba a 0.594.
El modelo solo ve química y se entrenó con Vinho Verde portugués: no puede medir terroir, añejamiento ni prestigio.

### 7. Perfil de sabor (reglas, no modelo entrenado)

| Atributo | Variable | Regla |
|---|---|---|
| Dulzor | Azúcar residual (g/L) | $<4$ Seco · $4$–$12$ Semiseco · $12$–$45$ Semidulce · $\ge 45$ Dulce |
| Acidez | pH | $<3.1$ Alta · $3.1$–$3.4$ Media · $\ge 3.4$ Baja |
| Cuerpo | Alcohol (% vol) | $<11$ Ligero · $11$–$12.5$ Medio · $\ge 12.5$ Robusto |

Notas que se agregan:

| Condición | Nota |
|---|---|
| Ácido cítrico $\ge 0.4$ | frescura cítrica |
| Acidez volátil $\ge 0.7$ | posibles notas avinagradas |
| SO₂ total $\ge 200$ | sulfitos altos, aroma punzante |
| Sulfatos $\ge 0.8$ | buena estructura y conservación |

### 8. Recomendaciones para el productor
Meta $t_j$ = promedio de la variable $j$ en los vinos de entrenamiento con $q \ge 7$ del mismo tipo (176 tintos, 854 blancos; guardado en `model.json → targets`).
Ganancia estimada si sólo cambiara esa variable (modelo lineal):

$$\Delta \hat q_j = w_j \cdot \frac{t_j - x_j}{\sigma_j}$$

Se muestra si $|t_j - x_j|/\sigma_j \ge 0.25$ y $\Delta \hat q_j \ge 0.03$, ordenadas de mayor a menor. Densidad y azúcar residual se excluyen
(dependen del estilo y del alcohol; moverlas solas no es realista). Cada variable trae sus acciones de proceso en `src/model-core.js → ACTIONS`.

Maridaje:

| Tipo | Condición | Sugerencia |
|---|---|---|
| Tinto | Cuerpo Robusto | carnes rojas, parrilla, quesos curados |
| Tinto | otro | pastas, aves, embutidos |
| Blanco | Dulce o Semidulce | postres, quesos azules, comida picante |
| Blanco | otro | pescados, mariscos, ensaladas |
