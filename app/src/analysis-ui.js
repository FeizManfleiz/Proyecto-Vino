// Tarjetas del análisis, compartidas por el dashboard web (Predictor.js) y las pestañas del celular.
// Su diseño es el del dashboard original; reciben `wide`/`pad` para adaptarse igual que antes.
import { Pressable, Text, View } from 'react-native';
import { Button, Card, Faded, Field, H, Icon, IMG, Kicker, Logo, P, RIPPLE, RIPPLE_ROUND, ScoreBar, Segmented, TIER_STYLE } from './components';
import model from './model.json';
import { percentile } from './model-core';
import { fmt, guides, reportBody } from './pdf';
import { C, F, R, web } from './theme';
import { wineLabel } from './wines';
import { LABELS, PRESETS, shortLabel, unit } from './wine-data';

const TYPES = [['Auto', undefined], ['Tinto', 1], ['Blanco', 0]];
// Niveles en orden de intensidad, para los medidores
const SCALES = {
  Dulzor: ['Seco', 'Semiseco', 'Semidulce', 'Dulce'],
  Acidez: ['Baja (suave)', 'Media', 'Alta (vibrante)'],
  Cuerpo: ['Ligero', 'Medio', 'Robusto'],
};
export const GUIDES = guides(model, LABELS);

function Meter({ label, value }) {
  const scale = SCALES[label];
  const idx = scale.indexOf(value);
  return (
    <View style={{ marginBottom: 14 }} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontFamily: F.bodySb, color: C.sage, fontSize: 13, letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
        <Text style={{ fontFamily: F.bodyMd, color: C.white, fontSize: 14 }}>{value}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {scale.map((_, i) => (
          <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= idx ? C.sand : 'rgba(255,255,255,0.15)' }} />
        ))}
      </View>
    </View>
  );
}

// Chips del encabezado: vinos guardados y mejor calificación
export function StatChips({ history, best }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
      {[
        [`${history.length}`, history.length === 1 ? 'vino guardado' : 'vinos guardados'],
        [best ? best.quality.toFixed(1) : '—', 'tu mejor calificación'],
      ].map(([v, l]) => (
        <View key={l} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 6 }}>
          <Text style={{ fontFamily: F.display, fontSize: 18, color: C.sand }}>{v}</Text>
          <Text style={{ fontFamily: F.bodyMd, fontSize: 13, color: C.white }}>{l}</Text>
        </View>
      ))}
    </View>
  );
}

// Consejo de bienvenida (se muestra hasta que se cierra una vez)
export function Tip({ onClose }) {
  return (
    <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.sand, borderRadius: R.md, paddingVertical: 14, paddingLeft: 18, paddingRight: 6 }}>
      <Icon name="bulb" color={C.ink} />
      <Text style={{ flex: 1, fontFamily: F.bodyMd, fontSize: 15, color: C.ink, lineHeight: 22 }}>
        Todo se calcula en vivo: cambia cualquier valor y mira cómo se mueve la calificación. Después usa el simulador para ver cuánto ganaría tu vino.
      </Text>
      <Pressable onPress={onClose} android_ripple={RIPPLE_ROUND} accessibilityRole="button" accessibilityLabel="Cerrar consejo"
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', cursor: web ? 'pointer' : undefined }}>
        <Icon name="x" color={C.ink} />
      </Pressable>
    </View>
  );
}

