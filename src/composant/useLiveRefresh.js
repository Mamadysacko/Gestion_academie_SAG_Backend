import { useEffect, useRef } from 'react';
import { DATA_CHANGED_EVENT } from '../config/apiService';

/**
 * Réactualise silencieusement un écran :
 * - après chaque création / modification / suppression envoyée à l'API (n'importe quel module) ;
 * - quand la fenêtre redevient visible ;
 * - toutes les `intervalMs` millisecondes (0 pour désactiver).
 * `refresh` doit charger les données sans afficher d'indicateur de chargement.
 */
export function useLiveRefresh(refresh, { intervalMs = 30000, enabled = true } = {}) {
  const callback = useRef(refresh);
  useEffect(() => {
    callback.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return undefined;
    const run = () => {
      if (document.visibilityState === 'visible') callback.current?.();
    };
    window.addEventListener(DATA_CHANGED_EVENT, run);
    document.addEventListener('visibilitychange', run);
    const timer = intervalMs > 0 ? window.setInterval(run, intervalMs) : null;
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, run);
      document.removeEventListener('visibilitychange', run);
      if (timer) window.clearInterval(timer);
    };
  }, [enabled, intervalMs]);
}
