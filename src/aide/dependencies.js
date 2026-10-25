/**
 * Vérification des prérequis d'une fonctionnalité.
 *
 * Les prérequis « structurels » ne sont pas écrits à la main : ils sont déduits du schéma de la
 * base (clés étrangères obligatoires de la table que la fonctionnalité alimente, relevées par
 * tools/featuresPlugin.js). Chaque prérequis est ensuite vérifié sur les données réelles via
 * l'API, avec les droits de l'utilisateur connecté.
 *
 * États :
 *   ok       → Disponible : l'élément existe et peut être utilisé
 *   partial  → À compléter : il existe mais une configuration nécessaire manque
 *   missing  → Manquant : aucun élément n'existe
 *   unknown  → Non vérifiable : droits insuffisants ou serveur injoignable
 */
import {
  anneesScolairesApi, auditeursApi, departementsApi, emploisApi, evaluationsApi, formateursApi,
  groupesApi, inscriptionsApi, niveauxApi, notesApi, parametresEvaluationApi, presencesApi,
  positionsApi, rolesApi, sallesApi, sessionsApi, typesEmployesApi, typesFormationsApi, usersApi,
} from '../config/apiService';

export const STATE_LABELS = {
  ok: 'Disponible',
  partial: 'À compléter',
  missing: 'Manquant',
  unknown: 'Non vérifiable',
};

/**
 * Un contrôle par table de la base. `permission` : module dont la lecture est nécessaire ;
 * `create` : fonctionnalité qui permet de créer l'élément (lien proposé quand il manque).
 */
export const CHECKS = {
  annees_scolaires: { label: 'Année scolaire', permission: 'organisation-pedagogique', list: () => anneesScolairesApi.getAll(), create: 'parametres/annees' },
  types_formations: { label: 'Type de formation', permission: 'organisation-pedagogique', list: () => typesFormationsApi.getAll(), create: 'parametres/types' },
  niveaux: { label: 'Niveau', permission: 'organisation-pedagogique', list: () => niveauxApi.getAll(), create: 'parametres/niveaux' },
  departements: { label: 'Département', permission: 'organisation-pedagogique', list: () => departementsApi.getAll(), create: 'parametres/departements' },
  positions: { label: 'Position', permission: 'auditeurs', list: () => positionsApi.getAll(), create: 'parametres/positions' },
  types_employes: { label: 'Type d’employé', permission: 'auditeurs', list: () => typesEmployesApi.getAll(), create: 'parametres/types-employes' },
  sessions: { label: 'Session', permission: 'organisation-pedagogique', list: () => sessionsApi.getAll(), create: 'parametres/sessions' },
  groupes: { label: 'Groupe', permission: 'organisation-pedagogique', list: () => groupesApi.getAll(), create: 'parametres/groupes' },
  salles: { label: 'Salle', permission: 'salles', list: () => sallesApi.getAll(), create: 'salles/salles' },
  formateurs: { label: 'Formateur', permission: 'formateurs', list: () => formateursApi.getAll(), create: 'formateurs/liste' },
  auditeurs: { label: 'Auditeur', permission: 'auditeurs', list: () => auditeursApi.getAll(), create: 'auditeurs/liste' },
  emplois_du_temps: { label: 'Affectation classe–salle (emploi du temps)', permission: 'emplois-temps', list: () => emploisApi.getAll(), create: 'salles/affectations' },
  inscriptions: { label: 'Inscription', permission: 'auditeurs', list: () => inscriptionsApi.getAll(), create: 'auditeurs/inscriptions' },
  evaluations: { label: 'Évaluation', permission: 'evaluations', list: () => evaluationsApi.getAll(), create: 'evaluations/types' },
  parametres: { label: 'Critère d’évaluation', permission: 'evaluations', list: () => parametresEvaluationApi.getAll(), create: 'evaluations/types' },
  notes: { label: 'Note saisie', permission: 'evaluations', list: () => notesApi.getAll(), create: 'evaluations/saisie' },
  presences: { label: 'Pointage de présence', permission: 'presences', list: () => presencesApi.getAll(), create: 'presences/date' },
  roles: { label: 'Rôle', permission: 'utilisateurs', list: () => rolesApi.getAll(), create: 'utilisateurs/roles' },
  users: { label: 'Compte utilisateur', permission: 'utilisateurs', list: () => usersApi.getAll(), create: 'utilisateurs/liste' },

  // Contrôle composé : créer une salle suppose qu'un formateur sans salle puisse lui être attribué
  // (un formateur = une salle, et une salle sans formateur ne peut pas être affectée à un groupe).
  // Détecte aussi les comptes « Formateur » qui n'ont pas de profil formateur (compte créé mais profil absent).
  formateurs_libres: {
    label: 'Formateur disponible (sans salle attitrée)',
    permission: 'formateurs',
    create: 'utilisateurs/liste#create',
    evaluate: async () => {
      const formateurs = (await formateursApi.getAll()).data || [];
      const free = formateurs.filter((item) => !item.id_salle && Number(item.actif) === 1);
      if (free.length) return { state: 'ok', count: free.length, detail: `${free.length} formateur(s) disponible(s) pour une nouvelle salle.` };
      let orphans = 0;
      try {
        const [roles, users] = await Promise.all([rolesApi.getAll(), usersApi.getAll()]);
        const roleId = (roles.data || []).find((role) => role.code === 'formateur')?.id;
        const linked = new Set(formateurs.map((item) => Number(item.user_id)));
        orphans = (users.data || []).filter((user) => roleId && Number(user.role_id) === Number(roleId) && !linked.has(Number(user.id))).length;
      } catch { /* droits insuffisants sur les comptes : on se contente des profils formateurs */ }
      if (!formateurs.length) {
        return {
          state: 'missing',
          count: 0,
          // Des comptes existent déjà : il faut les compléter (matricule), pas en créer de nouveaux.
          target: orphans ? 'utilisateurs/liste' : undefined,
          detail: orphans
            ? `Aucun profil formateur n’existe, alors que ${orphans} compte(s) au rôle « Formateur » existent : ouvrez-les dans Utilisateurs & rôles et renseignez leur matricule pour créer le profil.`
            : 'Aucun formateur n’existe : créez d’abord un compte formateur (Utilisateurs & rôles).',
        };
      }
      return { state: 'partial', count: 0, detail: 'Tous les formateurs ont déjà une salle attitrée : créez un nouveau formateur pour la nouvelle salle.' };
    },
  },

  // Contrôle composé : une salle ne peut être affectée à un groupe que si elle a un formateur attitré
  // (règle appliquée par le formulaire d'affectation).
  salles_avec_formateur: {
    label: 'Salle avec formateur attitré',
    permission: ['salles', 'formateurs'],
    create: 'salles/salles',
    evaluate: async () => {
      const [salles, formateurs] = await Promise.all([sallesApi.getAll(), formateursApi.getAll()]);
      const rooms = salles.data || [];
      const withTrainer = new Set((formateurs.data || []).filter((item) => item.id_salle).map((item) => Number(item.id_salle)));
      const equipped = rooms.filter((room) => withTrainer.has(Number(room.id))).length;
      if (!rooms.length) return { state: 'missing', count: 0, detail: 'Aucune salle n’existe.' };
      if (!equipped) return { state: 'partial', count: 0, detail: `${rooms.length} salle(s) existent, mais aucune n’a de formateur attitré : modifiez une salle pour lui attribuer son formateur.` };
      return { state: 'ok', count: equipped, detail: `${equipped} salle(s) avec formateur attitré sur ${rooms.length}.` };
    },
  },
};

