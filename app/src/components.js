import { memo, useId, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, PixelRatio, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop, SvgXml } from 'react-native-svg';
import LOGO from './brand/logo-svg';
import { VEIL, veilLayers } from './photo-veil';
import { C, F, R, MAXW, web } from './theme';

// Una sola versión del logo en toda la app y los PDFs: título blanco, vid y "Vineyard" arena. Va siempre sobre fondo oscuro.
export const LOGO_COLORS = { VINE: C.sand, TITLE: C.white, SCRIPT: C.sand };
const LOGO_XML = LOGO.replace(/\{\{(\w+)\}\}/g, (_, k) => LOGO_COLORS[k]);

export const Logo = memo(function Logo({ width = 320 }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Los Tres García Vineyard" style={{ width, aspectRatio: 710 / 365 }}>
      <SvgXml xml={LOGO_XML} width="100%" height="100%" />
    </View>
  );
});

// Íconos estilo Lucide (trazo 2px, 24×24)
const ICONS = {
  chevron: 'M9 18l6-6-6-6',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  back: 'M15 18l-6-6 6-6',
  flask: 'M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3M7 15h10',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  lock: 'M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z',
  down: 'M6 9l6 6 6-6',
  check: 'M20 6L9 17l-5-5',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  bookmark: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
  x: 'M18 6L6 18M6 6l12 12',
  bulb: 'M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z',
  share: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13',
};

// Respuesta al toque en Android (la web usa los estados hover de cada control y no cambia)
export const RIPPLE = { color: 'rgba(94,25,44,0.10)' };
export const RIPPLE_ROUND = { ...RIPPLE, borderless: true, radius: 22 };

