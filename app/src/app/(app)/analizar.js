import { useLocalSearchParams, useRouter } from 'expo-router';
import Analizar from '@/screens/Analizar';

// ?vino=<id> llega desde Mis vinos para abrir un vino guardado; ?ver=resultado, desde "Ver en Analizar" de Mejorar.
// Los dos se limpian en cuanto se usan.
export default function AnalizarRoute() {
  const { vino, ver } = useLocalSearchParams();
  const router = useRouter();
  return (
    <Analizar wineId={vino} onWineOpened={() => router.setParams({ vino: undefined })}
      showResult={ver === 'resultado'} onResultShown={() => router.setParams({ ver: undefined })} />
  );
}
