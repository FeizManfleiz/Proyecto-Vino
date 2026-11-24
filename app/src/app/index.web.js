import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Landing from '@/screens/Landing';
import Predictor from '@/screens/Predictor';
import { useSession } from '@/session';
import { C } from '@/theme';

const PATHS = { signin: '/iniciar-sesion', signup: '/crear-cuenta' };

// Web, igual que antes de Expo Router: en "/" la landing sin sesión y el dashboard con sesión
export default function Home() {
  const { user, signOut } = useSession();
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.ink }} edges={['top']}>
      {user ? <Predictor user={user} onSignOut={signOut} /> : <Landing go={screen => router.push(PATHS[screen])} />}
    </SafeAreaView>
  );
}
