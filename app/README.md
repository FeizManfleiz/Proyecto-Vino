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
`App.js` navega: Inicio (`src/screens/Landing.js`) → Sign in / Sign up (`AuthForm.js`) → Predictor (`Predictor.js`, requiere sesión).
Diseño con el BrandBook de Los Tres García: colores en `src/theme.js`, componentes (logo, botones, campos, barra) en `src/components.js`.
El logo vectorial se extrae del PDF con `python scripts/extract-logo.py "BrandBook (1).pdf"` y se usa en una sola versión (título blanco, vid y "Vineyard" arena, siempre sobre fondo oscuro): `LOGO_COLORS` en `src/components.js`.
Tipografías: Oswald (marca) + Montserrat (texto), vía `@expo-google-fonts`.
Fotos en `assets/img/` (Licencia Unsplash, uso libre): viñedos de Sven Wilhelm, Boudewijn Boer y Matt Benson; barricas de David Goldman; botellas de Klara Kulikova.
Landing: sin acceso a la predicción hasta registrarse; secciones que aparecen al hacer scroll
y contadores animados (`src/motion.js`, respetan "reducir movimiento"), y preguntas frecuentes.
Dashboard: predicción en vivo, percentil frente al dataset, simulador de recomendaciones ("Aplicar al formulario") y "Mis vinos" (`src/history.js`).
PDFs: el logo y el pie se repiten en cada página; incluyen la guía "Cómo mejorar tu vino" para el productor.
Cuentas: `src/auth.js` guarda los usuarios en el dispositivo (contraseña con hash SHA-256 + salt). **No es auth real**: cambiar por un backend antes de producción.

## Modelo
`train.js` lee `wine.csv` (= `wine-quality-white-and-red.csv` de la rama `DB_Vinos`, 6497 vinos) y genera `src/model.json`:
- Calidad: se comparan **4 modelos** por **MSE** en validación (20% del train), se reentrenan con todo el train y se usa el de menor MSE.
  `predict(...).models` devuelve la predicción de cada modelo con su MSE.

  | Modelo | MSE validación | MSE prueba | MAE prueba |
  |---|---|---|---|
  | **Random forest** (40 árboles, 4 de 12 variables por corte, hoja ≥5) | **0.433** | **0.387** | **0.465** |
  | Gradient boosting (300 árboles prof. 4, tasa 0.05) | 0.474 | 0.433 | 0.504 |
  | Ridge (lineal) | 0.544 | 0.517 | 0.554 |
  | Lasso (L1, λ elegido en {0.001…0.1} con validación interna) | 0.544 | 0.517 | 0.554 |

  Lasso no aporta: elige el λ más chico (0.001), no descarta ninguna variable y queda igual que ridge.

  Ganador: random forest. `src/model.json` pesa ~780 KB por guardar los 4 modelos.
- Tipo: regresión logística → 99.3% de acierto.
- Sabor (dulzor, acidez, cuerpo, maridaje): reglas enológicas sobre la química; el dataset no trae sabores ni precios.

Reentrenar: `npm run train` (los coeficientes de abajo cambian si cambian los datos). Después: `npm test`.

### Uso de los modelos en código
```js
const model = require('./src/model.json');
const { predict, quality } = require('./src/model-core');
const x = [7.4, 0.7, 0, 1.9, 0.076, 11, 34, 0.9978, 3.51, 0.56, 9.4]; // orden de model.features

const r = predict(model, x);      // tipo automático; predict(model, x, 1) fuerza tinto
r.quality;                        // calidad con el modelo de menor MSE (random forest)
r.models;                         // [{ name, mse, quality }] de los 4 modelos, de menor a mayor MSE

// Calidad con un modelo específico
const gb = model.qualityModels.find(m => m.name === 'Gradient boosting');
quality(model, x, r.isRed, gb);
```
Para que la app use otro modelo, cambiar `model.json → quality` por otra entrada de `qualityModels` (o quitar el candidato de `CANDIDATES` en `train.js` y reentrenar).

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

