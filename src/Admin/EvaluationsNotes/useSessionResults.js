import { useCallback, useEffect, useState } from 'react';
import { authApi, resultatsApi } from '../../config/apiService';
import { useLiveRefresh } from '../../composant/useLiveRefresh';

/**
 * Résultats calculés par le serveur pour une session (moyennes, appréciations, statuts, synthèse).
 * Se réactualise seul après chaque note saisie ou décision enregistrée.
 * `trainer` : passe par l'espace formateur (résultats limités à ses classes).
 */
export function useSessionResults(sessionId, { id_groupe = '', id_salle = '', trainer = false } = {}) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!sessionId) {
      setResults(null);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const response = trainer
        ? await authApi.getTrainerResultats(sessionId)
        : await resultatsApi.getSession(sessionId, { id_groupe, id_salle });
      setResults(response.data);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Impossible de calculer les résultats de la session.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id_groupe, id_salle, sessionId, trainer]);

  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);
  useLiveRefresh(() => load({ silent: true }), { enabled: Boolean(sessionId), intervalMs: 60000 });

  return { results, loading, error, reload: load };
}
