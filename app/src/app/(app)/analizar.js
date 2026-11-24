import { useLocalSearchParams, useRouter } from 'expo-router';
import Analizar from '@/screens/Analizar';

// ?vino=<id> llega desde Mis vinos para abrir un vino guardado; se limpia al cargarlo
export default function AnalizarRoute() {
  const { vino } = useLocalSearchParams();
  const router = useRouter();
  return <Analizar wineId={vino} onWineOpened={() => router.setParams({ vino: undefined })} />;
}