### 3. Calidad: 4 modelos y cuál se usa
Los 4 reciben las mismas 12 entradas (11 variables químicas + tipo $r$) y devuelven la calidad estimada $\hat q$, acotada a 0–10.

| Modelo | Qué hace | Ventaja | Limitación |
|---|---|---|---|
| **Ridge** | Suma ponderada de las variables estandarizadas, con una penalización L2 pequeña que evita pesos extremos. | Interpretable: cada peso dice cuánto sube la calidad por desviación estándar. | Solo capta relaciones en línea recta; no ve combinaciones (p. ej. alcohol alto *y* acidez volátil baja). |
| **Lasso** | Igual que ridge, pero la penalización es L1: puede dejar pesos en 0 y así descartar variables. | Selecciona variables automáticamente. | Mismo límite lineal que ridge. Aquí no descarta ninguna. |
| **Random forest** | 40 árboles de decisión; cada uno aprende reglas "si alcohol > 11.2 y acidez volátil ≤ 0.3 → 6.4" con una muestra al azar de vinos y de variables. La predicción es el promedio de los 40. | Capta relaciones no lineales e interacciones; promediar reduce el sobreajuste. **Es el que usa la app.** | Menos interpretable; las predicciones cambian por escalones. |
| **Gradient boosting** | 300 árboles pequeños en secuencia: cada uno corrige el error que dejaron los anteriores, sumando un 5% de su corrección. | También no lineal; suele ser muy preciso. | Más lento de entrenar (~20 s) y aquí quedó detrás de random forest. |

**Cómo se elige:** `train.js` separa el 80% del train para ajustar y el 20% para validar, calcula el MSE de cada modelo en validación
y los ordena de menor a mayor. Luego reentrena los 4 con todo el train, mide MSE/MAE en prueba y guarda los 4 en
`model.json → qualityModels` (ordenados). El primero también se guarda en `model.json → quality` y es el que usa la app.

$$\text{MSE} = \frac{1}{m}\sum_{i=1}^{m}(\hat q_i - q_i)^2$$

#### 3a. Ridge
Vector de diseño $\mathbf{d} = [1, z_1, \dots, z_{11}, r]$ (13 componentes). Predicción:

$$\hat q = \mathbf{w}^\top \mathbf{d} = w_0 + \sum_{j=1}^{11} w_j z_j + w_{12}\, r \qquad \hat q_{\text{final}} = \min(10, \max(0, \hat q))$$

Los pesos se obtienen resolviendo las ecuaciones normales con regularización ridge ($\lambda = 10^{-3}$, sin penalizar el intercepto),
por eliminación de Gauss con pivoteo parcial:

