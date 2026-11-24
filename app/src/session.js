import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { currentUser, signOut as clearSession } from './auth';

const Session = createContext(null);

// Sesión guardada en el dispositivo (ver auth.js). `loading` sigue en true hasta leerla.
// Las rutas protegidas de src/app/_layout.js dependen de `user`.
export function SessionProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null });

  useEffect(() => {
    currentUser().then(user => setState({ loading: false, user }), () => setState({ loading: false, user: null }));
  }, []);

  const setUser = useCallback(user => setState({ loading: false, user }), []);
  const signOut = useCallback(async () => {
    await clearSession();
    setState({ loading: false, user: null });
  }, []);

  const value = useMemo(() => ({ ...state, setUser, signOut }), [state, setUser, signOut]);
  return <Session.Provider value={value}>{children}</Session.Provider>;
}

export const useSession = () => useContext(Session);
