import { useRouter } from 'expo-router';
import { StatChips } from '../analysis-ui';
import { Button, Container, IMG, TabHeader } from '../components';
import { confirm } from '../dialogs';
import { TabScroll } from '../mobile-ui';
import { WineList } from '../wines-mobile';
import { useWines, wineLabel } from '../wines';

// Pestaña Mis vinos (celular): la lista completa; tocar un vino lo abre en Analizar.
// Borrar (deslizando o con el ícono) siempre pide confirmación; resuelve true si se borró.
export default function MisVinos() {
  const router = useRouter();
  const { history, remove, best } = useWines();

  const open = w => router.navigate({ pathname: '/analizar', params: { vino: w.id } });
  const onDelete = async w => {
    const ok = await confirm({ title: 'Borrar vino', message: `¿Borrar "${wineLabel(w)}" de Mis vinos?`, ok: 'Borrar' });
    if (ok) await remove(w.id);
    return ok;
  };

  return (
    <TabScroll header={
      <TabHeader source={IMG.bottles} kicker="Tu bodega" title="Mis vinos.">
        <StatChips history={history} best={best} />
      </TabHeader>
    }>
      <Container style={{ marginTop: -20 }}>
        <WineList history={history} onOpen={open} onDelete={onDelete}
          empty="Aún no guardas vinos. En Analizar, usa «Guardar en Mis vinos» para comparar tus cosechas."
          emptyAction={<Button label="Ir a Analizar" icon="flask" style={{ marginTop: 16, alignSelf: 'flex-start' }} onPress={() => router.navigate('/analizar')} />} />
      </Container>
    </TabScroll>
  );
}
