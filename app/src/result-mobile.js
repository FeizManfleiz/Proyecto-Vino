// Resultado en la pestaña Analizar del celular: un resumen vino arriba (calificación, gama y barra), el detalle en una
// tarjeta clara debajo y el acceso corto a la pestaña Mejorar (las recomendaciones y el simulador viven ahí:
// improve-mobile.js). La web sigue con ResultCard/RecsCard de analysis-ui.js.
import { Platform, Pressable, Text, View } from 'react-native';
import { SCALES } from './analysis-ui';
import { Button, Card, Icon, Kicker, P, RIPPLE, ScoreBar, TIER_STYLE } from './components';
import model from './model.json';
import { potentialGain } from './mobile-logic';
import { reportBody } from './pdf';
import { C, F, R } from './theme';
import { LABELS } from './wine-data';

const ios = Platform.OS === 'ios';
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

      <Button icon="share" label="Compartir reporte PDF" style={{ marginTop: 20 }} spinner loadingLabel="Generando PDF…"
        loading={pdfBusy === REPORT} disabled={!!pdfBusy && pdfBusy !== REPORT}
        onPress={() => onPdf(REPORT, reportBody(model, LABELS, a.values, r, recs), { dated: true })} />
    </Card>
  );
}

// Acceso corto a Mejorar, donde antes estaba "Cómo mejorar este vino". Sin resultado no aparece: el resumen ya dice
// qué valores revisar.
export function ImproveLink({ a, onPress }) {
  const { r, recs } = a.live;
  if (!r) return null;
  const n = recs.filter(k => a.sim.has(k.feature)).length;
  const [title, sub] = !recs.length
    ? ['Ya está cerca de la gama alta', 'Ver en Mejorar']
    : a.simulated
      ? [`Simulando ${count(n, 'ajuste', 'ajustes')}: ${r.quality.toFixed(1)} → ${a.simulated.r.quality.toFixed(1)}`, 'Ver en Mejorar']
      : [`Hasta +${potentialGain(recs).toFixed(2)} pts`, 'Ver cómo mejorarlo'];
  return (
    <Pressable onPress={onPress} android_ripple={RIPPLE} accessibilityRole="button" accessibilityLabel={`${title.replace('+', 'más ')}. ${sub}`}
      accessibilityHint="Abre la pestaña Mejorar"
      style={({ pressed }) => ({
        minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14,
        borderRadius: R.lg, overflow: 'hidden', borderWidth: 1, borderColor: C.line, backgroundColor: ios && pressed ? C.cream : C.white,
      })}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${C.olive}1a`, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="trend" color={C.olive} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: F.display, fontSize: 22, lineHeight: 28, color: C.olive, fontVariant: ['tabular-nums'] }}>{title}</Text>
        <Text style={{ fontFamily: F.bodySb, fontSize: 15, color: C.ink }}>{sub}</Text>
      </View>
      <Icon name="chevron" size={18} color={C.muted} />
    </Pressable>
  );
}
