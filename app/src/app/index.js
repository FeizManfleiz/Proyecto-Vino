import { Redirect } from 'expo-router';
import { useSession } from '@/session';

// Celular: no hay landing. Abre en Iniciar sesión, o en Analizar si ya hay sesión. (La web usa index.web.js.)
export default function Index() {
  const { user } = useSession();
  return <Redirect href={user ? '/analizar' : '/iniciar-sesion'} />;
}
