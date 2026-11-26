import { Container, IMG, P, TabHeader } from '../components';
import { GuideList } from '../guides-mobile';
import { TabScroll } from '../mobile-ui';
import { usePdf } from '../pdf';
import { C } from '../theme';

// Pestaña Guías (celular): las guías en PDF, que se generan y se comparten desde el menú del sistema
export default function Guias() {
  const [pdfBusy, pdf] = usePdf();
  return (
    <TabScroll header={
      <TabHeader source={IMG.vineyardAerial} kicker="Para compartir" title="Guías.">
        <P size={16} color={C.sage} style={{ marginTop: 8 }}>Producción, química del vino, cata y maridaje, en PDF para compartir con tu equipo.</P>
      </TabHeader>
    }>
      <Container style={{ marginTop: -20 }}>
        <GuideList pdfBusy={pdfBusy} onPdf={pdf} />
      </Container>
    </TabScroll>
  );
}