// Control segmentado (píldoras) con semántica de radio. El celular pasa minHeight={48}.
export function Segmented({ options, value, onChange, label, dark, minHeight = 40 }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', backgroundColor: dark ? 'rgba(255,255,255,0.08)' : C.cream, borderRadius: R.pill, padding: 4, alignSelf: 'flex-start', flexWrap: 'wrap' }}>
      {options.map(([text, v]) => {
        const on = value === v;
        return (
          <Pressable key={text} onPress={() => onChange(v)} accessibilityRole="radio" accessibilityState={{ checked: on }}
            style={({ hovered }) => ({
              paddingHorizontal: 18, minHeight, justifyContent: 'center', borderRadius: R.pill, cursor: web ? 'pointer' : undefined,
              backgroundColor: on ? (dark ? C.sand : C.wine) : hovered ? (dark ? 'rgba(255,255,255,0.12)' : C.line) : 'transparent',
            })}>
            <Text style={{ fontFamily: F.bodySb, fontSize: 14, color: on ? (dark ? C.ink : C.white) : dark ? C.white : C.ink }}>{text}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Barra de calidad 0–10
export function ScoreBar({ value, color = C.sand, track = 'rgba(255,255,255,0.15)' }) {
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value * 10))}%`, height: '100%', backgroundColor: color, borderRadius: 4 }} />
    </View>
  );
}
export function Icon({ name, size = 20, color = C.ink }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d={ICONS[name]} />
    </Svg>
  );
}

// Botón principal tipo píldora. kind: solid | outline | ghost. tone: color de fondo/acento.
const TONES = {
  wine: { bg: C.wine, fg: C.white, hover: '#4a1322' },
  sand: { bg: C.sand, fg: C.ink, hover: '#c5ad7b' },
  ink: { bg: C.ink, fg: C.white, hover: '#3a2a33' },
  white: { bg: C.white, fg: C.ink, hover: C.cream },
};
// Celular: `spinner` muestra un indicador girando y `loadingLabel` mientras carga (p. ej. "Generando PDF…"), sin
// atenuar el botón. La web no los pasa y sigue con "Procesando…".
export function Button({ label, onPress, kind = 'solid', tone = 'wine', icon, disabled, loading, small, style, a11y, spinner, loadingLabel }) {
  const t = TONES[tone];
  const fg = kind === 'solid' ? t.fg : t.bg;
  const spinning = loading && spinner;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={a11y || label}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={({ hovered, pressed }) => [
        {
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          minHeight: small ? 40 : 48, paddingHorizontal: small ? 18 : 26, borderRadius: R.pill,
          cursor: web ? 'pointer' : undefined, opacity: disabled || (loading && !spinner) ? 0.55 : pressed ? 0.85 : 1,
        },
        kind === 'solid' && { backgroundColor: hovered ? t.hover : t.bg },
        kind === 'outline' && { borderWidth: 1.5, borderColor: t.bg, backgroundColor: hovered ? `${t.bg}1f` : 'transparent' },
        style,
      ]}
    >
      {spinning ? <ActivityIndicator size="small" color={fg} /> : icon && <Icon name={icon} size={18} color={fg} />}
      <Text style={{ fontFamily: F.bodySb, fontSize: small ? 14 : 16, color: fg }}>
        {loading ? (spinning && loadingLabel) || 'Procesando…' : label}
      </Text>
    </Pressable>
  );
}

// Enlace estilo Apple: "Más información >"
export function TextLink({ label, onPress, color = C.wine, size = 17, back }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" android_ripple={RIPPLE} style={({ hovered }) => ({
      flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, cursor: web ? 'pointer' : undefined, opacity: hovered ? 0.75 : 1,
    })}>
      {back && <Icon name="back" size={size} color={color} />}
      <Text style={{ fontFamily: F.bodyMd, fontSize: size, color }}>{label}</Text>
      {!back && <Icon name="chevron" size={size} color={color} />}
    </Pressable>
  );
}

export function Field({ label, error, style, ...props }) {
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      <Text style={{ fontFamily: F.bodySb, fontSize: 13, color: C.muted, marginBottom: 6, letterSpacing: 0.3 }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#8f8288"
        style={{
          fontFamily: F.body, fontSize: 16, color: C.ink, backgroundColor: C.white,
          borderWidth: 1.5, borderColor: error ? '#b3261e' : C.line, borderRadius: R.sm,
          paddingHorizontal: 14, minHeight: 48,
        }}
        {...props}
      />
    </View>
  );
}

// Foto de fondo "deslavada": imagen + capa del color de marca encima.
// Un View con la imagen en posición absoluta (ImageBackground está obsoleto en React Native).
// Celular: la foto se estira sólo con top/left/right/bottom 0, igual que la capa de color. Con width/height '100%'
// Yoga mide el porcentaje sin el padding del contenedor y la foto quedaba corta (franja a la derecha y abajo).
// Web: el mismo estilo que pinta ImageBackground en react-native-web (100% y zIndex -1), así que se ve igual.
export function Faded({ source, color = C.ink, opacity = 0.82, style, children }) {
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: color }, style]}>
      <Image source={source} resizeMode="cover" accessibilityIgnoresInvertColors
        style={[StyleSheet.absoluteFill, web && { width: '100%', height: '100%', zIndex: -1 }]} />
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color, opacity }} />
      {children}
    </View>
  );
}

export const IMG = {
  vineyardGold: require('../assets/img/vineyard-gold.jpg'),
  vineyardSun: require('../assets/img/vineyard-sun.jpg'),
  vineyardAerial: require('../assets/img/vineyard-aerial.jpg'),
  barrels: require('../assets/img/barrels.jpg'),
  bottles: require('../assets/img/bottles.jpg'),
};

// Encuadre de cada foto en los encabezados del celular. focusY: qué parte queda si hay que recortar (0 arriba,
// 1 abajo). veil: el velo de photo-veil.js, si no es el de las pestañas.
const FRAME = new Map([
  [IMG.vineyardGold, { focusY: 0.6 }], // el sol y las hileras
  [IMG.vineyardAerial, { veil: VEIL.aerial }],
  [IMG.bottles, { focusY: 0.35 }], // las repisas con etiquetas
]);

// Encabezado con foto del celular (la web sigue con Faded). La foto conserva su proporción y nunca se pinta más grande
// que su resolución (ancho ≤ píxeles / densidad de la pantalla), así se ve nítida en cualquier teléfono:
// - Encabezado más alto que la foto: la foto se disuelve hacia `color` y lo de abajo queda liso.
// - Encabezado más bajo: se recorta según `focusY`, y su borde de abajo también se disuelve.
// - Foto más angosta que la pantalla (las botellas en 3×, todas en tableta): va a la derecha y su borde izquierdo
//   nace suave del `color`, así el texto queda sobre fondo liso.
// El velo (photo-veil.js) oscurece donde va el texto; su contraste se revisa sobre el píxel más claro de cada foto.
export function PhotoHeader({ source, color = C.ink, veil, focusY, style, children }) {
  const [box, setBox] = useState(null);
  const frame = FRAME.get(source) ?? {};
  const preset = veil ?? frame.veil ?? VEIL.tab;
  const fy = focusY ?? frame.focusY ?? 0.5;
  const onLayout = e => {
    const { width, height } = e.nativeEvent.layout;
    setBox(b => (b && Math.abs(b.width - width) < 0.5 && Math.abs(b.height - height) < 0.5 ? b : { width, height }));
  };

  let photo = null;
  if (box) {
    const a = Image.resolveAssetSource(source);
    const w = Math.min(box.width, (a.width * (a.scale || 1)) / PixelRatio.get());
    const h = (w * a.height) / a.width;
    const clipped = h > box.height;
    const narrow = w < box.width - 0.5;
    photo = { w, h, top: clipped ? -(h - box.height) * fy : 0, visible: clipped ? box.height : h, layers: veilLayers(preset, { clipped, narrow }) };
  }

  return (
    <View onLayout={onLayout} style={[{ overflow: 'hidden', backgroundColor: color }, style]}>
      {photo && (
        <View style={{ position: 'absolute', top: 0, right: 0, width: photo.w, height: photo.visible, overflow: 'hidden', pointerEvents: 'none' }}>
          <Image source={source} resizeMode="cover" resizeMethod="scale" fadeDuration={0} accessibilityIgnoresInvertColors
            style={{ position: 'absolute', left: 0, top: photo.top, width: photo.w, height: photo.h }} />
          <Veil layers={photo.layers} color={color} width={photo.w} height={photo.visible} />
        </View>
      )}
      {children}
    </View>
  );
}

// Velo de PhotoHeader con react-native-svg (componentes nativos en iOS y Android, incluidos en Expo Go).
// Cada capa de photo-veil.js es un degradado del mismo color con su opacidad por parada, pintado en un rectángulo
// que cubre la foto. Unidades objectBoundingBox (0–1 del rectángulo): la elipse radial r = 0.7071 pasa por las
// esquinas, igual que la revisión de contraste.
export function Veil({ layers, color, width, height }) {
  const id = `velo${useId().replace(/[^\w-]/g, '')}`;
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
      <Defs>
        {layers.map((layer, i) => {
          const stops = layer.stops.map(([p, a], j) => <Stop key={j} offset={p} stopColor={color} stopOpacity={a} />);
          return layer.type === 'radial' ? (
            <RadialGradient key={i} id={`${id}-${i}`} cx={0.5} cy={0.5} fx={0.5} fy={0.5} r={0.7071}>{stops}</RadialGradient>
          ) : (
            <LinearGradient key={i} id={`${id}-${i}`} x1={0} y1={0} x2={layer.dir === 'to right' ? 1 : 0} y2={layer.dir === 'to bottom' ? 1 : 0}>
              {stops}
            </LinearGradient>
          );
        })}
      </Defs>
      {layers.map((_, i) => <Rect key={i} x={0} y={0} width={width} height={height} fill={`url(#${id}-${i})`} />)}
    </Svg>
  );
}

// Barra de navegación fija (estilo apple.com) con el logo de la marca
export function NavBar({ children, onLogo }) {
  return (
    <View style={{ backgroundColor: 'rgba(32,21,29,0.96)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
      <View style={{ maxWidth: MAXW, width: '100%', alignSelf: 'center', paddingHorizontal: 20, minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Pressable onPress={onLogo} accessibilityRole="link" accessibilityLabel="Los Tres García, inicio" style={{ cursor: web ? 'pointer' : undefined, minHeight: 44, justifyContent: 'center' }}>
          <Logo width={120} />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{children}</View>
      </View>
    </View>
  );
}

export const Container = ({ style, children, ...p }) => (
  <View style={[{ maxWidth: MAXW, width: '100%', alignSelf: 'center', paddingHorizontal: 20 }, style]} {...p}>{children}</View>
);

export const H = ({ size = 56, color = C.ink, style, children, ...p }) => (
  <Text accessibilityRole="header" style={[{ fontFamily: F.display, fontSize: size, lineHeight: size * 1.12, color, letterSpacing: 0.5 }, style]} {...p}>{children}</Text>
);
export const P = ({ size = 19, color = C.ink, style, children }) => (
  <Text style={[{ fontFamily: F.body, fontSize: size, lineHeight: size * 1.55, color }, style]}>{children}</Text>
);

// Tarjeta blanca y rótulo en versalitas del dashboard
export const Card = ({ style, children, ...p }) => (
  <View style={[{ backgroundColor: C.white, borderRadius: R.lg, padding: 24, borderWidth: 1, borderColor: C.line }, style]} {...p}>{children}</View>
);
export const Kicker = ({ color = C.muted, style, children }) => (
  <Text style={[{ fontFamily: F.bodySb, fontSize: 12, letterSpacing: 1.2, color, marginBottom: 10 }, style]}>{children}</Text>
);

// Colores [fondo, texto] de cada gama de calidad
export const TIER_STYLE = { Premium: [C.sand, C.ink], Bueno: [C.sage, C.ink], 'Estándar': [C.white, C.ink], Bajo: [C.ink, C.white] };

// Android (edge-to-edge): el teclado ya no achica la ventana, así que se deja espacio para que no tape los campos.
// En iOS lo hace la ScrollView (automaticallyAdjustKeyboardInsets) y en web no envuelve nada.
export function KeyboardAvoid({ children }) {
  if (Platform.OS !== 'android') return children;
  return <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>{children}</KeyboardAvoidingView>;
}

// Encabezado de las pestañas del celular: foto de marca que pasa por debajo de la barra de estado.
// El contenido de abajo sube 20 px sobre él (marginTop: -20), igual que en el dashboard web.
export function TabHeader({ source, kicker, title, children }) {
  const { top } = useSafeAreaInsets();
  return (
    <PhotoHeader source={source} color={C.ink} style={{ paddingTop: top + 12, paddingBottom: 44 }}>
      <Container>
        <Logo width={104} />
        {kicker ? <Text style={{ fontFamily: F.bodyMd, color: C.sand, fontSize: 15, marginTop: 18 }}>{kicker}</Text> : null}
        <H size={38} color={C.white} style={{ marginTop: kicker ? 4 : 18 }}>{title}</H>
        {children}
      </Container>
    </PhotoHeader>
  );
}
