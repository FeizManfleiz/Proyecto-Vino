import { useEffect, useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useAnalysis, useSaveWine } from '../analysis';
import { AnalysisForm, GuidesCard, HistoryCard, ModelNote, RecsCard, ResultCard, StatChips, Tip } from '../analysis-ui';
import { Button, Container, Faded, H, Icon, IMG, Logo, NavBar, P } from '../components';
import { markTipSeen, tipSeen } from '../history';
import { usePdf } from '../pdf';
import { C, F } from '../theme';
import { useWineHistory } from '../wines';

// Dashboard de la web. En el celular el mismo contenido se reparte en pestañas (src/app/(app)/).
// La lógica vive en src/analysis.js y las tarjetas en src/analysis-ui.js, compartidas con las pestañas.
export default function Predictor({ user, onSignOut }) {
  const a = useAnalysis();
  const { history, save, remove, best } = useWineHistory(user.email);
  const s = useSaveWine({ live: a.live, history, save });
  const [pdfBusy, pdf] = usePdf();
  const [showTip, setShowTip] = useState(false);
  const { width } = useWindowDimensions();
  const wide = width >= 900; // laptop: formulario y resultado lado a lado
  const pad = wide ? 32 : 20;

  useEffect(() => {
    tipSeen().then(seen => setShowTip(!seen));
  }, []);
  const closeTip = () => { setShowTip(false); markTipSeen(); };

  // ---------- Tarjetas ----------
  const resultCard = <ResultCard a={a} pad={pad} pdfBusy={pdfBusy} onPdf={pdf} />;
  const recsCard = <RecsCard a={a} wide={wide} pad={pad} pdfBusy={pdfBusy} onPdf={pdf} />;
  const historyCard = <HistoryCard history={history} best={best} wide={wide} onOpen={w => a.loadValues(w.values, null)} onDelete={w => remove(w.id)} />;
  const guidesCard = <GuidesCard wide={wide} pdfBusy={pdfBusy} onPdf={pdf} />;

  // ---------- Pantalla ----------
  return (
    <ScrollView stickyHeaderIndices={[0]} style={{ backgroundColor: C.cream }} keyboardShouldPersistTaps="handled">
      <NavBar>
        {wide && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 8 }}>
            <Icon name="user" size={16} color={C.sage} />
            <Text style={{ fontFamily: F.bodyMd, color: C.sage, fontSize: 14 }}>{user.name}</Text>
          </View>
        )}
        <Button small kind="outline" tone="white" icon="logout" label="Cerrar sesión" onPress={onSignOut} />
      </NavBar>

      <Faded source={IMG.barrels} color={C.ink} opacity={0.8} style={{ paddingTop: wide ? 48 : 32, paddingBottom: wide ? 72 : 44 }}>
        <Container style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.bodyMd, color: C.sand, fontSize: 15 }}>Hola, {user.name.split(' ')[0]}.</Text>
            <H size={wide ? 56 : 38} color={C.white} style={{ marginTop: 4 }}>Predicción.</H>
            <P size={wide ? 19 : 16} color={C.sage} style={{ marginTop: 8, maxWidth: 620 }}>
              Ajusta el análisis de laboratorio y mira la calidad cambiar en tiempo real.
            </P>
            <StatChips history={history} best={best} />
          </View>
          {wide && <Logo width={240} />}
        </Container>
      </Faded>

      <Container style={{ marginTop: wide ? -32 : -20, paddingBottom: 48, gap: 24 }}>
        {showTip && <Tip onClose={closeTip} />}

        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 24, alignItems: 'flex-start' }}>
          {/* Columna izquierda: formulario (+ recomendaciones en laptop) */}
          <View style={{ flex: wide ? 7 : undefined, width: wide ? undefined : '100%', gap: 24 }}>
            <AnalysisForm a={a} s={s} wide={wide} pad={pad} />
            {wide && recsCard}
          </View>

          {/* Columna derecha: resultado, historial y guías */}
          <View style={{ flex: wide ? 5 : undefined, width: wide ? undefined : '100%', gap: 24 }}>
            {resultCard}
            {!wide && recsCard}
            {historyCard}
            {guidesCard}
            <ModelNote />
          </View>
        </View>
      </Container>
    </ScrollView>
  );
}
