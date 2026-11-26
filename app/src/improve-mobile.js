// Pestaña Mejorar del celular: el vino que se está mejorando, el simulador en una hoja que sube desde abajo, las
// recomendaciones y el aviso tras "Aplicar al formulario". La web sigue con RecsCard de analysis-ui.js.
import { AccessibilityInfo, Platform, Pressable, Text, View } from 'react-native';
import Animated, { cubicBezier, Easing, FadeInDown, FadeOutDown, ReduceMotion } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CHIP, GUIDES } from './analysis-ui';
import { Button, Card, Icon, IMG, Kicker, P, RIPPLE, ScoreBar, TabHeader, TIER_STYLE } from './components';
import model from './model.json';
import { percentile } from './model-core';
import { potentialGain, wineTitle } from './mobile-logic';
import { TabDock } from './mobile-ui';
import { useReducedMotion } from './motion';
import { fmt } from './pdf';
import { Sheet } from './sheet';
import { C, F, R } from './theme';
import { shortLabel, unit } from './wine-data';

const ios = Platform.OS === 'ios';
const SAND_RIPPLE_ROUND = { color: 'rgba(211,190,145,0.24)', borderless: true, radius: 22 };
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const kind = r => (r.isRed ? 'tintos' : 'blancos');

// El aviso entra desde abajo, el mismo eje por el que baja la hoja del simulador, y sale más rápido de lo que entra.
// Espera 100 ms a que la hoja empiece a bajar. Con "reducir movimiento" el sistema lo muestra sin animar.
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const TOAST_IN = FadeInDown.duration(250).delay(100).easing(EASE_OUT).withInitialValues({ transform: [{ translateY: 16 }] }).reduceMotion(ReduceMotion.System);
const TOAST_OUT = FadeOutDown.duration(150).easing(EASE_OUT).reduceMotion(ReduceMotion.System);
export const TOAST_SPACE = 160; // aire al final de la pestaña mientras el aviso está a la vista

// Estado del simulador en una línea: lo que se ganaría aplicando todo o lo que se está simulando
export function simStatus(a) {
  const { r, recs } = a.live;
  const n = recs.filter(k => a.sim.has(k.feature)).length;
  return a.simulated
    ? `Simulando ${count(n, 'ajuste', 'ajustes')}: ${r.quality.toFixed(1)} → ${a.simulated.r.quality.toFixed(1)}`
    : `Hasta +${potentialGain(recs).toFixed(2)} pts si aplicas todo`;
}

// Encabezado: el vino que se está mejorando (calificación actual y gama) y el botón del simulador
export function ImproveHeader({ a, onOpenSim }) {
  return (
    <TabHeader source={IMG.vineyardSun} kicker="Para el productor" title="Mejorar.">
      <WineCard a={a} onOpenSim={onOpenSim} />
    </TabHeader>
  );
}

