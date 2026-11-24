import { Redirect } from 'expo-router';

// Cualquier dirección desconocida regresa al inicio
export default function NotFound() {
  return <Redirect href="/" />;
}
