import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { signIn, signUp } from '../auth';
import { s } from '../ui';

// mode: 'signin' | 'signup'
export default function AuthForm({ mode, go, onAuth }) {
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isUp = mode === 'signup';
  const set = k => v => setF(p => ({ ...p, [k]: v }));

  const submit = async () => {
    setBusy(true); setError('');
    try { onAuth(await (isUp ? signUp(f) : signIn(f))); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const field = (k, label, props) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} value={f[k]} onChangeText={set(k)} accessibilityLabel={label} onSubmitEditing={submit} {...props} />
    </View>
  );

  return (
    <View style={[s.page, { maxWidth: 420 }]}>
      <Pressable onPress={() => go('landing')}><Text>← Inicio</Text></Pressable>
      <Text style={s.h1}>{isUp ? 'Crear cuenta' : 'Iniciar sesión'}</Text>
      {isUp && field('name', 'Nombre', { autoComplete: 'name' })}
      {field('email', 'Correo', { autoComplete: 'email', keyboardType: 'email-address', autoCapitalize: 'none' })}
      {field('password', 'Contraseña', { secureTextEntry: true, autoComplete: isUp ? 'new-password' : 'current-password' })}
      {isUp && field('confirm', 'Confirmar contraseña', { secureTextEntry: true, autoComplete: 'new-password' })}
      {!!error && <Text style={s.error} accessibilityRole="alert">{error}</Text>}
      <Pressable style={[s.btn, busy && { opacity: 0.5 }]} onPress={submit} disabled={busy} accessibilityRole="button">
        <Text style={s.btnText}>{isUp ? 'Sign up' : 'Sign in'}</Text>
      </Pressable>
      <Pressable onPress={() => go(isUp ? 'signin' : 'signup')} style={{ marginTop: 12 }}>
        <Text>{isUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}</Text>
      </Pressable>
    </View>
  );
}
