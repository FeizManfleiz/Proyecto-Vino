// Analizar en el celular: formulario por secciones, "Siguiente"/"Listo" en el teclado y la barra de calificación
// en vivo. La web sigue usando AnalysisForm (analysis-ui.js); esto sólo lo monta la pestaña Analizar.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, InputAccessoryView, Keyboard, LayoutAnimation, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SaveWineSection, TYPES } from './analysis-ui';
import { Button, Card, Icon, Kicker, RIPPLE, ScoreBar, Segmented, TIER_STYLE } from './components';
import { TabDock } from './mobile-ui';
import model from './model.json';
import { useReducedMotion } from './motion';
import { C, F, R } from './theme';
import { fieldIssue, LABELS, PRESETS } from './wine-data';

const ios = Platform.OS === 'ios';
const android = Platform.OS === 'android';

const BAR_H = 64;
const BAR_COMPACT_H = 48; // Android con el teclado abierto: la barra queda justo encima del teclado
const BAR_GAP = 12;
export const BAR_SPACE = BAR_H + BAR_GAP; // aire extra al final de la pestaña para que la barra no tape nada
// iOS: barra sobre el teclado numérico, que no trae tecla "Siguiente". Un nativeID por campo (ver KeyboardBar).
const accessoryId = key => `analizar-teclado-${key}`;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const SAND_RIPPLE = { color: 'rgba(211,190,145,0.24)' }; // el mismo de la barra de pestañas