// Fondo tinta casi sólido (el de los chips del encabezado): el texto no depende de la foto de abajo.
// Sin resultado (valores inválidos) dice cuántos revisar; el cuerpo explica qué hacer.
function WineCard({ a, onOpenSim }) {
  const { r, recs, bad } = a.live;
  const title = wineTitle(a.base, a.edited);
  if (!r) {
    const n = bad.filter(Boolean).length;
    return (
      <View accessible style={{ ...CHIP, borderRadius: R.md, padding: 16, marginTop: 16 }}>
        <Kicker color={C.sage} style={{ marginBottom: 4 }}>MEJORANDO</Kicker>
        <Text numberOfLines={1} style={{ fontFamily: F.bodySb, fontSize: 16, color: C.white }}>{title}</Text>
        <Text style={{ fontFamily: F.bodyMd, fontSize: 15, lineHeight: 22, color: C.sand, marginTop: 6 }}>
          Sin calificación: {count(n, 'valor', 'valores')} por revisar
        </Text>
      </View>
    );
  }
  const [tierBg, tierFg] = TIER_STYLE[r.tier.name];
  const q = r.quality.toFixed(1);
  const type = r.isRed ? 'Tinto' : 'Blanco';
  const status = simStatus(a);
  return (
    <View style={{ ...CHIP, borderRadius: R.md, padding: 16, marginTop: 16 }}>
      <View accessible accessibilityLabel={`Mejorando ${title}. Calidad actual ${q} de 10, gama ${r.tier.name}, ${type.toLowerCase()}.`}>
        <Kicker color={C.sage} style={{ marginBottom: 4 }}>MEJORANDO</Kicker>
        <Text numberOfLines={1} style={{ fontFamily: F.bodySb, fontSize: 16, color: C.white }}>{title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 12, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ fontFamily: F.display, fontSize: 40, lineHeight: 50, color: C.white, fontVariant: ['tabular-nums'] }}>{q}</Text>
            <Text style={{ fontFamily: F.displayMd, fontSize: 16, color: C.sage }}>/ 10</Text>
          </View>
          <View style={{ backgroundColor: tierBg, borderRadius: R.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 4 }}>
            <Text style={{ fontFamily: F.bodySb, fontSize: 13, color: tierFg }}>Gama {r.tier.name}</Text>
          </View>
          <Text style={{ fontFamily: F.bodyMd, fontSize: 14, color: C.sage }}>{type}</Text>
        </View>
        <View style={{ marginTop: 8 }}><ScoreBar value={r.quality} /></View>
      </View>

      {recs.length > 0 ? (
        <Pressable onPress={onOpenSim} android_ripple={RIPPLE} accessibilityRole="button"
          accessibilityLabel={`Simulador de mejoras. ${status}`} accessibilityHint="Abre el simulador"
          style={({ pressed }) => ({
            minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12, marginTop: 16,
            borderRadius: R.md, overflow: 'hidden', backgroundColor: C.sand, opacity: ios && pressed ? 0.85 : 1,
          })}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(32,21,29,0.1)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="sliders" color={C.ink} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: F.bodySb, fontSize: 16, color: C.ink }}>Simulador de mejoras</Text>
            <Text style={{ fontFamily: F.bodyMd, fontSize: 14, color: C.ink }}>{status}</Text>
          </View>
          <Icon name="chevron" size={18} color={C.ink} />
        </Pressable>
      ) : (
        <Text style={{ fontFamily: F.bodyMd, fontSize: 14, lineHeight: 21, color: C.sand, marginTop: 12 }}>Sin ajustes prioritarios.</Text>
      )}
    </View>
  );
}

// Una recomendación para leer: ganancia, de cuánto a cuánto y los pasos. Los ajustes se eligen en el simulador.
function Rec({ k, on }) {
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: C.line, paddingVertical: 16, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ flex: 1, fontFamily: F.bodySb, fontSize: 17, color: C.ink }}>{k.direction}: {shortLabel(k.feature)}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 24, color: C.olive }}>+{k.gain.toFixed(2)}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Text style={{ fontFamily: F.bodyMd, fontSize: 14, color: C.wine }}>
          Actual {fmt(k.current)} → meta {fmt(k.target)} {unit(k.feature)}
        </Text>
        {on && (
          <View style={{ backgroundColor: C.olive, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 2 }}>
            <Text style={{ fontFamily: F.bodySb, fontSize: 12, color: C.white }}>Simulando</Text>
          </View>
        )}
      </View>
      {k.steps.map(st => (
        <View key={st} style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <Text style={{ color: C.olive, fontFamily: F.bodySb }}>•</Text>
          <Text style={{ flex: 1, fontFamily: F.body, fontSize: 14, lineHeight: 21, color: C.ink }}>{st}</Text>
        </View>
      ))}
    </View>
  );
}

// Cuerpo de Mejorar: qué ajustar, con sus pasos, y la guía para el productor
export function ImproveList({ a, pdfBusy, onPdf }) {
  const { r, recs } = a.live;
  return (
    <Card style={{ padding: 20 }}>
      <Kicker color={C.olive}>QUÉ AJUSTAR</Kicker>
      <P size={15} color={recs.length ? C.muted : C.ink} style={{ marginBottom: recs.length ? 8 : 16 }}>
        {recs.length
          ? `Comparado con el promedio de los ${kind(r)} con calidad ≥ 7.`
          : 'Este vino ya está cerca del perfil de los vinos de calidad alta.'}
      </P>
      {recs.map(k => <Rec key={k.feature} k={k} on={a.sim.has(k.feature)} />)}
      <Button kind="outline" tone="wine" icon="share" label="Guía completa para el productor (PDF)" style={{ marginTop: 8 }}
        spinner loadingLabel="Generando PDF…" loading={pdfBusy === GUIDES[0].title} disabled={!!pdfBusy && pdfBusy !== GUIDES[0].title}
        onPress={() => onPdf(GUIDES[0].title, GUIDES[0].body)} />
    </Card>
  );
}

