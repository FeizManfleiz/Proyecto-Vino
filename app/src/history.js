// "Mis vinos": predicciones guardadas por usuario en el dispositivo.
// shortcut: AsyncStorage local igual que auth.js; mover al backend junto con las cuentas.
import AsyncStorage from '@react-native-async-storage/async-storage';

const key = email => `vino.history.${email}`;
const MAX = 50;

export async function loadHistory(email) {
  try { return JSON.parse((await AsyncStorage.getItem(key(email))) || '[]'); } catch { return []; }
}

export async function saveWine(email, item) {
  const list = [{ ...item, id: Date.now().toString(36), date: new Date().toISOString() }, ...(await loadHistory(email))].slice(0, MAX);
  await AsyncStorage.setItem(key(email), JSON.stringify(list));
  return list;
}

export async function removeWine(email, id) {
  const list = (await loadHistory(email)).filter(w => w.id !== id);
  await AsyncStorage.setItem(key(email), JSON.stringify(list));
  return list;
}

const TIP = 'vino.tipSeen';
export const tipSeen = async () => (await AsyncStorage.getItem(TIP)) === '1';
export const markTipSeen = () => AsyncStorage.setItem(TIP, '1');