// Las 11 mediciones agrupadas como se leen en la bodega. Su orden también es el de "Siguiente".
const SECTIONS = [
  { title: 'Acidez', features: ['fixed acidity', 'volatile acidity', 'citric acid', 'pH'] },
  { title: 'Azúcares y sales', features: ['residual sugar', 'chlorides'] },
  { title: 'Sulfitos', features: ['free sulfur dioxide', 'total sulfur dioxide', 'sulphates'] },
  { title: 'Cuerpo', features: ['alcohol', 'density'] },
].map(s => ({ ...s, idx: s.features.map(f => model.features.indexOf(f)) }));
const ORDER = SECTIONS.flatMap(s => s.idx);
const LAST = ORDER[ORDER.length - 1];
const sectionOf = i => SECTIONS.findIndex(s => s.idx.includes(i));
// Nombres cortos para el resumen de una sección plegada
const SHORT = {
  'fixed acidity': 'Fija', 'volatile acidity': 'Volátil', 'citric acid': 'Cítrico', pH: 'pH', 'residual sugar': 'Azúcar',
  chlorides: 'Cloruros', 'free sulfur dioxide': 'SO₂ libre', 'total sulfur dioxide': 'SO₂ total', sulphates: 'Sulfatos',
  alcohol: 'Alcohol', density: 'Densidad',
};
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Estado de la pestaña: secciones abiertas, foco y "Siguiente", teclado y barra de calificación.
// `scroll` es la ref de la ScrollView de la pestaña.
export function useAnalysisFlow({ a, scroll }) {
  const reduced = useReducedMotion();
  const { top } = useSafeAreaInsets();
  const [open, setOpen] = useState(() => SECTIONS.map((_, k) => k === 0));
  const [focused, setFocusedState] = useState(null); // índice del campo, 'name' o 'year'
  const [keyboard, setKeyboard] = useState(false);
  const [barShown, setBarShown] = useState(true);
  const barAnim = useRef(new Animated.Value(1)).current;
  const shownRef = useRef(true);
  const inputs = useRef({});
  const focusedRef = useRef(null);
  const pending = useRef(null);
  const kbTop = useRef(null); // borde superior del teclado en la ventana; null si está cerrado
  const scrollY = useRef(0);
  const viewH = useRef(0);
  const bodyY = useRef(0);
  const res = useRef({ y: 0, h: 0 }); // tarjeta del resultado, relativa al cuerpo de la pestaña

  // Lo que se marca en cada campo. Un campo vacío no se marca mientras se escribe en él.
  const issues = a.values.map((v, i) => {
    const x = fieldIssue(model.features[i], v);
    return x?.empty && focused === i ? null : x;
  });

  const animateLayout = () => {
    if (!reduced) LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
  };
  const setFocused = k => { focusedRef.current = k; setFocusedState(k); };

  // Sube la pantalla si el campo enfocado quedó detrás del teclado (y de la barra, en Android) o bajo la hora
  const reveal = (key, delay) => setTimeout(() => {
    const node = inputs.current[key];
    if (!node || kbTop.current == null || focusedRef.current !== key) return;
    node.measureInWindow((x, y, w, h) => {
      const limit = kbTop.current - (android ? BAR_COMPACT_H + BAR_GAP : 0) - 32; // 32: el mensaje bajo el campo
      const dy = y + h > limit ? y + h - limit : y < top + 16 ? y - top - 16 : 0;
      if (dy) scroll.current?.scrollTo({ y: Math.max(0, scrollY.current + dy), animated: !reduced });
    });
  }, delay);
  const revealRef = useRef(reveal);
  revealRef.current = reveal;

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e => {
      kbTop.current = e.endCoordinates.screenY;
      setKeyboard(true);
      if (focusedRef.current != null) revealRef.current(focusedRef.current, 0);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => { kbTop.current = null; setKeyboard(false); });
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Una sección con un valor por revisar se abre sola (p. ej. al cargar un vino guardado)
  const issueKey = issues.map(x => (x ? 1 : 0)).join('');
  useEffect(() => {
    const need = SECTIONS.map((sec, k) => !open[k] && sec.idx.some(i => issues[i]));
    if (!need.some(Boolean)) return;
    animateLayout();
    setOpen(o => o.map((v, k) => v || need[k]));
  }, [issueKey]);

  const toggle = k => { animateLayout(); setOpen(o => o.map((v, j) => (j === k ? !v : v))); };

  // Enfoca un campo; si su sección está cerrada la abre y lo enfoca en cuanto existe
  const focusKey = key => {
    if (typeof key !== 'number') return inputs.current[key]?.focus();
    const k = sectionOf(key);
    if (open[k]) return inputs.current[key]?.focus();
    pending.current = key;
    animateLayout();
    setOpen(o => o.map((v, j) => v || j === k));
  };
  useEffect(() => {
    const i = pending.current;
    if (i != null && inputs.current[i]) { pending.current = null; inputs.current[i].focus(); }
  }, [open]);

  const goNext = i => {
    const p = ORDER.indexOf(i);
    if (p < 0 || i === LAST) return Keyboard.dismiss();
    focusKey(ORDER[p + 1]);
  };

  const fieldProps = key => ({
    ref: node => { inputs.current[key] = node; },
    onFocus: () => { setFocused(key); if (kbTop.current != null) reveal(key, 250); },
    onBlur: () => { if (focusedRef.current === key) setFocused(null); },
  });

  // La barra se esconde mientras la tarjeta del resultado está a la vista
  const showBar = shown => {
    if (shown === shownRef.current) return;
    shownRef.current = shown;
    setBarShown(shown);
    if (reduced) barAnim.setValue(shown ? 1 : 0);
    else Animated.timing(barAnim, { toValue: shown ? 1 : 0, duration: 200, easing: EASE_OUT, useNativeDriver: true }).start();
  };
  const updateBar = () => {
    const { y, h } = res.current;
    if (!h || !viewH.current) return;
    const resTop = bodyY.current + y;
    const inView = resTop < scrollY.current + viewH.current - 160 && resTop + h > scrollY.current + top + 160;
    showBar(!inView);
  };

  const scrollToResult = () => {
    Keyboard.dismiss();
    scroll.current?.scrollTo({ y: Math.max(0, bodyY.current + res.current.y - top - 12), animated: !reduced });
  };
  const goToFirstIssue = () => {
    const i = ORDER.find(j => a.live.bad[j]);
    if (i != null) focusKey(i);
  };

  return {
    open, toggle, issues, focused, keyboard, barShown, barAnim, fieldProps, focusKey, goNext, scrollToResult, goToFirstIssue,
    onScroll: e => { scrollY.current = e.nativeEvent.contentOffset.y; updateBar(); },
    onViewLayout: e => { viewH.current = e.nativeEvent.layout.height; updateBar(); },
    onBodyLayout: e => { bodyY.current = e.nativeEvent.layout.y; updateBar(); },
    onResultLayout: e => { res.current = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height }; updateBar(); },
  };
}

