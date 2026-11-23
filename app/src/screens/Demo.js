import { useMemo, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Button, Container, H, Icon, P, ScoreBar, Segmented } from '../components';
import model from '../model.json';
import { improve, percentile, predict } from '../model-core';
import { Reveal } from '../motion';
import { C, F, R, web } from '../theme';
import { PRESETS } from '../wine-data';

// Demo sin registro: 3 variables clave en sliders; las demás se toman de un vino real del dataset.
const KNOBS = [
  { f: 'alcohol', label: 'Alcohol', unit: '% vol', min: 8, max: 14.5, step: 0.1, d: 1 },
  { f: 'volatile acidity', label: 'Acidez volátil', unit: 'g/L', min: 0.1, max: 1.2, step: 0.01, d: 2 },
  { f: 'sulphates', label: 'Sulfatos', unit: 'g/L', min: 0.3, max: 1.4, step: 0.01, d: 2 },
];
const idx = f => model.features.indexOf(f);

// Web: <input type="range"> nativo (teclado y lector de pantalla incluidos). Android: Slider nativo.
function Range({ label, min, max, step, value, onChange }) {
  if (web) {
    return (
      <input type="range" aria-label={label} min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ width: '100%', height: 40, accentColor: C.wine, cursor: 'pointer', margin: 0 }} />
    );
  }
  return (
    <Slider accessibilityLabel={label} minimumValue={min} maximumValue={max} step={step} value={value} onValueChange={onChange}
      minimumTrackTintColor={C.wine} maximumTrackTintColor={C.line} thumbTintColor={C.wine} style={{ height: 40 }} />
  );
}

export default function Demo({ go }) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [type, setType] = useState('Tinto');
  const [knobs, setKnobs] = useState(() => Object.fromEntries(KNOBS.map(k => [k.f, PRESETS.Tinto[idx(k.f)]])));

  const changeType = t => {
    setType(t);
    setKnobs(Object.fromEntries(KNOBS.map(k => [k.f, PRESETS[t][idx(k.f)]])));
  };

  const { r, pct, recs } = useMemo(() => {
    const x = [...PRESETS[type]];
    KNOBS.forEach(k => (x[idx(k.f)] = knobs[k.f]));
    const isRed = type === 'Tinto' ? 1 : 0;
    const r = predict(model, x, isRed);
    return { r, pct: percentile(model, r.quality, isRed), recs: improve(model, x, isRed) };
  }, [type, knobs]);
  const maxGain = recs.reduce((s, x) => s + x.gain, 0);

  return (
    <View style={{ backgroundColor: C.cream, paddingVertical: wide ? 96 : 64 }}>
      <Container>
        <Reveal style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: F.bodySb, fontSize: 13, letterSpacing: 1.5, color: C.mauve }}>PRUÉBALO AHORA · SIN REGISTRO</Text>
          <H size={wide ? 52 : 34} style={{ textAlign: 'center', marginTop: 8 }}>Mueve los valores.{'\n'}Mira la calidad cambiar.</H>
        </Reveal>

        <Reveal delay={150} style={{ flexDirection: wide ? 'row' : 'column', gap: 20, marginTop: 40 }}>
          {/* Controles */}
          <View style={{ flex: 1, backgroundColor: C.white, borderRadius: R.lg, padding: wide ? 32 : 20, borderWidth: 1, borderColor: C.line, gap: 22 }}>
            <Segmented label="Tipo de vino" options={[['Tinto', 'Tinto'], ['Blanco', 'Blanco']]} value={type} onChange={changeType} />
            {KNOBS.map(k => (
              <View key={k.f}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Text style={{ fontFamily: F.bodySb, fontSize: 15, color: C.ink }}>{k.label}</Text>
                  <Text style={{ fontFamily: F.display, fontSize: 22, color: C.wine }}>
                    {knobs[k.f].toFixed(k.d)} <Text style={{ fontFamily: F.body, fontSize: 13, color: C.muted }}>{k.unit}</Text>
                  </Text>
                </View>
                <Range label={`${k.label} en ${k.unit}`} min={k.min} max={k.max} step={k.step} value={knobs[k.f]}
                  onChange={v => setKnobs(s => ({ ...s, [k.f]: v }))} />
              </View>
            ))}
            <P size={13} color={C.muted}>Las otras 8 variables se toman de un {type.toLowerCase()} real del dataset.</P>
          </View>

          {/* Resultado + recomendaciones bloqueadas */}
          <View style={{ flex: 1, gap: 16 }}>
            <View style={{ backgroundColor: C.ink, borderRadius: R.lg, padding: wide ? 32 : 24 }} accessibilityLiveRegion="polite">
              <Text style={{ fontFamily: F.bodySb, fontSize: 12, letterSpacing: 1.2, color: C.sand }}>CALIDAD ESTIMADA</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                <Text style={{ fontFamily: F.display, fontSize: 96, lineHeight: 104, color: C.white }}>{r.quality.toFixed(1)}</Text>
                <Text style={{ fontFamily: F.displayMd, fontSize: 24, color: C.sage, marginBottom: 16 }}>/ 10</Text>
              </View>
              <ScoreBar value={r.quality} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, alignItems: 'center' }}>
                <View style={{ backgroundColor: C.sand, borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 6 }}>
                  <Text style={{ fontFamily: F.bodySb, color: C.ink, fontSize: 14 }}>Gama {r.tier.name}</Text>
                </View>
                <Text style={{ fontFamily: F.bodyMd, color: C.white, fontSize: 15 }}>
                  Mejor que el {pct}% de los {type === 'Tinto' ? 'tintos' : 'blancos'} analizados
                </Text>
              </View>
              <Text style={{ fontFamily: F.body, color: C.sage, fontSize: 14, marginTop: 12 }}>
                Cuerpo {r.flavor.cuerpo.toLowerCase()} · {r.flavor.dulzor} · Acidez {r.flavor.acidez.toLowerCase()}
              </Text>
            </View>

            <View style={{ backgroundColor: C.white, borderRadius: R.lg, padding: wide ? 28 : 20, borderWidth: 1, borderColor: C.line }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.sage, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="lock" size={18} color={C.wine} />
                </View>
                <Text style={{ flex: 1, fontFamily: F.bodySb, fontSize: 16, color: C.ink }}>
                  {recs.length
                    ? `${recs.length} ${recs.length === 1 ? 'recomendación' : 'recomendaciones'} para este vino · hasta +${maxGain.toFixed(1)} pts`
                    : 'Este vino ya está en el perfil de los mejores'}
                </Text>
              </View>
              {/* Vista previa difuminada: se intuye el contenido, no se revela */}
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ marginTop: 16, gap: 10, opacity: 0.6 }}>
                {[0.85, 0.6, 0.72].map((w, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 44, height: 18, borderRadius: 4, backgroundColor: C.sage }} />
                    <View style={{ height: 10, width: `${w * 70}%`, borderRadius: 5, backgroundColor: C.line }} />
                  </View>
                ))}
              </View>
              <P size={14} color={C.muted} style={{ marginTop: 14 }}>Qué procesos del viñedo y la bodega aplicar, y cuántos puntos podría ganar.</P>
              <Button label="Desbloquear con tu cuenta" icon="lock" onPress={() => go('signup')} style={{ marginTop: 12 }} />
            </View>
          </View>
        </Reveal>
      </Container>
    </View>
  );
}