// Formulario: ejemplos, tipo, las 11 mediciones y "Guardar en Mis vinos". `a` = useAnalysis(), `s` = useSaveWine().
export function AnalysisForm({ a, s, wide, pad }) {
  return (
    <Card style={{ padding: pad }}>
      <Kicker>EJEMPLOS</Kicker>
      <Segmented label="Ejemplos" options={Object.keys(PRESETS).map(k => [k, k])} value={a.preset} onChange={k => a.loadValues(PRESETS[k], k)} />
      <Kicker style={{ marginTop: 20 }}>TIPO DE VINO</Kicker>
      <Segmented label="Tipo de vino" options={TYPES} value={a.type} onChange={a.setType} />

      <Kicker style={{ marginTop: 28 }}>ANÁLISIS QUÍMICO</Kicker>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
        {model.features.map((f, i) => (
          <Field key={f} label={LABELS[f]} value={a.values[i]} keyboardType="decimal-pad" error={a.live.bad[i]}
            style={{ flexBasis: wide ? '33.33%' : '50%', paddingHorizontal: 8 }}
            onChangeText={t => a.setField(i, t)} />
        ))}
      </View>
      {a.live.bad.some(Boolean) && (
        <Text accessibilityRole="alert" style={{ fontFamily: F.bodyMd, color: '#b3261e', fontSize: 14, marginBottom: 8 }}>
          Usa números positivos (punto o coma decimal) en los campos marcados.
        </Text>
      )}

      {/* Guardar en "Mis vinos" */}
      <View style={{ borderTopWidth: 1, borderTopColor: C.line, marginTop: 8, paddingTop: 20 }}>
        <Kicker>GUARDAR EN MIS VINOS</Kicker>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 12 : 0, alignItems: wide ? 'flex-end' : 'stretch' }}>
          <Field label="Nombre del vino" value={s.wineName} onChangeText={s.onNameChange}
            placeholder="Ej. Malbec Reserva" maxLength={60} onSubmitEditing={s.onSave}
            style={{ flex: wide ? 1 : undefined, marginBottom: wide ? 0 : 12 }} />
          <Field label="Año de cosecha" value={s.vintage} onChangeText={s.onVintageChange}
            placeholder={String(new Date().getFullYear() - 1)} keyboardType="number-pad" maxLength={4} onSubmitEditing={s.onSave}
            error={s.saveMsg && !s.saveMsg.ok && s.saveMsg.text.startsWith('El año')}
            style={{ width: wide ? 150 : undefined, marginBottom: wide ? 0 : 12 }} />
          <Button label="Guardar" icon="bookmark" onPress={s.onSave} />
        </View>
        {s.saveMsg && (
          <View accessibilityRole="alert" accessibilityLiveRegion="polite"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 12, borderRadius: R.sm, backgroundColor: s.saveMsg.ok ? '#eef0e6' : '#fbeaec' }}>
            <Icon name={s.saveMsg.ok ? 'check' : 'x'} size={18} color={s.saveMsg.ok ? C.olive : C.wine} />
            <Text style={{ flex: 1, fontFamily: F.bodyMd, fontSize: 14, color: s.saveMsg.ok ? C.olive : C.wine }}>{s.saveMsg.text}</Text>
          </View>
        )}
      </View>
    </Card>
  );
}

