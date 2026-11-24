import AuthForm from '@/screens/AuthForm';
import { useSession } from '@/session';

export default function SignIn() {
  const { setUser } = useSession();
  return <AuthForm mode="signin" onAuth={setUser} />;
}