$$(D^\top D + \lambda I')\,\mathbf{w} = D^\top \mathbf{q} \qquad I' = \operatorname{diag}(0,1,\dots,1)$$

| Término | Peso $w$ |
|---|---|
| Intercepto | 5.7413 |
| Acidez fija | 0.1278 |
| Acidez volátil | −0.2410 |
| Ácido cítrico | −0.0076 |
| Azúcar residual | 0.3099 |
| Cloruros | −0.0174 |
| SO₂ libre | 0.0810 |
| SO₂ total | −0.0824 |
| Densidad | −0.3277 |
| pH | 0.0815 |
| Sulfatos | 0.1119 |
| Alcohol | 0.2557 |
| Es tinto ($r$) | 0.3221 |

Como las variables están estandarizadas, el peso indica cuánto sube la calidad por cada desviación estándar.
Lo que más sube la calidad: alcohol y azúcar residual (a densidad fija). Lo que más la baja: densidad y acidez volátil.

Los pesos ridge se guardan además en `qualityWeights` (respaldo si un `model.json` viejo no trae `quality`).

#### 3b. Lasso
Mismo vector $[z_1,\dots,z_{11}, r]$, pero minimiza

$$\frac{1}{2n}\sum_{i=1}^{n}(q_i - w_0 - \mathbf{w}^\top \mathbf{d}_i)^2 + \lambda \sum_{j=1}^{12}|w_j|$$

por descenso por coordenadas: $w_j \leftarrow S(\rho_j, \lambda) / \overline{d_j^2}$, con $S(a,\lambda) = \operatorname{sign}(a)\max(0, |a|-\lambda)$
y $\rho_j$ la correlación de $d_j$ con el residuo parcial. $\lambda \in \{0.001, 0.003, 0.01, 0.03, 0.1\}$ se elige con un 20% interno.
Resultado: $\lambda = 0.001$, ninguna variable en 0, MSE igual a ridge.

#### 3c. Árboles de decisión (base de random forest y boosting)
Un árbol divide los vinos con preguntas "$x_j \le t$". En cada nodo prueba todos los cortes y se queda con el que más reduce el error cuadrático:

$$\max_{j,t}\ \frac{S_L^2}{n_L} + \frac{S_R^2}{n_R} \qquad (S = \text{suma de calidades a cada lado})$$

y la hoja predice el promedio de sus vinos. En `model.json` un nodo es `[variable, umbral, izquierda, derecha]` y una hoja es un número.

#### 3d. Random forest
40 árboles, cada uno con una muestra bootstrap (5197 vinos sorteados con reemplazo), 4 de las 12 variables al azar en cada corte,
profundidad ≤ 16 y hojas de ≥ 5 vinos:

$$\hat q = \frac{1}{40}\sum_{b=1}^{40} T_b(\mathbf{x}, r)$$

#### 3e. Gradient boosting
Parte del promedio $F_0 = \bar q$ y agrega 300 árboles de profundidad 4 (hojas ≥ 10), cada uno entrenado sobre el residuo actual:

$$F_m = F_{m-1} + 0.05\, T_m \qquad T_m \approx q - F_{m-1} \qquad \hat q = F_{300}$$

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

$$\text{MAE} = \frac{1}{m}\sum_{i=1}^{m}|\hat q_i - q_i| = 0.465 \qquad \text{MAE}_{\text{base}} = \frac{1}{m}\sum_{i=1}^{m}|6 - q_i| = 0.631$$

$$\text{MSE}_{\text{random forest}} = 0.387 \qquad \text{MSE}_{\text{boosting}} = 0.433 \qquad \text{MSE}_{\text{ridge}} = \text{MSE}_{\text{lasso}} = 0.517$$

$$\text{Accuracy} = \frac{\#\{\text{tipo predicho} = \text{tipo real}\}}{m} = 99.3\%$$

`train.js` no guarda el modelo si $\text{MAE} \ge \text{MAE}_{\text{base}}$ o si accuracy $\le 95\%$.

### 6. Gama (a partir de $\hat q$)

| Condición | Gama |
|---|---|
| $\hat q \ge 7$ | Premium |
| $6 \le \hat q < 7$ | Bueno |
| $5 \le \hat q < 6$ | Estándar |
| $\hat q < 5$ | Bajo |

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
Ganancia estimada si sólo cambiara esa variable (con el modelo ganador):

$$\Delta \hat q_j = \hat q(x \text{ con } x_j = t_j) - \hat q(x)$$

Se muestra si $|t_j - x_j|/\sigma_j \ge 0.25$ y $\Delta \hat q_j \ge 0.03$, ordenadas de mayor a menor. Densidad y azúcar residual se excluyen
(dependen del estilo y del alcohol; moverlas solas no es realista). Cada variable trae sus acciones de proceso en `src/model-core.js → ACTIONS`.

Maridaje:

| Tipo | Condición | Sugerencia |
|---|---|---|
| Tinto | Cuerpo Robusto | carnes rojas, parrilla, quesos curados |
| Tinto | otro | pastas, aves, embutidos |
| Blanco | Dulce o Semidulce | postres, quesos azules, comida picante |
| Blanco | otro | pescados, mariscos, ensaladas |