// Valores inválidos en Analizar: no hay calificación que mejorar todavía (el encabezado dice cuántos revisar)
export function ImproveEmpty({ onGo }) {
  return (
    <Card style={{ padding: 20 }}>
      <Kicker>PRIMERO, EL ANÁLISIS</Kicker>
      <P size={16}>Corrige los valores marcados en Analizar. En cuanto estén bien, aquí verás qué ajustar para subir la calificación.</P>
      <Button label="Ir a Analizar" icon="flask" style={{ marginTop: 16, alignSelf: 'flex-start' }} onPress={onGo} />
    </Card>
  );
}

// Tras "Aplicar al formulario": de cuánto a cuánto quedó y el camino de vuelta a Analizar para ver el resultado.
// `applied`: { from } con la calificación de antes, o null. Se va con la X, con "Ver en Analizar", al abrir otra vez el
// simulador o al salir de la pestaña; no tiene temporizador, para que el lector de pantalla alcance a llegar a él.
export function AppliedToast({ a, applied, onView, onClose }) {
  const { r } = a.live;
  return (
    <TabDock>
      {applied && r ? (
        <Animated.View entering={TOAST_IN} exiting={TOAST_OUT}
          style={{ margin: 12, padding: 14, gap: 12, borderRadius: R.md, backgroundColor: C.ink, boxShadow: '0 8px 24px rgba(32,21,29,0.28)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.olive, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={18} color={C.white} />
            </View>
            <View accessible style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: F.bodySb, fontSize: 15, color: C.white }}>Ajustes aplicados</Text>
              <Text style={{ fontFamily: F.bodyMd, fontSize: 13, color: C.sand, fontVariant: ['tabular-nums'] }}>
                Calidad {applied.from.toFixed(1)} → {r.quality.toFixed(1)} · Gama {r.tier.name}
              </Text>
            </View>
            <Pressable onPress={onClose} android_ripple={SAND_RIPPLE_ROUND} accessibilityRole="button" accessibilityLabel="Cerrar aviso"
              style={({ pressed }) => ({
                width: 48, height: 48, borderRadius: 24, marginRight: -6, alignItems: 'center', justifyContent: 'center',
                backgroundColor: ios && pressed ? 'rgba(255,255,255,0.12)' : 'transparent',
              })}>
              <Icon name="x" color={C.white} />
            </Pressable>
          </View>
          <Button tone="sand" icon="flask" label="Ver en Analizar" a11y="Ver el resultado en Analizar" onPress={onView} />
        </Animated.View>
      ) : null}
    </TabDock>
  );
}

// Barra de dos tonos: la calificación actual en salvia y, encima del arena, lo que se ganaría.
// Sólo el relleno cambia de ancho (absoluto y sin hijos), con una transición corta al marcar un ajuste.
function CompareBar({ now, next, reduced }) {
  const fill = v => ({
    position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4, width: `${Math.max(0, Math.min(100, v * 10))}%`,
    transitionProperty: 'width', transitionDuration: reduced ? 0 : 200, transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
  });
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden', marginTop: 12 }}>
      <Animated.View style={[fill(next ?? now), { backgroundColor: C.sand }]} />
      <Animated.View style={[fill(now), { backgroundColor: C.sage }]} />
    </View>
  );
}

// Un ajuste del simulador: toda la fila es la casilla
function SimOption({ k, on, first, onPress }) {
  const u = unit(k.feature);
  return (
    <Pressable onPress={onPress} android_ripple={RIPPLE} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
      accessibilityLabel={`${k.direction} ${shortLabel(k.feature)}, de ${fmt(k.current)} a ${fmt(k.target)} ${u}, más ${k.gain.toFixed(2)} puntos`}
      style={({ pressed }) => ({
        minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 4,
        borderTopWidth: first ? 0 : 1, borderTopColor: C.line, backgroundColor: ios && pressed ? C.cream : 'transparent',
      })}>
      <View style={{
        width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: C.olive, alignItems: 'center', justifyContent: 'center',
        backgroundColor: on ? C.olive : C.white,
      }}>
        {on && <Icon name="check" size={16} color={C.white} />}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: F.bodySb, fontSize: 16, color: C.ink }}>{k.direction}: {shortLabel(k.feature)}</Text>
        <Text style={{ fontFamily: F.bodyMd, fontSize: 13, color: C.muted }}>{fmt(k.current)} → {fmt(k.target)} {u}</Text>
      </View>
      <Text style={{ fontFamily: F.display, fontSize: 22, color: C.olive }}>+{k.gain.toFixed(2)}</Text>
    </Pressable>
  );
}

