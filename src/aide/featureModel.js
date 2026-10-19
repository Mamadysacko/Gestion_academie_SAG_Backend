/**
 * Construit le catalogue des fonctionnalités en croisant :
 *   - le relevé automatique du code (manifest : modules, sous-onglets, actions, schéma, erreurs) ;
 *   - le contenu rédactionnel (helpContent.js) ;
 *   - le menu réellement accessible à l'utilisateur connecté (permissions).
 * Fonction pure : utilisée par l'interface et par les tests.
 */
import { FEATURE_CONTENT, JOURNEYS, MODULE_CONTENT } from './helpContent';
import { CHECKS, requirementsFor } from './dependencies';

export const PERMISSION_LABELS = {
  read: 'Consulter', create: 'Créer', update: 'Modifier', delete: 'Supprimer', export: 'Exporter', validate: 'Valider',
};

const isAdmin = (user) => user?.role_code === 'admin' || user?.role === 'admin';
export const hasPermission = (user, module, action = 'read') => isAdmin(user) || (user?.permissions?.[module] || []).includes(action);

/** Module de permission d'un module de menu (l'accueil, le profil et l'espace formateur sont toujours ouverts). */
const ALWAYS_OPEN = new Set(['overview', 'profil', 'espace-formateur', 'aide']);

export function buildCatalog({ manifest, menuItems, currentUser }) {
  const issues = { orphanContent: [], undocumented: [], badCreates: [], badJourneySteps: [] };
  const menuById = new Map(menuItems.map((item) => [item.id, item]));
  const modules = [];
  const features = [];
  const knownIds = new Set();

  Object.values(manifest.modules).forEach((detected) => {
    const menu = menuById.get(detected.id);
    if (!menu) return; // module absent du menu de cet utilisateur : invisible dans l'aide
    const moduleContent = MODULE_CONTENT[detected.id] || {};
    const moduleErrors = manifest.errors.filter((error) => error.module === detected.id);
    knownIds.add(detected.id);

    const moduleFeature = {
      id: detected.id, type: 'module', moduleId: detected.id, tabId: null,
      title: menu.label, path: [menu.label], icon: menu.icon,
      summary: moduleContent.summary || `Module « ${menu.label} ».`,
      steps: moduleContent.steps || [], tips: [], keywords: moduleContent.keywords || [],
      requires: [], actions: [], related: [], allowed: true, errors: moduleErrors,
      documented: Boolean(moduleContent.summary),
    };
    modules.push({ ...moduleFeature, subtabs: [] });
    features.push(moduleFeature);

    detected.subtabs.forEach((subtab) => {
      const id = `${detected.id}/${subtab.id}`;
      knownIds.add(id);
      const content = FEATURE_CONTENT[id];
      if (!content) issues.undocumented.push(id);
      if (content?.creates && !manifest.schema[content.creates]) issues.badCreates.push(`${id} → ${content.creates}`);
      const reads = [detected.id, ...(content?.reads || [])].filter((module) => !ALWAYS_OPEN.has(module));
      const allowed = reads.every((module) => hasPermission(currentUser, module));
      const actions = subtab.actions.map((action) => ({
        ...action,
        allowed: ALWAYS_OPEN.has(detected.id) || hasPermission(currentUser, detected.id, action.permission),
      }));
      const feature = {
        id, type: 'subtab', moduleId: detected.id, tabId: subtab.id,
        title: subtab.label, path: [menu.label, subtab.label], icon: menu.icon,
        summary: content?.summary || `Onglet « ${subtab.label} » du module « ${menu.label} ».`,
        steps: content?.steps || [], tips: content?.tips || [], keywords: content?.keywords || [],
        creates: content?.creates || null,
        requires: requirementsFor({ creates: content?.creates, extraRequires: content?.extraRequires }, manifest.schema),
        reads, allowed, actions, related: content?.related || [],
        errors: moduleErrors, documented: Boolean(content), file: subtab.file,
      };
      features.push(feature);
      modules[modules.length - 1].subtabs.push(feature);

      actions.forEach((action) => {
        features.push({
          id: `${id}#${action.label}`, type: 'action', moduleId: detected.id, tabId: subtab.id,
          title: action.label, path: [menu.label, subtab.label, action.label], icon: menu.icon,
          summary: `Bouton « ${action.label} » de l’onglet « ${subtab.label} ». Permission requise : ${PERMISSION_LABELS[action.permission]}.`,
          steps: [`Ouvrez « ${menu.label} » puis l’onglet « ${subtab.label} ».`, `Cliquez sur « ${action.label} ».`],
          tips: [], keywords: [], requires: feature.requires, actions: [], related: [id],
          allowed: allowed && action.allowed, permission: action.permission, parent: id, errors: [], documented: true,
        });
      });
    });

    // Actions propres au module (hors sous-onglet)
    detected.actions.forEach((action) => {
      features.push({
        id: `${detected.id}#${action.label}`, type: 'action', moduleId: detected.id, tabId: null,
        title: action.label, path: [menu.label, action.label], icon: menu.icon,
        summary: `Action « ${action.label} » du module « ${menu.label} ». Permission requise : ${PERMISSION_LABELS[action.permission]}.`,
        steps: [`Ouvrez « ${menu.label} ».`, `Cliquez sur « ${action.label} ».`],
        tips: [], keywords: [], requires: [], actions: [], related: [detected.id],
        allowed: ALWAYS_OPEN.has(detected.id) || hasPermission(currentUser, detected.id, action.permission),
        permission: action.permission, parent: detected.id, errors: [], documented: true,
      });
    });
  });

  // Textes d'aide dont la fonctionnalité n'existe plus dans le code
  const allDetected = new Set(Object.values(manifest.modules).flatMap((module) => [module.id, ...module.subtabs.map((subtab) => `${module.id}/${subtab.id}`)]));
  Object.keys(FEATURE_CONTENT).forEach((id) => { if (!allDetected.has(id)) issues.orphanContent.push(id); });
  Object.keys(MODULE_CONTENT).forEach((id) => { if (!allDetected.has(id)) issues.orphanContent.push(id); });

  // Parcours : on garde les étapes qui existent encore et que l'utilisateur peut ouvrir
  const journeys = JOURNEYS.map((journey) => ({
    ...journey,
    steps: journey.steps.filter((step) => {
      const exists = allDetected.has(step.feature) && (!step.check || CHECKS[step.check]);
      if (!exists) issues.badJourneySteps.push(`${journey.id}: ${step.feature}`);
      return exists && knownIds.has(step.feature);
    }).map((step) => ({ ...step, allowed: features.find((feature) => feature.id === step.feature)?.allowed ?? false })),
  })).filter((journey) => journey.steps.length);

  return { modules, features, journeys, issues };
}
