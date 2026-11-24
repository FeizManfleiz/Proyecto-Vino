import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { useAnalysis, useSaveWine } from '../analysis';
import { AnalysisForm, ModelNote, RecsCard, ResultCard, StatChips, Tip } from '../analysis-ui';
import { Container, IMG, KeyboardAvoid, P, TabHeader } from '../components';
import { markTipSeen, tipSeen } from '../history';
import { usePdf } from '../pdf';
import { useSession } from '../session';
import { C } from '../theme';
import { useWines } from '../wines';

// Pestaña Analizar (celular): el formulario, el resultado y las recomendaciones del dashboard web.
// `wineId` llega desde Mis vinos para cargar un vino guardado.
export default function Analizar({ wineId, onWineOpened }) {
  const { user } = useSession();
  const { history, save, best } = useWines();
  const a = useAnalysis();
  const s = useSaveWine({ live: a.live, history, save });
  const [pdfBusy, pdf] = usePdf();
  const [showTip, setShowTip] = useState(false);
  const scroll = useRef(null);
  const { width } = useWindowDimensions();
  const wide = width >= 900; // tableta
  const pad = wide ? 32 : 20;

  useEffect(() => {
    tipSeen().then(seen => setShowTip(!seen));
  }, []);
  const closeTip = () => { setShowTip(false); markTipSeen(); };

  // Carga el vino y regresa arriba para ver su resultado
  const openWine = useEffectEvent(w => {
    a.loadValues(w.values);
    scroll.current?.scrollTo({ y: 0, animated: false });
    onWineOpened();
  });
  useEffect(() => {
    const w = wineId && history.find(h => h.id === wineId);
    if (w) openWine(w);
  }, [wineId, history]);

  return (
    <KeyboardAvoid>
    <ScrollView ref={scroll} style={{ flex: 1, backgroundColor: C.cream }} contentContainerStyle={{ paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <TabHeader source={IMG.barrels} kicker={`Hola, ${user.name.split(' ')[0]}.`} title="Predicción.">
        <P size={16} color={C.sage} style={{ marginTop: 8 }}>Ajusta el análisis de laboratorio y mira la calidad cambiar en tiempo real.</P>
        <StatChips history={history} best={best} />
      </TabHeader>

      <Container style={{ marginTop: -20, gap: 24 }}>
        {showTip ? <Tip onClose={closeTip} /> : null}
        <AnalysisForm a={a} s={s} wide={wide} pad={pad} />
        <ResultCard a={a} pad={pad} pdfBusy={pdfBusy} onPdf={pdf} />
        <RecsCard a={a} wide={wide} pad={pad} pdfBusy={pdfBusy} onPdf={pdf} />
        <ModelNote />
      </Container>
    </ScrollView>
    </KeyboardAvoid>
  );
}