// El simulador: elegir ajustes, ver la calificación que tendría el vino y pasarlos al formulario de Analizar.
// `onApplied(from)` recibe la calificación de antes de aplicar.
export function SimulatorSheet({ a, visible, onClose, onApplied }) {
  const reduced = useReducedMotion();
  const { r, recs } = a.live;
  const { sim, simulated } = a;
  const n = recs.filter(k => sim.has(k.feature)).length;

  const apply = () => {
    const from = r.quality;
    const to = simulated.r.quality;
    a.applySim();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); // acompaña al cambio visible, nunca lo sustituye
    AccessibilityInfo.announceForAccessibility(`Ajustes aplicados al formulario. Calidad ${to.toFixed(1)}.`);
    onClose();
    onApplied?.(from);
  };

  let body = null;
  if (r) {
    const q = r.quality.toFixed(1);
    const sq = simulated?.r.quality.toFixed(1);
    const summary = simulated
      ? `Actual ${q}, con ajustes ${sq}, más ${(simulated.r.quality - r.quality).toFixed(2)} puntos, gama ${simulated.r.tier.name}`
      : `Actual ${q}. Elige uno o varios ajustes.`;
    body = (
      <>
        <View accessible accessibilityLabel={summary} accessibilityLiveRegion="polite"
          style={{ backgroundColor: C.ink, borderRadius: R.md, padding: 18, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
            <View>
              <Text style={{ fontFamily: F.bodySb, fontSize: 12, color: C.sage }}>Actual</Text>
              <Text style={{ fontFamily: F.display, fontSize: 36, lineHeight: 44, color: C.sage, fontVariant: ['tabular-nums'] }}>{q}</Text>
            </View>
            <View style={{ marginBottom: 12 }}><Icon name="chevron" color={C.sand} /></View>
            <View>
              <Text style={{ fontFamily: F.bodySb, fontSize: 12, color: C.sand }}>Con ajustes</Text>
              {/* Sin ajustes elegidos queda igual que la actual, atenuada */}
              <Text style={{ fontFamily: F.display, fontSize: 48, lineHeight: 56, color: sq ? C.white : 'rgba(255,255,255,0.35)', fontVariant: ['tabular-nums'] }}>{sq ?? q}</Text>
            </View>
            {simulated && (
              <Text style={{ flexShrink: 1, fontFamily: F.bodySb, fontSize: 16, color: C.sand, marginBottom: 10 }}>
                +{(simulated.r.quality - r.quality).toFixed(2)}
              </Text>
            )}
          </View>
          <CompareBar now={r.quality} next={simulated?.r.quality} reduced={reduced} />
          <Text style={{ fontFamily: F.bodyMd, fontSize: 14, color: C.sand, marginTop: 10 }}>
            {simulated
              ? `Gama ${simulated.r.tier.name} · mejor que el ${percentile(model, simulated.r.quality, r.isRed)}%`
              : 'Elige uno o varios ajustes'}
          </Text>
        </View>
        <P size={14} color={C.muted} style={{ marginTop: 16, marginBottom: 4 }}>
          Marca los ajustes que harías; la calificación se recalcula al momento.
        </P>
        {recs.map((k, i) => (
          <SimOption key={k.feature} k={k} on={sim.has(k.feature)} first={i === 0} onPress={() => a.toggleSim(k.feature)} />
        ))}
      </>
    );
  }

  return (
    <Sheet visible={visible && !!r} onClose={onClose} title="Simulador de mejoras" closeLabel="Cerrar simulador"
      footer={(
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button kind="outline" tone="wine" label="Limpiar" onPress={a.clearSim} disabled={!n} />
          <Button icon="check" label="Aplicar al formulario" onPress={apply} disabled={!n} style={{ flex: 1, paddingHorizontal: 16 }} />
        </View>
      )}>
      {body}
    </Sheet>
  );
}
