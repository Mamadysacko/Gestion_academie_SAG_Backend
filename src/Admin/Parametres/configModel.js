import { FEATURE_CONTENT } from '../../aide/helpContent';

/**
 * Données de configuration nécessaires au fonctionnement de l'application.
 * L'ORDRE n'est pas écrit à la main : il est calculé à partir des clés étrangères obligatoires du
 * schéma de la base (une table passe après toutes celles dont elle dépend). Seule la liste des
 * tables qui relèvent de la configuration est déclarée ici.
 */
export const CONFIG_TABLES = [
  'annees_scolaires', 'types_formations', 'niveaux', 'sessions', 'groupes',
  'departements', 'types_employes', 'salles', 'formateurs', 'emplois_du_temps',
  'parametres', 'evaluations',
];
// Contrôle composé du code existant : une salle doit avoir son formateur attitré avant d'être affectée.
export const DERIVED_STEP = 'salles_avec_formateur';

/** Où se configure chaque élément : dans un sous-onglet de Paramètres (tab) ou dans son module (module/sub). */
export const WHERE = {
  annees_scolaires: { tab: 'annees' },
  types_formations: { tab: 'types' },
  niveaux: { tab: 'niveaux' },
  sessions: { tab: 'sessions' },
  groupes: { tab: 'groupes' },
  departements: { tab: 'departements' },
  types_employes: { tab: 'types-employes' },
  parametres: { tab: 'evaluations' },
  evaluations: { module: 'evaluations', sub: 'types' },
  salles: { module: 'salles', sub: 'salles' },
  formateurs: { module: 'formateurs', sub: 'liste' },
  salles_avec_formateur: { module: 'salles', sub: 'salles' },
  emplois_du_temps: { module: 'salles', sub: 'affectations' },
};

export const REQUIRED_MODULE = { evaluations: 'evaluations', salles: 'salles', formateurs: 'formateurs', salles_avec_formateur: 'formateurs', emplois_du_temps: 'salles' };

export function buildConfigSteps(schema) {
  const ids = [...CONFIG_TABLES.slice(0, CONFIG_TABLES.indexOf('emplois_du_temps')), DERIVED_STEP, ...CONFIG_TABLES.slice(CONFIG_TABLES.indexOf('emplois_du_temps'))];
  const extraForAffectation = FEATURE_CONTENT['salles/affectations']?.extraRequires || [];
  const parentsOf = (id) => {
    if (id === DERIVED_STEP) return ['salles', 'formateurs'];
    const fromSchema = (schema[id]?.foreignKeys || []).filter((fk) => fk.required && ids.includes(fk.references)).map((fk) => fk.references);
    const extra = id === 'emplois_du_temps' ? extraForAffectation.filter((extraId) => ids.includes(extraId)) : [];
    return [...new Set([...fromSchema, ...extra])];
  };
  const depth = {};
  const resolve = (id, trail = []) => {
    if (depth[id] !== undefined) return depth[id];
    if (trail.includes(id)) return 0;
    const parents = parentsOf(id);
    depth[id] = parents.length ? 1 + Math.max(...parents.map((parent) => resolve(parent, [...trail, id]))) : 0;
    return depth[id];
  };
  ids.forEach((id) => resolve(id));
  return ids
    .map((id, index) => ({ id, parents: parentsOf(id), depth: depth[id], index }))
    .sort((a, b) => a.depth - b.depth || a.index - b.index);
}

