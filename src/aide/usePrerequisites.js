import { useMemo } from 'react';
import manifest from 'virtual:ages-features';
import { FEATURE_CONTENT } from './helpContent';
import { CHECKS, parseTarget, requirementsFor } from './dependencies';
import { hasPermission } from './featureModel';
import { useRequirements } from './useRequirements';

/**
 * Prérequis d'une fonctionnalité (« module/sousOnglet ») avec leur état réel.
 * Sert à bloquer les actions impossibles et à proposer le lien direct vers l'élément manquant.
 *
 * Renvoie { blocked, loading, items } où chaque item = { id, label, state, detail, fix }.
 * `blocked` n'est vrai que pour un prérequis réellement Manquant ou À compléter (jamais pour
 * « Non vérifiable » : sans certitude, on n'empêche pas l'utilisateur de travailler).
 */
export function usePrerequisites(featureId, currentUser) {
  const ids = useMemo(() => {
    const content = FEATURE_CONTENT[featureId] || {};
    return requirementsFor({ creates: content.creates, extraRequires: content.extraRequires }, manifest.schema);
  }, [featureId]);
  const { statuses, loading } = useRequirements(ids, currentUser);

  const items = ids.map((id) => {
    const target = parseTarget(statuses[id]?.target || CHECKS[id]?.create);
    const { moduleId, tabId, action } = target || {};
    return {
      id,
      label: CHECKS[id]?.label || id,
      state: statuses[id]?.state,
      detail: statuses[id]?.detail,
      completesExisting: Boolean(statuses[id]?.target),
      // Le lien n'est proposé que si l'utilisateur a le droit d'ouvrir l'écran (Paramètres accepte aussi l'ancienne permission pédagogique).
      fix: target && (hasPermission(currentUser, moduleId) || (moduleId === 'parametres' && hasPermission(currentUser, 'organisation-pedagogique'))) ? { moduleId, tabId, action } : null,
    };
  });
  const blocked = items.some((item) => item.state === 'missing' || item.state === 'partial');
  return { featureId, blocked, loading, items };
}
