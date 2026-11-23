import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Oswald_500Medium, Oswald_700Bold } from '@expo-google-fonts/oswald';
import { Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat';
import { currentUser, signOut } from './src/auth';
import AuthForm from './src/screens/AuthForm';
import Landing from './src/screens/Landing';
import Predictor from './src/screens/Predictor';
import { Logo } from './src/components';
import { C, injectWebCss } from './src/theme';

injectWebCss();

// Navegación simple por estado: landing → signin/signup → predictor (sólo con sesión).
export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState(null);
  const [fontsLoaded, fontError] = useFonts({ Oswald_500Medium, Oswald_700Bold, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold });

  useEffect(() => {
    currentUser().then(u => { setUser(u); setScreen(u ? 'app' : 'landing'); }).catch(() => setScreen('landing'));
  }, []);

  const onAuth = u => { setUser(u); setScreen('app'); };
  const onSignOut = async () => { await signOut(); setUser(null); setScreen('landing'); };

  // Si las fuentes fallan se sigue con las del sistema en lugar de bloquear la app
  if ((!fontsLoaded && !fontError) || screen === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <Logo variant="wine" width={260} />
        <ActivityIndicator color={C.sand} size="large" accessibilityLabel="Cargando" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.ink }} edges={['top']}>
        <StatusBar style="light" />
        {screen === 'landing' && <Landing go={setScreen} />}
        {(screen === 'signin' || screen === 'signup') && <AuthForm key={screen} mode={screen} go={setScreen} onAuth={onAuth} />}
        {screen === 'app' && user && <Predictor user={user} onSignOut={onSignOut} />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
