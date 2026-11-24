import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Oswald_500Medium, Oswald_700Bold } from '@expo-google-fonts/oswald';
import { Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat';
import { Logo } from '@/components';
import { SessionProvider, useSession } from '@/session';
import { C, injectWebCss, web } from '@/theme';

SplashScreen.preventAutoHideAsync();
injectWebCss();

// Colores de marca para el navegador: sin destellos blancos entre pantallas
const THEME = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: C.wine, background: C.cream, card: C.ink, text: C.ink, border: C.line } };

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootStack />
    </SessionProvider>
  );
}

// Rutas:
//  /                 celular: redirige a Iniciar sesión o a Analizar · web: landing o dashboard (index.web.js)
//  /iniciar-sesion   /crear-cuenta        sólo sin sesión
//  /analizar  /mis-vinos  /guias  /cuenta  pestañas, sólo con sesión y en el celular
function RootStack() {
  const { user, loading } = useSession();
  const [fontsLoaded, fontError] = useFonts({ Oswald_500Medium, Oswald_700Bold, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold });
  // Si las fuentes fallan se sigue con las del sistema en lugar de bloquear la app
  const ready = (fontsLoaded || !!fontError) && !loading;

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) {
    // Celular: sigue visible el splash nativo. Web: el mismo cargador de siempre.
    if (!web) return null;
    return (
      <View style={{ flex: 1, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <Logo width={260} />
        <ActivityIndicator color={C.sand} size="large" accessibilityLabel="Cargando" />
      </View>
    );
  }

  return (
    <ThemeProvider value={THEME}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!user}>
          <Stack.Screen name="iniciar-sesion" />
          <Stack.Screen name="crear-cuenta" />
        </Stack.Protected>
        <Stack.Protected guard={!!user && !web}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
