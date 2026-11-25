import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useAnalysis, useSaveWine } from '../analysis';
import { BAR_SPACE, LiveScoreBar, MobileAnalysisForm, useAnalysisFlow } from '../analysis-mobile';
import { ModelNote, StatChips, Tip } from '../analysis-ui';
import { Container, IMG, KeyboardAvoid, P, TabHeader } from '../components';
import { markTipSeen, tipSeen } from '../history';
import { TabScroll } from '../mobile-ui';
import { usePdf } from '../pdf';
import { ImproveCard, ResultDetail, ResultSummary, SimulatorSheet } from '../result-mobile';
import { useSession } from '../session';
import { C } from '../theme';
import { useWines } from '../wines';

// Pestaña Analizar (celular): el formulario por secciones, el resultado (resumen + detalle) y cómo mejorar el vino,
// con la calificación en vivo en una barra encima de las pestañas y el simulador en una hoja.
// `wineId` llega desde Mis vinos para cargar un vino guardado.
export default function Analizar({ wineId, onWineOpened }) {
  const { user } = useSession();
  const { history, save, best } = useWines();
  const a = useAnalysis();
  const s = useSaveWine({ live: a.live, history, save });
  const [pdfBusy, pdf] = usePdf();
  const [showTip, setShowTip] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const scroll = useRef(null);
  const flow = useAnalysisFlow({ a, scroll });
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
    <View style={{ flex: 1 }}>
      <TabScroll scrollRef={scroll} automaticallyAdjustKeyboardInsets bottomExtra={BAR_SPACE}
        onScroll={flow.onScroll} onLayout={flow.onViewLayout} header={
        <TabHeader source={IMG.barrels} kicker={`Hola, ${user.name.split(' ')[0]}.`} title="Predicción.">
          <P size={16} color={C.sage} style={{ marginTop: 8 }}>Ajusta el análisis de laboratorio y mira la calidad cambiar en tiempo real.</P>
          <StatChips history={history} best={best} />
        </TabHeader>
      }>
        <Container onLayout={flow.onBodyLayout} style={{ marginTop: -20, gap: 24 }}>
          {showTip ? <Tip onClose={closeTip} /> : null}
          <MobileAnalysisForm a={a} s={s} pad={pad} flow={flow} />
          <View onLayout={flow.onResultLayout} style={{ gap: 12 }}>
            <ResultSummary a={a} onFix={flow.goToFirstIssue} />
            <ResultDetail a={a} pdfBusy={pdfBusy} onPdf={pdf} />
          </View>
          <ImproveCard a={a} pdfBusy={pdfBusy} onPdf={pdf} onOpenSim={() => setSimOpen(true)} />
          <ModelNote />
        </Container>
      </TabScroll>
      <LiveScoreBar a={a} flow={flow} />
      <SimulatorSheet a={a} visible={simOpen} onClose={() => setSimOpen(false)} />
    </View>
    </KeyboardAvoid>
  );
}
