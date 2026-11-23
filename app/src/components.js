import { memo } from 'react';
import { ImageBackground, Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Path, SvgXml } from 'react-native-svg';
import LOGO from './brand/logo-svg';
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
};

// Control segmentado (píldoras) con semántica de radio
export function Segmented({ options, value, onChange, label, dark }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', backgroundColor: dark ? 'rgba(255,255,255,0.08)' : C.cream, borderRadius: R.pill, padding: 4, alignSelf: 'flex-start', flexWrap: 'wrap' }}>
      {options.map(([text, v]) => {
        const on = value === v;
        return (
          <Pressable key={text} onPress={() => onChange(v)} accessibilityRole="radio" accessibilityState={{ checked: on }}
            style={({ hovered }) => ({
              paddingHorizontal: 18, minHeight: 40, justifyContent: 'center', borderRadius: R.pill, cursor: web ? 'pointer' : undefined,
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
export function Button({ label, onPress, kind = 'solid', tone = 'wine', icon, disabled, loading, small, style, a11y }) {
  const t = TONES[tone];
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
          cursor: web ? 'pointer' : undefined, opacity: disabled || loading ? 0.55 : pressed ? 0.85 : 1,
        },
        kind === 'solid' && { backgroundColor: hovered ? t.hover : t.bg },
        kind === 'outline' && { borderWidth: 1.5, borderColor: t.bg, backgroundColor: hovered ? `${t.bg}1f` : 'transparent' },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={18} color={kind === 'solid' ? t.fg : t.bg} />}
      <Text style={{ fontFamily: F.bodySb, fontSize: small ? 14 : 16, color: kind === 'solid' ? t.fg : t.bg }}>
        {loading ? 'Procesando…' : label}
      </Text>
    </Pressable>
  );
}

// Enlace estilo Apple: "Más información >"
export function TextLink({ label, onPress, color = C.wine, size = 17, back }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={({ hovered }) => ({
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

// Foto de fondo "deslavada": imagen + capa del color de marca encima
export function Faded({ source, color = C.ink, opacity = 0.82, style, children }) {
  return (
    <ImageBackground source={source} resizeMode="cover" imageStyle={{ width: '100%', height: '100%' }}
      style={[{ overflow: 'hidden', backgroundColor: color }, style]} accessibilityIgnoresInvertColors>
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color, opacity }} />
      {children}
    </ImageBackground>
  );
}

export const IMG = {
  vineyardGold: require('../assets/img/vineyard-gold.jpg'),
  vineyardSun: require('../assets/img/vineyard-sun.jpg'),
  vineyardAerial: require('../assets/img/vineyard-aerial.jpg'),
  barrels: require('../assets/img/barrels.jpg'),
  bottles: require('../assets/img/bottles.jpg'),
};

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

export const Container = ({ style, children }) => (
  <View style={[{ maxWidth: MAXW, width: '100%', alignSelf: 'center', paddingHorizontal: 20 }, style]}>{children}</View>
);

export const H = ({ size = 56, color = C.ink, style, children, ...p }) => (
  <Text accessibilityRole="header" style={[{ fontFamily: F.display, fontSize: size, lineHeight: size * 1.12, color, letterSpacing: 0.5 }, style]} {...p}>{children}</Text>
);
export const P = ({ size = 19, color = C.ink, style, children }) => (
  <Text style={[{ fontFamily: F.body, fontSize: size, lineHeight: size * 1.55, color }, style]}>{children}</Text>
);