// Campo numérico del análisis: borde vino al escribir, malva suave si hay algo que revisar, y el motivo debajo.
// `bar`: su barra del teclado en iOS, que se monta justo después del campo (ver KeyboardBar).
function NumberField({ label, value, issue, focused, last, accessoryID, bar, ref, ...props }) {
  return (
    <View style={{ flexBasis: '50%', paddingHorizontal: 8, marginBottom: 14 }}>
      <Text style={{ fontFamily: F.bodySb, fontSize: 13, color: C.muted, marginBottom: 6, letterSpacing: 0.3 }}>{label}</Text>
      <TextInput
        ref={ref}
        value={value}
        keyboardType="decimal-pad"
        returnKeyType={last ? 'done' : 'next'}
        returnKeyLabel={last ? 'Listo' : 'Siguiente'}
        submitBehavior={last ? 'blurAndSubmit' : 'submit'}
        inputAccessoryViewID={ios ? accessoryID : undefined}
        selectTextOnFocus
        accessibilityLabel={issue ? `${label}. ${issue.text}` : label}
        style={{
          fontFamily: F.body, fontSize: 16, color: C.ink, minHeight: 48, paddingHorizontal: 14, borderRadius: R.sm, borderWidth: 1.5,
          borderColor: issue ? C.mauve : focused ? C.wine : C.line, backgroundColor: issue ? `${C.mauve}14` : C.white,
        }}
        {...props}
      />
      {bar}
      {issue ? <Text style={{ fontFamily: F.bodyMd, fontSize: 13, lineHeight: 18, color: C.wine, marginTop: 4 }}>{issue.text}</Text> : null}
    </View>
  );
}

// Sección plegable: título, resumen de valores cuando está cerrada y cuántos campos hay que revisar
function Section({ sec, open, onToggle, values, issues, children }) {
  const n = sec.idx.filter(i => issues[i]).length;
  const summary = sec.idx.map(i => `${SHORT[model.features[i]]} ${String(values[i]).trim() || '—'}`).join(' · ');
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: C.line }}>
      <Pressable onPress={onToggle} android_ripple={RIPPLE}
        accessibilityRole="button" accessibilityState={{ expanded: open }}
        accessibilityLabel={`${sec.title}${n ? `, ${n} por revisar` : ''}`} accessibilityHint={open ? 'Pliega la sección' : 'Despliega la sección'}
        style={({ pressed }) => ({
          minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
          backgroundColor: ios && pressed ? C.cream : 'transparent',
        })}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: F.bodySb, fontSize: 17, color: C.ink }}>{sec.title}</Text>
          {!open && <Text numberOfLines={2} style={{ fontFamily: F.body, fontSize: 13, lineHeight: 19, color: C.muted }}>{summary}</Text>}
        </View>
        {n > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.mauve }} />
            <Text style={{ fontFamily: F.bodyMd, fontSize: 13, color: C.wine }}>{n} por revisar</Text>
          </View>
        )}
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <Icon name="down" color={C.muted} />
        </View>
      </Pressable>
      {open && <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8, paddingBottom: 6 }}>{children}</View>}
    </View>
  );
}

