// shortcut: usuarios guardados en el dispositivo (AsyncStorage), sin servidor; reemplazar por un backend de auth antes de producción.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const USERS = 'vino.users';
const SESSION = 'vino.session';

const load = async () => JSON.parse((await AsyncStorage.getItem(USERS)) || '{}');
const hash = (pw, salt) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + pw);
const norm = email => String(email).trim().toLowerCase();

export async function signUp({ name, email, password, confirm }) {
  email = norm(email);
  if (!String(name).trim()) throw new Error('Escribe tu nombre.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Correo inválido.');
  if (String(password).length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  if (password !== confirm) throw new Error('Las contraseñas no coinciden.');
  const users = await load();
  if (users[email]) throw new Error('Ya existe una cuenta con ese correo.');
  const salt = Crypto.randomUUID();
  users[email] = { name: name.trim(), salt, hash: await hash(password, salt) };
  await AsyncStorage.setItem(USERS, JSON.stringify(users));
  return startSession(email, users[email].name);
}

export async function signIn({ email, password }) {
  email = norm(email);
  const u = (await load())[email];
  if (!u || (await hash(password, u.salt)) !== u.hash) throw new Error('Correo o contraseña incorrectos.');
  return startSession(email, u.name);
}

async function startSession(email, name) {
  const user = { email, name };
  await AsyncStorage.setItem(SESSION, JSON.stringify(user));
  return user;
}

export const currentUser = async () => JSON.parse((await AsyncStorage.getItem(SESSION)) || 'null');
export const signOut = () => AsyncStorage.removeItem(SESSION);