// Calidad estimada, perfil de sabor, maridaje y reporte PDF
export function ResultCard({ a, pad, pdfBusy, onPdf }) {
  const { r, recs, pct } = a.live;
  const [tierBg, tierFg] = r ? TIER_STYLE[r.tier.name] : [];
  return (
    <View style={{ backgroundColor: C.wine, borderRadius: R.lg, padding: pad, minHeight: 360 }} accessibilityLiveRegion="polite">
      {!r ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <Logo width={200} />
          <P size={16} color={C.sage} style={{ textAlign: 'center' }}>Revisa los valores marcados en rojo para ver tu resultado.</P>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Kicker color={C.sand} style={{ marginBottom: 0 }}>CALIDAD ESTIMADA</Kicker>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.sage }} />
              <Text style={{ fontFamily: F.bodyMd, fontSize: 12, color: C.sage }}>En vivo</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <Text style={{ fontFamily: F.display, fontSize: 112, lineHeight: 120, color: C.white }}>{r.quality.toFixed(1)}</Text>
            <Text style={{ fontFamily: F.displayMd, fontSize: 28, color: C.sage, marginBottom: 18 }}>/ 10</Text>
          </View>
          <ScoreBar value={r.quality} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            <View style={{ backgroundColor: tierBg, borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 6 }}>
              <Text style={{ fontFamily: F.bodySb, color: tierFg, fontSize: 14 }}>Gama {r.tier.name}</Text>
            </View>
            <Text style={{ fontFamily: F.bodyMd, color: C.white, fontSize: 15 }}>
              {r.isRed ? 'Tinto' : 'Blanco'} · {(r.pRed * 100).toFixed(0)}% prob. tinto
            </Text>
          </View>
          <Text style={{ fontFamily: F.bodySb, color: C.sand, fontSize: 15, marginTop: 12 }}>
            Mejor que el {pct}% de los {r.isRed ? 'tintos' : 'blancos'} analizados
          </Text>
          <P size={14} color={C.sage} style={{ marginTop: 4 }}>{r.tier.desc}</P>

          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 20 }} />
          <Meter label="Dulzor" value={r.flavor.dulzor} />
          <Meter label="Acidez" value={r.flavor.acidez} />
          <Meter label="Cuerpo" value={r.flavor.cuerpo} />
          {r.flavor.notes.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {r.flavor.notes.map(n => (
                <View key={n} style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 5 }}>
                  <Text style={{ fontFamily: F.body, color: C.white, fontSize: 13 }}>{n}</Text>
                </View>
              ))}
            </View>
          )}
          <Kicker color={C.sage} style={{ marginTop: 18, marginBottom: 4 }}>MARIDAJE</Kicker>
          <P size={16} color={C.white}>{r.flavor.pairing}</P>

          <Button tone="sand" icon="download" label="Descargar reporte PDF" style={{ marginTop: 24 }}
            loading={pdfBusy === 'Reporte de predicción'}
            onPress={() => onPdf('Reporte de predicción', reportBody(model, LABELS, a.values, r, recs))} />
        </>
      )}
    </View>
  );
}