// iOS: barra sobre el teclado con la calificación en vivo y "Siguiente" / "Listo", una por campo (`field`: índice del
// campo numérico o 'year').
// Por qué una por campo: en la nueva arquitectura (la de Expo Go), un InputAccessoryView se engancha a UN solo campo,
// el primero que encuentra en la ventana con su nativeID, y sólo al montarse
// (RCTInputAccessoryComponentView.mm, didMoveToWindow). Con un nativeID compartido, los demás campos se quedaban
// sin barra al llegar a ellos con "Siguiente". Por eso cada barra va justo después de su campo: se monta con él,
// también en las secciones que se abren después, y no depende de qué campo está enfocado.
function KeyboardBar({ a, s, flow, field }) {
  if (!ios) return null;
  const { r, bad } = a.live;
  const last = field === 'year' || field === LAST;
  const status = r ? `Calidad ${r.quality.toFixed(1)} de 10, gama ${r.tier.name}` : `Revisa ${count(bad.filter(Boolean).length, 'valor', 'valores')}`;
  const onPress = field === 'year' ? () => { Keyboard.dismiss(); s.onSave(); } : () => flow.goNext(field);
  return (
    <InputAccessoryView nativeID={accessoryId(field)} backgroundColor={C.ink}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 6,
        borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)',
      }}>
        <View accessible accessibilityLabel={status} style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          {r ? (
            <>
              <Text style={{ fontFamily: F.display, fontSize: 24, color: C.white, fontVariant: ['tabular-nums'] }}>{r.quality.toFixed(1)}</Text>
              <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.bodyMd, fontSize: 13, color: C.sand }}>/ 10 · Gama {r.tier.name}</Text>
            </>
          ) : (
            <Text style={{ fontFamily: F.bodySb, fontSize: 15, color: C.white }}>{status}</Text>
          )}
        </View>
        <Button tone="sand" label={last ? 'Listo' : 'Siguiente'} onPress={onPress} />
      </View>
    </InputAccessoryView>
  );
}