/** Décompose une cible de redirection « module/sous-onglet#action » (ex. utilisateurs/liste#create). */
export function parseTarget(target) {
  if (!target) return null;
  const [path, action = null] = target.split('#');
  const [moduleId, tabId = null] = path.split('/');
  return { moduleId, tabId, action };
}

const canRead = (user, module) => user?.role_code === 'admin' || user?.role === 'admin'
  || (user?.permissions?.[module] || []).includes('read');

/** Évalue un contrôle sur les données réelles. Ne lève jamais d'erreur : renvoie `unknown` en cas de doute. */
export async function evaluateCheck(id, user) {
  const check = CHECKS[id];
  if (!check) return { state: 'unknown', count: null, detail: 'Ce prérequis ne peut pas être vérifié automatiquement.' };
  const modules = [].concat(check.permission);
  if (!modules.every((module) => canRead(user, module))) {
    return { state: 'unknown', count: null, detail: 'Votre rôle ne permet pas de consulter cet élément : demandez confirmation à un administrateur.' };
  }
  try {
    if (check.evaluate) return await check.evaluate();
    const response = await check.list();
    const count = Array.isArray(response.data) ? response.data.length : 0;
    return count > 0
      ? { state: 'ok', count, detail: `${count} enregistré(s).` }
      : { state: 'missing', count: 0, detail: 'Aucun enregistrement.' };
  } catch (error) {
    return { state: 'unknown', count: null, detail: error?.status === 403 ? 'Accès refusé à cet élément.' : 'Le serveur n’a pas pu répondre.' };
  }
}

/**
 * Prérequis d'une fonctionnalité : parents obligatoires de la table qu'elle alimente (schéma SQL),
 * plus les prérequis métier supplémentaires déclarés dans son contenu d'aide.
 */
export function requirementsFor({ creates, extraRequires = [] }, schema) {
  const fromSchema = creates
    ? (schema[creates]?.foreignKeys || []).filter((fk) => fk.required).map((fk) => fk.references)
    : [];
  return [...new Set([...fromSchema, ...extraRequires])];
}
