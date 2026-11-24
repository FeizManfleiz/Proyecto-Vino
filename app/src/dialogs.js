import { Alert, Platform } from 'react-native';

// Avisos y confirmaciones: diálogo nativo en el celular, del navegador en web
export const notify = msg => (Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Aviso', msg));

// Resuelve true si la persona confirma la acción destructiva `ok`
export function confirm({ title, message, ok }) {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise(resolve => Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
    { text: ok, style: 'destructive', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}