// Ejemplos en píldoras sueltas que bajan de línea: en un control segmentado, 4 nombres largos no caben en un celular
function Chips({ label, options, value, onChange }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map(text => {
        const on = value === text;
        return (
          <Pressable key={text} onPress={() => onChange(text)} android_ripple={RIPPLE} accessibilityRole="radio" accessibilityState={{ checked: on }}
            style={({ pressed }) => ({
              minHeight: 48, paddingHorizontal: 18, justifyContent: 'center', borderRadius: R.pill, overflow: 'hidden', borderWidth: 1,
              borderColor: on ? C.wine : C.line, backgroundColor: on ? C.wine : ios && pressed ? C.line : C.cream,
            })}>
            <Text style={{ fontFamily: F.bodySb, fontSize: 14, color: on ? C.white : C.ink }}>{text}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Formulario del celular: ejemplos, tipo, las 11 mediciones en 4 secciones y "Guardar en Mis vinos"
export function MobileAnalysisForm({ a, s, pad, flow }) {
  return (
    <Card style={{ padding: pad }}>
      <Kicker>EJEMPLOS</Kicker>
      <Chips label="Ejemplos" options={Object.keys(PRESETS)} value={a.preset} onChange={k => a.loadValues(PRESETS[k], k)} />
      <Kicker style={{ marginTop: 20 }}>TIPO DE VINO</Kicker>
      <Segmented minHeight={48} label="Tipo de vino" options={TYPES} value={a.type} onChange={a.setType} />

      <Kicker style={{ marginTop: 28, marginBottom: 4 }}>ANÁLISIS QUÍMICO</Kicker>
      {SECTIONS.map((sec, k) => (
        <Section key={sec.title} sec={sec} open={flow.open[k]} onToggle={() => flow.toggle(k)} values={a.values} issues={flow.issues}>
          {sec.idx.map(i => (
            <NumberField key={i} label={LABELS[model.features[i]]} value={a.values[i]} issue={flow.issues[i]} focused={flow.focused === i}
              last={i === LAST} onChangeText={t => a.setField(i, t)} onSubmitEditing={() => flow.goNext(i)} {...flow.fieldProps(i)}
              accessoryID={accessoryId(i)} bar={<KeyboardBar a={a} s={s} flow={flow} field={i} />} />
          ))}
        </Section>
      ))}

      <SaveWineSection s={s} wide={false}
        nameProps={{ ...flow.fieldProps('name'), returnKeyType: 'next', returnKeyLabel: 'Siguiente', submitBehavior: 'submit', onSubmitEditing: () => flow.focusKey('year') }}
        yearProps={{ ...flow.fieldProps('year'), returnKeyType: 'done', returnKeyLabel: 'Listo', inputAccessoryViewID: ios ? accessoryId('year') : undefined }} />
      {/* Después del campo Año, que ya está montado: así su barra lo encuentra */}
      <KeyboardBar a={a} s={s} flow={flow} field="year" />
    </Card>
  );
}

// Barra fija encima de las pestañas con la calificación en vivo. Tocarla baja al resultado completo;
// si hay valores inválidos, lleva al primero. Android: con el teclado abierto se compacta encima de él.
export function LiveScoreBar({ a, flow }) {
  const { r, bad } = a.live;
  const nBad = bad.filter(Boolean).length;
  const nWarn = flow.issues.filter(x => x && !x.bad).length;
  const compact = android && flow.keyboard;
  const hidden = !flow.barShown || (ios && flow.keyboard); // en iOS el teclado la tapa y su barra muestra la calificación
  const [tierBg, tierFg] = r ? TIER_STYLE[r.tier.name] : [];
  const label = r
    ? `Calidad estimada ${r.quality.toFixed(1)} de 10, gama ${r.tier.name}${nWarn ? `, ${count(nWarn, 'valor', 'valores')} fuera de rango` : ''}. Toca para ver el resultado completo.`
    : `${count(nBad, 'valor', 'valores')} por revisar. Toca para ir al primero.`;

  return (
    <TabDock>
      <Animated.View
        aria-hidden={hidden}
        style={{
          margin: BAR_GAP, borderRadius: R.md, boxShadow: '0 8px 24px rgba(32,21,29,0.28)', pointerEvents: hidden ? 'none' : 'auto',
          opacity: flow.barAnim, transform: [{ translateY: flow.barAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }}>
        <Pressable onPress={r ? flow.scrollToResult : flow.goToFirstIssue} android_ripple={SAND_RIPPLE}
          accessibilityRole="button" accessibilityLabel={label}
          style={({ pressed }) => ({
            minHeight: compact ? BAR_COMPACT_H : BAR_H, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18,
            borderRadius: R.md, overflow: 'hidden', backgroundColor: C.ink, opacity: ios && pressed ? 0.88 : 1,
          })}>
          {r ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={{ fontFamily: F.display, fontSize: compact ? 24 : 30, color: C.white, fontVariant: ['tabular-nums'] }}>{r.quality.toFixed(1)}</Text>
                <Text style={{ fontFamily: F.displayMd, fontSize: 14, color: C.sage }}>/ 10</Text>
              </View>
              <View style={{ flex: 1, gap: 7 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ backgroundColor: tierBg, borderRadius: R.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 2 }}>
                    <Text style={{ fontFamily: F.bodySb, fontSize: 12, color: tierFg }}>{r.tier.name}</Text>
                  </View>
                  {nWarn > 0 && <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.bodyMd, fontSize: 12, color: C.sand }}>{nWarn} fuera de rango</Text>}
                </View>
                {!compact && <ScoreBar value={r.quality} />}
              </View>
              {!compact && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Text style={{ fontFamily: F.bodySb, fontSize: 14, color: C.sand }}>Ver</Text>
                  <Icon name="down" size={18} color={C.sand} />
                </View>
              )}
            </>
          ) : (
            <>
              <View style={{ minWidth: 28, height: 28, borderRadius: 14, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: C.mauve }}>
                <Text style={{ fontFamily: F.bodySb, fontSize: 14, color: C.white }}>{nBad}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bodySb, fontSize: 15, color: C.white }}>Revisa {count(nBad, 'valor', 'valores')}</Text>
                {!compact && <Text style={{ fontFamily: F.body, fontSize: 12, color: C.sage }}>La calificación vuelve al corregir{nBad === 1 ? 'lo' : 'los'}.</Text>}
              </View>
              <Text style={{ fontFamily: F.bodySb, fontSize: 14, color: C.sand }}>Ir</Text>
              <Icon name="chevron" size={18} color={C.sand} />
            </>
          )}
        </Pressable>
      </Animated.View>
    </TabDock>
  );
}
