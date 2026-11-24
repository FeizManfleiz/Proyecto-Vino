import { useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signIn, signUp } from '../auth';
import { Button, Faded, Field, H, IMG, KeyboardAvoid, Logo, P, TextLink } from '../components';
import { C, F, R, web } from '../theme';

// mode: 'signin' | 'signup'. Al autenticarse, las rutas protegidas llevan solas a la app (src/app/_layout.js).
export default function AuthForm({ mode, onAuth }) {
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets(); // en web son 0: la vista no cambia
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const isUp = mode === 'signup';
  const set = k => v => setF(p => ({ ...p, [k]: v }));
  // Cambiar de modo sin apilar pantallas: crear cuenta se abre encima, iniciar sesión regresa a la que ya estaba
  const toOther = () => (isUp ? router.dismissTo('/iniciar-sesion') : router.push('/crear-cuenta'));
  // En web regresa a la landing; en el celular no hay landing y sólo Crear cuenta tiene a dónde volver
  const back = web ? { label: 'Inicio', href: '/' } : isUp ? { label: 'Iniciar sesión', href: '/iniciar-sesion' } : null;

  const submit = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      onAuth(await (isUp ? signUp(f) : signIn(f)));
      // Web: regresa al "/" que ya está abajo en la pila; si no, el guard abriría un segundo dashboard encima
      if (web) router.dismissTo('/');
    }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column', backgroundColor: C.cream }}>
      <Faded source={IMG.vineyardGold} color={C.wine} opacity={0.84} style={{ flex: wide ? 1 : undefined, alignItems: 'center', justifyContent: 'center', padding: wide ? 48 : 28, paddingTop: (wide ? 48 : 28) + insets.top, gap: 24 }}>
        <Logo width={Math.min(wide ? 440 : 260, width - 56)} />
        {wide && (
          <P color="#f3e7ea" style={{ textAlign: 'center', maxWidth: 420 }}>
            {isUp ? 'Crea tu cuenta y empieza a predecir la calidad de tus vinos.' : 'Bienvenido de nuevo. Tus predicciones te esperan.'}
          </P>
        )}
      </Faded>

      <KeyboardAvoid>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: wide ? 64 : 24, paddingBottom: (wide ? 64 : 24) + insets.bottom }}
        keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
          {back && <TextLink back label={back.label} color={C.muted} size={15} onPress={() => router.dismissTo(back.href)} />}
          <H size={wide ? 44 : 34} style={{ marginTop: 8 }}>{isUp ? 'Crear cuenta.' : 'Iniciar sesión.'}</H>
          <P size={16} color={C.muted} style={{ marginTop: 6, marginBottom: 28 }}>
            {isUp ? 'Sólo te tomará un minuto.' : 'Ingresa con tu correo y contraseña.'}
          </P>

          {isUp && <Field label="Nombre" value={f.name} onChangeText={set('name')} autoComplete="name" placeholder="Tu nombre" onSubmitEditing={submit} />}
          <Field label="Correo" value={f.email} onChangeText={set('email')} autoComplete="email" keyboardType="email-address" autoCapitalize="none" placeholder="tu@correo.com" onSubmitEditing={submit} />
          <Field label="Contraseña" value={f.password} onChangeText={set('password')} secureTextEntry autoComplete={isUp ? 'new-password' : 'current-password'} placeholder={isUp ? 'Mínimo 8 caracteres' : ''} onSubmitEditing={submit} />
          {isUp && <Field label="Confirmar contraseña" value={f.confirm} onChangeText={set('confirm')} secureTextEntry autoComplete="new-password" onSubmitEditing={submit} />}

          {!!error && (
            <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ backgroundColor: '#fbeaec', borderRadius: R.sm, padding: 12, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: C.wine }}>
              <Text style={{ fontFamily: F.bodyMd, color: C.wine, fontSize: 14 }}>{error}</Text>
            </View>
          )}

          <Button label={isUp ? 'Sign up' : 'Sign in'} onPress={submit} loading={busy} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <Text style={{ fontFamily: F.body, color: C.muted, fontSize: 15 }}>{isUp ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}</Text>
            <TextLink label={isUp ? 'Inicia sesión' : 'Regístrate'} size={15} onPress={toOther} />
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoid>
    </View>
  );
}
