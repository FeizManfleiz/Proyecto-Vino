import { useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { signIn, signUp } from '../auth';
import { Button, Faded, Field, H, IMG, Logo, P, TextLink } from '../components';
import { C, F, R } from '../theme';

// mode: 'signin' | 'signup'
export default function AuthForm({ mode, go, onAuth }) {
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const isUp = mode === 'signup';
  const set = k => v => setF(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try { onAuth(await (isUp ? signUp(f) : signIn(f))); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column', backgroundColor: C.cream }}>
      <Faded source={IMG.vineyardGold} color={C.wine} opacity={0.84} style={{ flex: wide ? 1 : undefined, alignItems: 'center', justifyContent: 'center', padding: wide ? 48 : 28, gap: 24 }}>
        <Logo width={Math.min(wide ? 440 : 260, width - 56)} />
        {wide && (
          <P color="#f3e7ea" style={{ textAlign: 'center', maxWidth: 420 }}>
            {isUp ? 'Crea tu cuenta y empieza a predecir la calidad de tus vinos.' : 'Bienvenido de nuevo. Tus predicciones te esperan.'}
          </P>
        )}
      </Faded>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: wide ? 64 : 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
          <TextLink back label="Inicio" color={C.muted} size={15} onPress={() => go('landing')} />
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
            <TextLink label={isUp ? 'Inicia sesión' : 'Regístrate'} size={15} onPress={() => go(isUp ? 'signin' : 'signup')} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
