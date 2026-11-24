import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadHistory, removeWine, saveWine } from './history';

export const wineLabel = w => `${w.name}${w.vintage ? ` · ${w.vintage}` : ''}`;

// "Mis vinos" de un usuario: se carga una vez y se actualiza al guardar o borrar
export function useWineHistory(email) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!email) return;
    let active = true;
    loadHistory(email).then(list => active && setHistory(list));
    return () => { active = false; };
  }, [email]);

  const save = useCallback(async item => setHistory(await saveWine(email, item)), [email]);
  const remove = useCallback(async id => setHistory(await removeWine(email, id)), [email]);
  const best = useMemo(() => history.reduce((m, w) => (w.quality > (m?.quality ?? -1) ? w : m), null), [history]);

  return useMemo(() => ({ history, save, remove, best }), [history, save, remove, best]);
}

// En el celular las pestañas comparten la misma lista: guardar en Analizar aparece en Mis vinos
const Wines = createContext(null);

export function WinesProvider({ email, children }) {
  const value = useWineHistory(email);
  return <Wines.Provider value={value}>{children}</Wines.Provider>;
}

export const useWines = () => useContext(Wines);