// "Cómo mejorar este vino": recomendaciones, simulador y guía del productor. No se muestra si hay valores inválidos.
export function RecsCard({ a, wide, pad, pdfBusy, onPdf }) {
  const { r, recs } = a.live;
  const { sim, simulated } = a;
  if (!r) return null;
  return (
    <Faded source={IMG.vineyardSun} color={C.white} opacity={0.94} style={{ borderRadius: R.lg, padding: pad, borderWidth: 1, borderColor: C.line }}>
      <Kicker color={C.olive}>PARA EL PRODUCTOR</Kicker>
      <H size={wide ? 34 : 28}>Cómo mejorar este vino.</H>
      <P size={15} color={C.muted} style={{ marginTop: 6, marginBottom: 16 }}>
        Comparado con el promedio de los {r.isRed ? 'tintos' : 'blancos'} con calidad ≥ 7. Marca "Simular" para ver qué pasaría si aplicas cada ajuste.
      </P>

      {recs.length > 0 && (
        <View style={{ backgroundColor: C.ink, borderRadius: R.md, padding: 18, marginBottom: 8 }} accessibilityLiveRegion="polite">
          <Kicker color={C.sand}>SIMULADOR</Kicker>
          {simulated ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <Text style={{ fontFamily: F.display, fontSize: 36, color: C.sage }}>{r.quality.toFixed(1)}</Text>
                <Icon name="chevron" color={C.sand} />
                <Text style={{ fontFamily: F.display, fontSize: 48, color: C.white }}>{simulated.r.quality.toFixed(1)}</Text>
                <Text style={{ fontFamily: F.bodySb, fontSize: 15, color: C.sand }}>
                  +{(simulated.r.quality - r.quality).toFixed(2)} · Gama {simulated.r.tier.name} · mejor que el {percentile(model, simulated.r.quality, r.isRed)}%
                </Text>
              </View>
              <View style={{ marginTop: 10 }}><ScoreBar value={simulated.r.quality} /></View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                <Button small tone="sand" icon="check" label="Aplicar al formulario" onPress={a.applySim} />
                <Button small kind="outline" tone="white" label="Limpiar" onPress={a.clearSim} />
              </View>
            </>
          ) : (
            <P size={15} color={C.white}>
              Activa una o varias recomendaciones: hasta <Text style={{ fontFamily: F.bodySb, color: C.sand }}>+{recs.reduce((s, k) => s + k.gain, 0).toFixed(2)} pts</Text> si aplicas todas.
            </P>
          )}
        </View>
      )}

      {recs.length === 0 ? (
        <P size={16}>Este vino ya está cerca del perfil de los vinos de calidad alta. No hay ajustes prioritarios.</P>
      ) : recs.map(k => {
        const on = sim.has(k.feature);
        return (
          <View key={k.feature} style={{ borderTopWidth: 1, borderTopColor: C.line, paddingVertical: 16, flexDirection: wide ? 'row' : 'column', gap: wide ? 20 : 8 }}>
            <View style={{ width: wide ? 150 : undefined, gap: 8 }}>
              <View>
                <Text style={{ fontFamily: F.display, fontSize: 32, color: C.olive }}>+{k.gain.toFixed(2)}</Text>
                <Text style={{ fontFamily: F.bodyMd, fontSize: 12, color: C.muted }}>puntos estimados</Text>
              </View>
              <Pressable onPress={() => a.toggleSim(k.feature)} android_ripple={RIPPLE} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                accessibilityLabel={`Simular: ${k.direction} ${shortLabel(k.feature)}`}
                style={({ hovered }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 12, borderRadius: R.pill, alignSelf: 'flex-start',
                  borderWidth: 1.5, borderColor: C.olive, backgroundColor: on ? C.olive : hovered ? '#54654814' : 'transparent', cursor: web ? 'pointer' : undefined,
                })}>
                <Icon name={on ? 'check' : 'flask'} size={16} color={on ? C.white : C.olive} />
                <Text style={{ fontFamily: F.bodySb, fontSize: 13, color: on ? C.white : C.olive }}>{on ? 'Simulando' : 'Simular'}</Text>
              </Pressable>
            </View>
            <View style={{ flex: wide ? 1 : undefined }}>
              <Text style={{ fontFamily: F.bodySb, fontSize: 17, color: C.ink }}>{k.direction}: {shortLabel(k.feature)}</Text>
              <Text style={{ fontFamily: F.bodyMd, fontSize: 14, color: C.wine, marginTop: 2 }}>
                Actual {fmt(k.current)} → meta {fmt(k.target)} {unit(k.feature)}
              </Text>
              {k.steps.map(st => (
                <View key={st} style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <Text style={{ color: C.sand, fontFamily: F.bodySb }}>•</Text>
                  <Text style={{ flex: 1, fontFamily: F.body, fontSize: 14, lineHeight: 21, color: C.ink }}>{st}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
      <Button kind="outline" tone="wine" icon="download" label="Guía completa para el productor (PDF)" style={{ marginTop: 8 }}
        loading={pdfBusy === GUIDES[0].title} onPress={() => onPdf(GUIDES[0].title, GUIDES[0].body)} />
    </Faded>
  );
}

// Una fila de "Mis vinos": tocarla abre el vino (`verb` describe la acción para lectores de pantalla)
function WineRow({ w, first, verb, onOpen, onDelete }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: first ? 0 : 1, borderTopColor: C.line }}>
      <Pressable onPress={() => onOpen(w)} android_ripple={RIPPLE} accessibilityRole="button" accessibilityLabel={`${verb} ${wineLabel(w)}, calidad ${w.quality.toFixed(1)}`}
        style={({ hovered }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 6, borderRadius: R.sm, backgroundColor: hovered ? C.cream : 'transparent', cursor: web ? 'pointer' : undefined })}>
        <View style={{ width: 52, height: 40, borderRadius: R.sm, backgroundColor: TIER_STYLE[w.tier]?.[0] ?? C.cream, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.display, fontSize: 18, color: TIER_STYLE[w.tier]?.[1] ?? C.ink }}>{w.quality.toFixed(1)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.bodySb, fontSize: 15, color: C.ink }}>{w.name}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 12, color: C.muted }}>
            {w.isRed ? 'Tinto' : 'Blanco'}{w.vintage ? ` · Cosecha ${w.vintage}` : ''} · guardado {new Date(w.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
      </Pressable>
      <Pressable onPress={() => onDelete(w)} android_ripple={RIPPLE_ROUND} accessibilityRole="button" accessibilityLabel={`Borrar ${wineLabel(w)}`}
        style={({ hovered }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: hovered ? C.cream : 'transparent', cursor: web ? 'pointer' : undefined })}>
        <Icon name="trash" size={18} color={C.muted} />
      </Pressable>
    </View>
  );
}

