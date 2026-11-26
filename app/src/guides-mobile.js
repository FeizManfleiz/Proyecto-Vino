// Guías en PDF de la pestaña Guías (sólo celular; la web sigue con GuidesCard de analysis-ui.js).
// Tocar una guía la genera y abre el menú del sistema para compartirla (WhatsApp, correo, Archivos…). Mientras se
// genera, su fila muestra un indicador girando y "Generando PDF…", y las demás esperan.
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { GUIDES } from './analysis-ui';
import { Card, Icon, RIPPLE } from './components';
import { C, F, R } from './theme';

const ios = Platform.OS === 'ios';
// Qué trae cada guía (por título; si un título cambia, la fila sólo pierde esta línea)
const ABOUT = {
  'Guía: cómo mejorar tu vino': 'Del viñedo a la botella, con valores de referencia',
  'Guía: química del vino': 'Las 11 variables del análisis y qué dicen del vino',
  'Guía: cata y maridaje': 'Cómo catar, maridajes y temperaturas de servicio',
};
// "Guía: cómo mejorar tu vino" → "Cómo mejorar tu vino" (la pestaña ya se llama Guías)
const short = title => {
  const t = title.replace(/^Guía:\s*/, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

function GuideRow({ g, first, busy, waiting, onPress }) {
  return (
    <Pressable onPress={onPress} disabled={busy || waiting} android_ripple={RIPPLE}
      accessibilityRole="button" accessibilityLabel={`Compartir ${g.title} en PDF`} accessibilityState={{ busy, disabled: waiting }}
      style={({ pressed }) => ({
        minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 16,
        borderTopWidth: first ? 0 : 1, borderTopColor: C.line, opacity: waiting ? 0.5 : 1,
        backgroundColor: ios && pressed ? C.cream : 'transparent',
      })}>
      <View style={{ width: 44, height: 44, borderRadius: R.sm, backgroundColor: C.sage, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="file" color={C.wine} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: F.bodySb, fontSize: 16, color: C.ink }}>{short(g.title)}</Text>
        <Text style={{ fontFamily: busy ? F.bodyMd : F.body, fontSize: 13, color: busy ? C.wine : C.muted }}>
          {busy ? 'Generando PDF…' : ABOUT[g.title] ?? 'PDF para compartir'}
        </Text>
      </View>
      <View style={{ width: 24, alignItems: 'center' }}>
        {busy ? <ActivityIndicator size="small" color={C.wine} /> : <Icon name="share" color={C.wine} />}
      </View>
    </Pressable>
  );
}

export function GuideList({ pdfBusy, onPdf }) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {GUIDES.map((g, i) => (
        <GuideRow key={g.title} g={g} first={i === 0} busy={pdfBusy === g.title} waiting={!!pdfBusy && pdfBusy !== g.title}
          onPress={() => onPdf(g.title, g.body)} />
      ))}
      <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 19, color: C.muted, padding: 16, borderTopWidth: 1, borderTopColor: C.line }}>
        Al terminar se abre el menú para enviarla por WhatsApp o correo, o guardarla en Archivos. Funciona sin internet.
      </Text>
    </Card>
  );
}
