// Store et données de référence pour Utilisateurs, Rôles et Permissions (DB Gestion Academie.sql)

const STORAGE_USERS_KEY = 'gestion-academie-users-data';
const STORAGE_ROLES_KEY = 'gestion-academie-roles-data';

export const MODULES_PERMISSIONS = [
  { id: 'organisation-pedagogique', nom: 'Organisation Pédagogique', description: 'Années scolaires, formations, sessions et groupes' },
  { id: 'emplois-temps', nom: 'Emplois du temps', description: 'Planification des séances, affectation des salles et formateurs' },
  { id: 'auditeurs', nom: 'Auditeurs & Inscriptions', description: 'Fiches auditeurs, dossiers d’inscriptions et matricules' },
  { id: 'formateurs', nom: 'Formateurs', description: 'Gestion du corps enseignant, spécialités et contacts' },
  { id: 'salles', nom: 'Salles', description: 'Gestion des salles, capacités et équipements' },
  { id: 'evaluations', nom: 'Évaluations & Notes', description: 'Paramètres d’évaluation, saisie des notes et moyennes' },
  { id: 'presences', nom: 'Présences', description: 'Pointage des feuilles d’appel et suivi des assiduités' },
  { id: 'utilisateurs', nom: 'Utilisateurs & Sécurité', description: 'Comptes d’accès, rôles et permissions système' },
  { id: 'parametres', nom: 'Paramètres Généraux', description: 'Configuration globale de l’établissement et sauvegardes' },
  { id: 'passages-niveau', nom: 'Passages de niveau', description: 'Approuver ou annuler le passage d’auditeurs au niveau supérieur ou leur redoublement (l’administrateur le peut toujours)', actions: ['validate'] },
];

/** Actions proposées pour un module (toutes, sauf si le module restreint la liste). */
export const actionsFor = (module) => ACTIONS_PERMISSIONS.filter((action) => !module.actions || module.actions.includes(action.id));

export const ACTIONS_PERMISSIONS = [
  { id: 'read', label: 'Consulter (Lecture)', color: 'text-blue-600 bg-blue-50' },
  { id: 'create', label: 'Créer (Ajout)', color: 'text-emerald-600 bg-emerald-50' },
  { id: 'update', label: 'Modifier (Édition)', color: 'text-amber-600 bg-amber-50' },
  { id: 'delete', label: 'Supprimer', color: 'text-rose-600 bg-rose-50' },
  { id: 'export', label: 'Exporter (CSV/PDF)', color: 'text-purple-600 bg-purple-50' },
  { id: 'validate', label: 'Valider / Clôturer', color: 'text-indigo-600 bg-indigo-50' },
];

