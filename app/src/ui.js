import { StyleSheet } from 'react-native';

// Estilos mínimos y neutros a propósito: solo para que funcione; se reemplazan con el front del equipo.
export const s = StyleSheet.create({
  page: { padding: 24, width: '100%', maxWidth: 1280, alignSelf: 'center', gap: 6 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  h1: { fontSize: 24, fontWeight: '700', marginVertical: 8 },
  h2: { fontSize: 17, fontWeight: '700', marginTop: 16, marginBottom: 4 },
  label: { fontSize: 13, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 4, padding: 8, fontSize: 15 },
  btn: { backgroundColor: '#333', borderRadius: 4, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600' },
  btnAlt: { borderWidth: 1, borderColor: '#333', borderRadius: 4, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', marginTop: 8 },
  chipOn: { backgroundColor: '#ddd' },
  box: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 16 },
  error: { color: '#b00020', marginVertical: 8 },
  muted: { color: '#666', fontSize: 12 },
});
