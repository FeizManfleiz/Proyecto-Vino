// Resultado en la pestaña Analizar del celular: un resumen vino arriba (calificación, gama y barra), el detalle en una
// tarjeta clara debajo, "Cómo mejorar este vino" y el simulador en una hoja que sube desde abajo.
// La web sigue con ResultCard/RecsCard de analysis-ui.js.
import { AccessibilityInfo, Platform, Pressable, Text, View } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { GUIDES, SCALES } from './analysis-ui';
import { Button, Card, Faded, H, Icon, IMG, Kicker, P, RIPPLE, ScoreBar, TIER_STYLE } from './components';
import model from './model.json';
import { percentile } from './model-core';
import { useReducedMotion } from './motion';
import { fmt, reportBody } from './pdf';
import { Sheet } from './sheet';
import { C, F, R } from './theme';
import { LABELS, shortLabel, unit } from './wine-data';

const ios = Platform.OS === 'ios';
const SAND_RIPPLE = { color: 'rgba(211,190,145,0.24)' };
const REPORT = 'Reporte de predicción';
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const kind = r => (r.isRed ? 'tintos' : 'blancos');

// Resumen: lo primero que se lee. Sin resultado, dice cuántos valores revisar y lleva al primero.
export function ResultSummary({ a, onFix }) {
  const { r, pct, bad } = a.live;
  if (!r) {
    const n = bad.filter(Boolean).length;
    return (
      <View style={{ backgroundColor: C.wine, borderRadius: R.lg, padding: 20 }}>
        <Kicker color={C.sand}>CALIDAD ESTIMADA</Kicker>
        <P size={16} color={C.white}>Revisa {count(n, 'valor marcado', 'valores marcados')} para ver tu resultado.</P>
        <Button tone="sand" label="Ir al primero" onPress={onFix} style={{ alignSelf: 'flex-start', marginTop: 16 }} />
      </View>
    );
  }
  const [tierBg, tierFg] = TIER_STYLE[r.tier.name];
  const q = r.quality.toFixed(1);
  return (
    <View accessible accessibilityLabel={`Calidad estimada ${q} de 10, gama ${r.tier.name}. Mejor que el ${pct}% de los ${kind(r)} analizados.`}
      style={{ backgroundColor: C.wine, borderRadius: R.lg, padding: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Kicker color={C.sand} style={{ marginBottom: 0 }}>CALIDAD ESTIMADA</Kicker>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.sage }} />
          <Text style={{ fontFamily: F.bodyMd, fontSize: 12, color: C.sage }}>En vivo</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
          <Text style={{ fontFamily: F.display, fontSize: 88, lineHeight: 100, color: C.white, fontVariant: ['tabular-nums'] }}>{q}</Text>
          <Text style={{ fontFamily: F.displayMd, fontSize: 24, color: C.sage, marginBottom: 16 }}>/ 10</Text>
        </View>
        <View style={{ backgroundColor: tierBg, borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 20 }}>
          <Text style={{ fontFamily: F.bodySb, fontSize: 14, color: tierFg }}>Gama {r.tier.name}</Text>
        </View>
      </View>
      <ScoreBar value={r.quality} />
      <Text style={{ fontFamily: F.bodySb, color: C.sand, fontSize: 15, marginTop: 14 }}>
        Mejor que el {pct}% de los {kind(r)} analizados
      </Text>
    </View>
  );
}

// Medidor sobre fondo claro: segmentos vino sobre la línea de las tarjetas
function Meter({ label, value }) {
  const scale = SCALES[label];
  const idx = scale.indexOf(value);
  return (
    <View style={{ marginBottom: 14 }} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontFamily: F.bodySb, color: C.muted, fontSize: 13, letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
        <Text style={{ fontFamily: F.bodyMd, color: C.ink, fontSize: 14 }}>{value}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {scale.map((_, i) => <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= idx ? C.wine : C.line }} />)}
      </View>
    </View>
  );
}