export const INITIAL_ROLES = [
  {
    id: 1,
    code: 'admin',
    nom: 'Administrateur Général',
    description: 'Accès complet et sans restriction à tous les modules et fonctionnalités du système.',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
    usersCount: 2,
    isSystem: true,
    permissions: {
      'organisation-pedagogique': ['read', 'create', 'update', 'delete', 'export', 'validate'],
      'emplois-temps': ['read', 'create', 'update', 'delete', 'export', 'validate'],
      'auditeurs': ['read', 'create', 'update', 'delete', 'export', 'validate'],
      'formateurs': ['read', 'create', 'update', 'delete', 'export', 'validate'],
      'salles': ['read', 'create', 'update', 'delete', 'export', 'validate'],
      'evaluations': ['read', 'create', 'update', 'delete', 'export', 'validate'],
      'presences': ['read', 'create', 'update', 'delete', 'export', 'validate'],
      'utilisateurs': ['read', 'create', 'update', 'delete', 'export', 'validate'],
      'parametres': ['read', 'create', 'update', 'delete', 'export', 'validate'],
      'passages-niveau': ['validate'],
    },
  },
  {
    id: 2,
    code: 'directeur',
    nom: 'Directeur Pédagogique',
    description: 'Supervision globale de la pédagogie, validation des emplois du temps et des notes.',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    usersCount: 1,
    isSystem: false,
    permissions: {
      'organisation-pedagogique': ['read', 'create', 'update', 'export', 'validate'],
      'emplois-temps': ['read', 'create', 'update', 'export', 'validate'],
      'auditeurs': ['read', 'create', 'update', 'export'],
      'formateurs': ['read', 'create', 'update', 'export'],
      'salles': ['read', 'create', 'update', 'export'],
      'evaluations': ['read', 'create', 'update', 'export', 'validate'],
      'presences': ['read', 'update', 'export', 'validate'],
      'utilisateurs': ['read'],
      'parametres': ['read'],
    },
  },
  {
    id: 3,
    code: 'formateur',
    nom: 'Formateur Enseignant',
    description: 'Accès limité à ses propres groupes, saisie des présences et des notes d’évaluation.',
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    usersCount: 6,
    isSystem: true,
    permissions: {
      'organisation-pedagogique': ['read'],
      'emplois-temps': ['read'],
      'auditeurs': ['read'],
      'formateurs': ['read'],
      'salles': ['read'],
      'evaluations': ['read', 'create', 'update'],
      'presences': ['read', 'create', 'update'],
      'utilisateurs': [],
      'parametres': [],
    },
  },
  {
    id: 4,
    code: 'secretaire',
    nom: 'Secrétaire Académique',
    description: 'Gestion des inscriptions auditeurs, accueil, planning des salles et pointages.',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
    usersCount: 2,
    isSystem: false,
    permissions: {
      'organisation-pedagogique': ['read'],
      'emplois-temps': ['read', 'update'],
      'auditeurs': ['read', 'create', 'update', 'export'],
      'formateurs': ['read'],
      'salles': ['read', 'update'],
      'evaluations': ['read'],
      'presences': ['read', 'create', 'update', 'export'],
      'utilisateurs': [],
      'parametres': [],
    },
  },
  {
    id: 5,
    code: 'auditeur_externe',
    nom: 'Consultant / Auditeur',
    description: 'Accès en lecture seule pour vérification, statistiques et audits externes.',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    usersCount: 1,
    isSystem: false,
    permissions: {
      'organisation-pedagogique': ['read', 'export'],
      'emplois-temps': ['read', 'export'],
      'auditeurs': ['read', 'export'],
      'formateurs': ['read', 'export'],
      'salles': ['read', 'export'],
      'evaluations': ['read', 'export'],
      'presences': ['read', 'export'],
      'utilisateurs': ['read'],
      'parametres': ['read'],
    },
  },
];

export const INITIAL_USERS = [
  {
    id: 1,
    nom: 'Kouassi',
    prenom: 'Jean-Marc',
    email: 'admin@academie.com',
    telephone: '0700000001',
    role_id: 1,
    role_code: 'admin',
    role_nom: 'Administrateur Général',
    actif: 1,
    last_login: '2026-10-05 09:30:12',
    created_at: '2025-09-01 10:00:00',
    avatar: 'JM',
    twoFactorEnabled: true,
  },
  {
    id: 2,
    nom: 'Kouamé',
    prenom: 'Élisabeth',
    email: 'direction@academie.com',
    telephone: '0700000002',
    role_id: 2,
    role_code: 'directeur',
    role_nom: 'Directeur Pédagogique',
    actif: 1,
    last_login: '2026-10-04 16:45:00',
    created_at: '2025-09-01 10:15:00',
    avatar: 'EK',
    twoFactorEnabled: false,
  },
  {
    id: 3,
    nom: 'Touré',
    prenom: 'Aïcha',
    email: 'aicha.toure@academie.com',
    telephone: '0700000101',
    role_id: 3,
    role_code: 'formateur',
    role_nom: 'Formateur Enseignant',
    actif: 1,
    last_login: '2026-10-05 08:25:40',
    created_at: '2025-09-10 11:00:00',
    avatar: 'AT',
    twoFactorEnabled: true,
  },
  {
    id: 4,
    nom: 'Mensah',
    prenom: 'Kwame',
    email: 'kwame.mensah@academie.com',
    telephone: '0700000102',
    role_id: 3,
    role_code: 'formateur',
    role_nom: 'Formateur Enseignant',
    actif: 1,
    last_login: '2026-10-04 18:10:22',
    created_at: '2025-09-10 11:30:00',
    avatar: 'KM',
    twoFactorEnabled: false,
  },
  {
    id: 5,
    nom: 'Diallo',
    prenom: 'Néné',
    email: 'nene.diallo@academie.com',
    telephone: '0700000103',
    role_id: 3,
    role_code: 'formateur',
    role_nom: 'Formateur Enseignant',
    actif: 1,
    last_login: '2026-10-03 14:00:00',
    created_at: '2025-09-15 09:00:00',
    avatar: 'ND',
    twoFactorEnabled: false,
  },
  {
    id: 6,
    nom: 'Bah',
    prenom: 'Mariam',
    email: 'mariam.bah@academie.com',
    telephone: '0700000104',
    role_id: 3,
    role_code: 'formateur',
    role_nom: 'Formateur Enseignant',
    actif: 1,
    last_login: '2026-10-05 08:15:00',
    created_at: '2025-09-15 09:30:00',
    avatar: 'MB',
    twoFactorEnabled: true,
  },
  {
    id: 7,
    nom: 'Camara',
    prenom: 'Fatou',
    email: 'fatou.camara@academie.com',
    telephone: '0700000105',
    role_id: 3,
    role_code: 'formateur',
    role_nom: 'Formateur Enseignant',
    actif: 1,
    last_login: '2026-10-02 17:30:00',
    created_at: '2025-09-18 14:00:00',
    avatar: 'FC',
    twoFactorEnabled: false,
  },
  {
    id: 8,
    nom: 'Bamba',
    prenom: 'Salimata',
    email: 'secretariat@academie.com',
    telephone: '0700000003',
    role_id: 4,
    role_code: 'secretaire',
    role_nom: 'Secrétaire Académique',
    actif: 1,
    last_login: '2026-10-05 08:00:15',
    created_at: '2025-09-02 08:30:00',
    avatar: 'SB',
    twoFactorEnabled: false,
  },
  {
    id: 9,
    nom: 'Koné',
    prenom: 'Bakary',
    email: 'bakary.kone@academie.com',
    telephone: '0700000004',
    role_id: 4,
    role_code: 'secretaire',
    role_nom: 'Secrétaire Académique',
    actif: 0,
    last_login: '2026-08-20 11:20:00',
    created_at: '2025-09-02 09:00:00',
    avatar: 'BK',
    twoFactorEnabled: false,
  },
  {
    id: 10,
    nom: 'Diabaté',
    prenom: 'Mamadou',
    email: 'audit@academie.com',
    telephone: '0700000005',
    role_id: 5,
    role_code: 'auditeur_externe',
    role_nom: 'Consultant / Auditeur',
    actif: 1,
    last_login: '2026-09-28 15:40:00',
    created_at: '2025-10-01 10:00:00',
    avatar: 'MD',
    twoFactorEnabled: false,
  },
];

