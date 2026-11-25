import { GuidesCard } from '../analysis-ui';
import { Container, IMG, P, TabHeader } from '../components';
import { TabScroll } from '../mobile-ui';
import { usePdf } from '../pdf';
import { C } from '../theme';

// Pestaña Guías (celular): las guías en PDF del dashboard web
export default function Guias() {
  const [pdfBusy, pdf] = usePdf();
  return (
    <TabScroll header={
      <TabHeader source={IMG.vineyardAerial} kicker="Para descargar" title="Guías.">
        <P size={16} color={C.sage} style={{ marginTop: 8 }}>Producción, química del vino, cata y maridaje, en PDF para compartir con tu equipo.</P>
      </TabHeader>
    }>
      <Container style={{ marginTop: -20 }}>
        <GuidesCard wide={false} pdfBusy={pdfBusy} onPdf={pdf} />
      </Container>
    </TabScroll>
  );
}