// Detalle: tipo, gama, perfil de sabor, maridaje y el reporte PDF
export function ResultDetail({ a, pdfBusy, onPdf }) {
  const { r, recs } = a.live;
  if (!r) return null;
  return (
    <Card style={{ padding: 20 }}>
      <Text style={{ fontFamily: F.bodySb, fontSize: 16, color: C.ink }}>
        {r.isRed ? 'Tinto' : 'Blanco'} · {(r.pRed * 100).toFixed(0)}% prob. tinto
      </Text>
      <P size={15} color={C.muted} style={{ marginTop: 4 }}>{r.tier.desc}</P>

      <Kicker style={{ marginTop: 20 }}>PERFIL DE SABOR</Kicker>
      <Meter label="Dulzor" value={r.flavor.dulzor} />
      <Meter label="Acidez" value={r.flavor.acidez} />
      <Meter label="Cuerpo" value={r.flavor.cuerpo} />
      {r.flavor.notes.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
          {r.flavor.notes.map(n => (
            <View key={n} style={{ maxWidth: '100%', borderWidth: 1, borderColor: C.line, backgroundColor: C.cream, borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 5 }}>
              <Text style={{ fontFamily: F.body, color: C.ink, fontSize: 13 }}>{n}</Text>
            </View>
          ))}
        </View>
      )}

      <Kicker color={C.olive} style={{ marginTop: 20, marginBottom: 4 }}>MARIDAJE</Kicker>
      <P size={16}>{r.flavor.pairing}</P>

      <Button icon="download" label="Descargar reporte PDF" style={{ marginTop: 20 }}
        loading={pdfBusy === REPORT} onPress={() => onPdf(REPORT, reportBody(model, LABELS, a.values, r, recs))} />
    </Card>
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

// "Cómo mejorar este vino": el botón del simulador arriba y las recomendaciones debajo
export function ImproveCard({ a, pdfBusy, onPdf, onOpenSim }) {
  const { r, recs } = a.live;
  const { sim, simulated } = a;
  if (!r) return null;
  const total = recs.reduce((s, k) => s + k.gain, 0).toFixed(2);
  const n = recs.filter(k => sim.has(k.feature)).length;
  const status = simulated
    ? `Simulando ${count(n, 'ajuste', 'ajustes')}: ${r.quality.toFixed(1)} → ${simulated.r.quality.toFixed(1)}`
    : `Hasta +${total} pts si aplicas todo`;
  return (
    <Faded source={IMG.vineyardSun} color={C.white} opacity={0.94} style={{ borderRadius: R.lg, padding: 20, borderWidth: 1, borderColor: C.line }}>
      <Kicker color={C.olive}>PARA EL PRODUCTOR</Kicker>
      <H size={28}>Cómo mejorar este vino.</H>
      <P size={15} color={C.muted} style={{ marginTop: 6, marginBottom: 16 }}>
        Comparado con el promedio de los {kind(r)} con calidad ≥ 7.
      </P>

      {recs.length === 0 ? (
        <P size={16} style={{ marginBottom: 16 }}>Este vino ya está cerca del perfil de los vinos de calidad alta. No hay ajustes prioritarios.</P>
      ) : (
        <>
          <Pressable onPress={onOpenSim} android_ripple={SAND_RIPPLE} accessibilityRole="button"
            accessibilityLabel={`Simulador de mejoras. ${status}`} accessibilityHint="Abre el simulador"
            style={({ pressed }) => ({
              minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8,
              borderRadius: R.md, overflow: 'hidden', backgroundColor: C.ink, opacity: ios && pressed ? 0.88 : 1,
            })}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(211,190,145,0.16)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="flask" color={C.sand} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: F.bodySb, fontSize: 16, color: C.white }}>Simulador de mejoras</Text>
              <Text style={{ fontFamily: F.bodyMd, fontSize: 14, color: simulated ? C.sand : C.sage }}>{status}</Text>
            </View>
            <Icon name="chevron" size={18} color={C.sand} />
          </Pressable>
          {recs.map(k => <Rec key={k.feature} k={k} on={sim.has(k.feature)} />)}
        </>
      )}

      <Button kind="outline" tone="wine" icon="download" label="Guía completa para el productor (PDF)" style={{ marginTop: 8 }}
        loading={pdfBusy === GUIDES[0].title} onPress={() => onPdf(GUIDES[0].title, GUIDES[0].body)} />
    </Faded>
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

// El simulador: elegir ajustes, ver la calificación que tendría el vino y pasarlos al formulario
export function SimulatorSheet({ a, visible, onClose }) {
  const reduced = useReducedMotion();
  const { r, recs } = a.live;
  const { sim, simulated } = a;
  const n = recs.filter(k => sim.has(k.feature)).length;

  const apply = () => {
    a.applySim();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); // acompaña al cambio visible, nunca lo sustituye
    AccessibilityInfo.announceForAccessibility('Ajustes aplicados al formulario');
    onClose();
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
