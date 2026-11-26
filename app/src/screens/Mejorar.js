import { memo, useCallback, useDeferredValue, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSharedAnalysis } from '../analysis';
import { Container } from '../components';
import { AppliedToast, ImproveEmpty, ImproveHeader, ImproveList, SimulatorSheet, TOAST_SPACE } from '../improve-mobile';
import { TabScroll } from '../mobile-ui';
import { usePdf } from '../pdf';

// Pestaña Mejorar (celular): qué ajustar para subir la calificación del vino que está en Analizar, y el simulador.
// Lee el MISMO análisis que Analizar (AnalysisProvider): un cambio allá se ve aquí, y "Aplicar al formulario" cambia
// los valores de allá.
export default function Mejorar() {
  const shared = useSharedAnalysis();
  // Esta pestaña sigue montada mientras se escribe en Analizar: se pone al día con prioridad baja, después de cada
  // tecla, para no frenar el teclado. El simulador y el aviso usan el valor directo para responder al instante.
  const a = useDeferredValue(shared);
  const [pdfBusy, pdf] = usePdf();
  const [simOpen, setSimOpen] = useState(false);
  const [applied, setApplied] = useState(null); // { from }: la calificación antes de "Aplicar al formulario"

  useFocusEffect(useCallback(() => () => setApplied(null), [])); // al salir de la pestaña se va el aviso
  const openSim = useCallback(() => { setApplied(null); setSimOpen(true); }, []);
  const goAnalizar = useCallback(() => router.navigate('/analizar'), []);
  const viewResult = () => {
    setApplied(null);
    router.navigate({ pathname: '/analizar', params: { ver: 'resultado' } });
  };

  return (
    <View style={{ flex: 1 }}>
      <Content a={a} pdfBusy={pdfBusy} onPdf={pdf} onOpenSim={openSim} onGoAnalizar={goAnalizar} bottomExtra={applied ? TOAST_SPACE : 0} />
      <AppliedToast a={shared} applied={applied} onView={viewResult} onClose={() => setApplied(null)} />
      <SimulatorSheet a={shared} visible={simOpen} onClose={() => setSimOpen(false)} onApplied={from => setApplied({ from })} />
    </View>
  );
}

// memo: con cada tecla en Analizar, Mejorar vuelve a pintarse, pero esto sólo cuando llega el análisis diferido
const Content = memo(function Content({ a, pdfBusy, onPdf, onOpenSim, onGoAnalizar, bottomExtra }) {
  return (
    <TabScroll bottomExtra={bottomExtra} header={<ImproveHeader a={a} onOpenSim={onOpenSim} />}>
      <Container style={{ marginTop: -20 }}>
        {a.live.r ? <ImproveList a={a} pdfBusy={pdfBusy} onPdf={onPdf} /> : <ImproveEmpty onGo={onGoAnalizar} />}
      </Container>
    </TabScroll>
  );
});
