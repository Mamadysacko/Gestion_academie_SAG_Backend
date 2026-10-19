import { useCallback, useRef, useState } from 'react';

/**
 * Empêche les doubles soumissions : tant qu'une action est en cours, un nouvel appel est ignoré.
 *   const [busy, run] = useSubmitGuard();
 *   <form onSubmit={(e) => { e.preventDefault(); run(() => save()); }}>
 */
export function useSubmitGuard() {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (action) => {
    if (running.current) return undefined;
    running.current = true;
    setBusy(true);
    try {
      return await action();
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, []);
  return [busy, run];
}