const EMPTY = 'Aún no guardas vinos. Guarda esta predicción para compararla con tus próximas cosechas.';

// Tarjeta "Mis vinos". En web muestra los 8 más recientes; en la pestaña del celular, todos.
export function HistoryCard({ history, best, wide, onOpen, onDelete, limit = 8, verb = 'Cargar', empty = EMPTY, emptyAction }) {
  return (
    <Card style={{ padding: wide ? 28 : 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Kicker style={{ marginBottom: 0 }}>MIS VINOS</Kicker>
        {best && <Text style={{ fontFamily: F.bodyMd, fontSize: 13, color: C.olive }}>Mejor: {wineLabel(best)} · {best.quality.toFixed(1)}</Text>}
      </View>
      {history.length === 0 ? (
        <>
          <P size={14} color={C.muted} style={{ marginTop: 12 }}>{empty}</P>
          {emptyAction}
        </>
      ) : (
        <View style={{ marginTop: 8 }}>
          {history.slice(0, limit).map((w, i) => (
            <WineRow key={w.id} w={w} first={i === 0} verb={verb} onOpen={onOpen} onDelete={onDelete} />
          ))}
        </View>
      )}
    </Card>
  );
}

// Guías informativas en PDF
export function GuidesCard({ wide, pdfBusy, onPdf }) {
  return (
    <Card style={{ padding: wide ? 28 : 20 }}>
      <Kicker>GUÍAS INFORMATIVAS</Kicker>
      {GUIDES.map((g, i) => (
        <Pressable key={g.title} onPress={() => onPdf(g.title, g.body)} android_ripple={RIPPLE} disabled={!!pdfBusy}
          accessibilityRole="button" accessibilityLabel={`Descargar ${g.title} en PDF`}
          style={({ hovered }) => ({
            flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingHorizontal: 8, borderRadius: R.sm,
            borderTopWidth: i ? 1 : 0, borderTopColor: C.line, backgroundColor: hovered ? C.cream : 'transparent', cursor: web ? 'pointer' : undefined,
          })}>
          <View style={{ width: 40, height: 40, borderRadius: R.sm, backgroundColor: C.sage, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="file" color={C.wine} />
          </View>
          <Text style={{ flex: 1, fontFamily: F.bodySb, fontSize: 15, color: C.ink }}>{pdfBusy === g.title ? 'Generando…' : g.title}</Text>
          <Icon name="download" color={C.wine} />
        </Pressable>
      ))}
    </Card>
  );
}

// Nota sobre el modelo, al pie del análisis
export function ModelNote() {
  return (
    <Text style={{ fontFamily: F.body, fontSize: 12, color: C.muted, lineHeight: 18 }}>
      Modelo entrenado con {model.metrics.n.toLocaleString('es-MX')} vinos · error medio ±{model.metrics.mae.toFixed(2)} pts · tipo {(model.metrics.acc * 100).toFixed(1)}% de acierto.
      El perfil de sabor se deduce por reglas enológicas, no por cata.
    </Text>
  );
}
