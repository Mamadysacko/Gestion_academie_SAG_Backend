import { useCallback, useEffect, useMemo, useState } from 'react';
import { evaluateCheck } from './dependencies';
import { useLiveRefresh } from '../composant/useLiveRefresh';

/**
 * État réel des prérequis demandés. Chaque prérequis est vérifié via l'API (avec cache) ;
 * le résultat se met à jour tout seul après toute création / modification / suppression.
 */
export function useRequirements(ids, currentUser) {
  const key = useMemo(() => [...new Set(ids)].sort().join('|'), [ids]);
  const [results, setResults] = useState({});

  const run = useCallback(async () => {
    const wanted = key ? key.split('|') : [];
    const entries = await Promise.all(wanted.map(async (id) => [id, await evaluateCheck(id, currentUser)]));
    setResults((previous) => ({ ...previous, ...Object.fromEntries(entries) }));
  }, [key, currentUser]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => (active ? run() : null));
    return () => { active = false; };
  }, [run]);

  useLiveRefresh(run, { intervalMs: 0 });

  const wanted = key ? key.split('|') : [];
  return { statuses: results, loading: wanted.some((id) => !results[id]) };
}