export const INITIAL_AUDIT_LOGS = [
  { id: 1, timestamp: '2026-10-05 09:30:12', user: 'admin@academie.com', action: 'Connexion réussie', ip: '192.168.1.10', status: 'success', details: 'Session administrateur ouverte' },
  { id: 2, timestamp: '2026-10-05 08:25:40', user: 'aicha.toure@academie.com', action: 'Pointage présence', ip: '192.168.1.45', status: 'success', details: 'Feuille d’appel ANG-A1-ME validée' },
  { id: 3, timestamp: '2026-10-05 08:15:00', user: 'mariam.bah@academie.com', action: 'Connexion réussie', ip: '192.168.1.52', status: 'success', details: 'Authentification avec 2FA validée' },
  { id: 4, timestamp: '2026-10-04 16:45:00', user: 'direction@academie.com', action: 'Modification rôle', ip: '192.168.1.12', status: 'success', details: 'Permissions étendues pour le rôle Secrétaire' },
  { id: 5, timestamp: '2026-10-04 14:10:00', user: 'admin@academie.com', action: 'Désactivation compte', ip: '192.168.1.10', status: 'warning', details: 'Compte bakary.kone@academie.com suspendu' },
  { id: 6, timestamp: '2026-10-03 22:15:30', user: 'inconnu@test.com', action: 'Échec de connexion', ip: '102.16.4.88', status: 'danger', details: 'Mot de passe erroné (3 tentatives)' },
  { id: 7, timestamp: '2026-10-02 11:20:00', user: 'admin@academie.com', action: 'Création utilisateur', ip: '192.168.1.10', status: 'success', details: 'Nouvel utilisateur Mamadou Diabaté créé' },
];

export function getUsers() {
  if (typeof localStorage === 'undefined') return INITIAL_USERS;
  try {
    const saved = localStorage.getItem(STORAGE_USERS_KEY);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  } catch {
    return INITIAL_USERS;
  }
}

export function saveUsers(users) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    }
  } catch (e) {
    console.error('Error saving users', e);
  }
}

export function getRoles() {
  if (typeof localStorage === 'undefined') return INITIAL_ROLES;
  try {
    const saved = localStorage.getItem(STORAGE_ROLES_KEY);
    return saved ? JSON.parse(saved) : INITIAL_ROLES;
  } catch {
    return INITIAL_ROLES;
  }
}

export function saveRoles(roles) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_ROLES_KEY, JSON.stringify(roles));
    }
  } catch (e) {
    console.error('Error saving roles', e);
  }
}
