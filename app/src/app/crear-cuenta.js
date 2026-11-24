import AuthForm from '@/screens/AuthForm';
import { useSession } from '@/session';

export default function SignUp() {
  const { setUser } = useSession();
  return <AuthForm mode="signup" onAuth={setUser} />;
}
