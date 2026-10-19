import { useMemo } from 'react';
import manifest from 'virtual:ages-features';
import { buildMenuItems } from '../composant/menuConfig';
import { useLanguage } from '../i18n/useLanguage';
import { buildCatalog } from './featureModel';
import { createSearchIndex } from './searchEngine';

/** Clé de session qui transmet la question tapée dans la barre supérieure vers le guide d'aide. */
export const AIDE_QUERY_KEY = 'ages-aide-query';

/**
 * Catalogue des fonctionnalités de l'utilisateur connecté (relevé du code + permissions)
 * et moteur de recherche associé. Recalculé seulement si l'utilisateur ou la langue change.
 */
export function useCatalog(currentUser) {
  const { t } = useLanguage();
  return useMemo(() => {
    const catalog = buildCatalog({ manifest, menuItems: buildMenuItems(currentUser, t), currentUser });
    const { issues } = catalog;
    if (import.meta.env.DEV && (issues.undocumented.length || issues.orphanContent.length || issues.badCreates.length)) {
      console.warn('[aide] Cohérence contenu ↔ code :', issues);
    }
    return { ...catalog, schema: manifest.schema, search: createSearchIndex(catalog.features, catalog.journeys) };
  }, [currentUser, t]);
}

/** Ouvre une fonctionnalité du catalogue : onglet principal + sous-onglet détectés dans le code. */
export function openFeature(feature, onNavigate) {
  onNavigate?.(feature.moduleId, feature.tabId || null);
}
