import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native';
import { currentUser, signOut } from './src/auth';
import AuthForm from './src/screens/AuthForm';
import Landing from './src/screens/Landing';
import Predictor from './src/screens/Predictor';

// Navegación simple por estado: landing → signin/signup → predictor (solo con sesión).
export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState(null);

  useEffect(() => {
    currentUser().then(u => { setUser(u); setScreen(u ? 'app' : 'landing'); }).catch(() => setScreen('landing'));
  }, []);

  const onAuth = u => { setUser(u); setScreen('app'); };
  const onSignOut = async () => { await signOut(); setUser(null); setScreen('landing'); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar style="dark" />
      {screen === 'landing' && <Landing go={setScreen} />}
      {(screen === 'signin' || screen === 'signup') && <AuthForm key={screen} mode={screen} go={setScreen} onAuth={onAuth} />}
      {screen === 'app' && user && <Predictor user={user} onSignOut={onSignOut} />}
    </SafeAreaView>
  );
}
