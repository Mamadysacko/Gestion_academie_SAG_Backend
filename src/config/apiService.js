/**
 * ================================================================
 *  Service API centralisé — AGES Frontend
 * ================================================================
 *
 *  Toutes les requêtes vers le backend passent par ce service.
 *  Base URL : http://localhost/Backend_AGES/Route
 *
 *  Usage :
 *    import api from '@/config/apiService';
 *    const { data } = await api.anneesScolaires.getAll();
 * ================================================================
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost/Backend_AGES/Route';

// ── Utilitaire fetch ──────────────────────────────────────────────────────────
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}/${endpoint}`;

  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: { ...defaultOptions.headers, ...(options.headers || {}) },
  };

  let response;
  try {
    response = await fetch(url, mergedOptions);
  } catch {
    throw new ApiError(
      `La requête vers l'API (${API_BASE_URL}) a échoué depuis le navigateur. Vérifiez l'URL, la connexion et la configuration CORS du backend.`,
      0,
      null
    );
  }

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  let body;
  if (contentType.includes('application/json')) {
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      throw new ApiError(
        `Réponse JSON invalide de l'API (HTTP ${response.status}) : ${text.slice(0, 200)}`,
        response.status,
        null
      );
    }
  } else {
    body = { success: false, error: text || `Erreur HTTP ${response.status}` };
  }

  if (!response.ok) {
    throw new ApiError(body.error || `Erreur HTTP ${response.status}`, response.status, body);
  }

  // Toute écriture réussie prévient les écrans ouverts : ils se réactualisent en silence.
  const method = (mergedOptions.method || 'GET').toUpperCase();
  if (method !== 'GET' && !endpoint.startsWith('auth/login') && !endpoint.startsWith('auth/logout')) {
    notifyDataChanged(endpoint);
  }

  return body;
}

// ── Signal « données modifiées » ──────────────────────────────────────────────
export const DATA_CHANGED_EVENT = 'ages:data-changed';
let changeTimer = null;
const changedResources = new Set();

/** Regroupe les écritures rapprochées (ex. pointage groupé) en un seul signal. */
function notifyDataChanged(endpoint) {
  if (typeof window === 'undefined') return;
  changedResources.add(endpoint.split(/[/?]/)[0]);
  window.clearTimeout(changeTimer);
  changeTimer = window.setTimeout(() => {
    const resources = [...changedResources];
    changedResources.clear();
    window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail: { resources } }));
  }, 250);
}

// ── Classe d'erreur API ───────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

// ── Helpers HTTP ──────────────────────────────────────────────────────────────
const get = (endpoint) => request(endpoint, { method: 'GET' });

const post = (endpoint, data) =>
  request(endpoint, { method: 'POST', body: JSON.stringify(data) });

const put = (endpoint, data) =>
  request(endpoint, { method: 'PUT', body: JSON.stringify(data) });

const del = (endpoint) => request(endpoint, { method: 'DELETE' });

// ════════════════════════════════════════════════════════════════════════════
//  Modules API
// ════════════════════════════════════════════════════════════════════════════

/** Authentification */
export const authApi = {
  /** POST /auth/login */
  login: (credentials) => post('auth/login', credentials),
  /** GET /auth/me */
  me: () => get('auth/me'),
  /** GET /auth/profile */
  getProfile: () => get('auth/profile'),
  /** PUT /auth/profile */
  updateProfile: (data) => put('auth/profile', data),
  /** GET /auth/trainer-portal */
  getTrainerPortal: (date) => get(`auth/trainer-portal${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  /** POST /auth/trainer-portal/presences */
  markTrainerPresence: (data) => post('auth/trainer-portal/presences', data),
  /** GET /auth/trainer-portal/feuille — auditeurs attendus aujourd'hui dans les classes du formateur */
  getTrainerFeuille: (date) => get(`auth/trainer-portal/feuille${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  /** POST /auth/trainer-portal/presences-bulk */
  markTrainerPresenceBulk: (data) => post('auth/trainer-portal/presences-bulk', data),
  /** GET /auth/trainer-portal/resultats/{id_session} */
  getTrainerResultats: (sessionId) => get(`auth/trainer-portal/resultats/${sessionId}`),
  /** POST /auth/trainer-portal/notes */
  saveTrainerGrade: (data) => post('auth/trainer-portal/notes', data),
  /** POST /auth/logout */
  logout: () => post('auth/logout', {}),
  /** POST /users/authenticate (alias legacy) */
  authenticate: (credentials) => post('users/authenticate', credentials),
};

/** Années scolaires */
export const anneesScolairesApi = {
  getAll: () => get('annees-scolaires'),
  getById: (id) => get(`annees-scolaires/${id}`),
  getActive: () => get('annees-scolaires/active'),
  create: (data) => post('annees-scolaires', data),
  update: (id, data) => put(`annees-scolaires/${id}`, data),
  delete: (id) => del(`annees-scolaires/${id}`),
  activate: (id) => post(`annees-scolaires/${id}/activate`),
};

/** Rôles */
export const rolesApi = {
  getAll: () => get('roles'),
  getById: (id) => get(`roles/${id}`),
  getByCode: (code) => get(`roles/code/${code}`),
  create: (data) => post('roles', data),
  update: (id, data) => put(`roles/${id}`, data),
  updatePermissions: (id, permissions) => put(`roles/${id}/permissions`, { permissions }),
  delete: (id) => del(`roles/${id}`),
};

/** Utilisateurs */
export const usersApi = {
  getAll: () => get('users'),
  getById: (id) => get(`users/${id}`),
  getByEmail: (email) => get(`users/email/${encodeURIComponent(email)}`),
  getByRole: (roleId) => get(`users/role/${roleId}`),
  create: (data) => post('users', data),
  update: (id, data) => put(`users/${id}`, data),
  delete: (id) => del(`users/${id}`),
  toggleActif: (id) => post(`users/${id}/toggle-actif`),
};

/** Départements */
export const departementsApi = {
  getAll: () => get('departements'),
  getById: (id) => get(`departements/${id}`),
  getByCode: (code) => get(`departements/code/${code}`),
  create: (data) => post('departements', data),
  update: (id, data) => put(`departements/${id}`, data),
  delete: (id) => del(`departements/${id}`),
};

/** Niveaux */
export const niveauxApi = {
  getAll: () => get('niveaux'),
  getById: (id) => get(`niveaux/${id}`),
  getByLibelle: (libelle) => get(`niveaux/libelle/${encodeURIComponent(libelle)}`),
  create: (data) => post('niveaux', data),
  update: (id, data) => put(`niveaux/${id}`, data),
  delete: (id) => del(`niveaux/${id}`),
};

/** Types de formation */
export const typesFormationsApi = {
  getAll: () => get('types-formations'),
  getById: (id) => get(`types-formations/${id}`),
  getByLibelle: (libelle) => get(`types-formations/libelle/${encodeURIComponent(libelle)}`),
  create: (data) => post('types-formations', data),
  update: (id, data) => put(`types-formations/${id}`, data),
  delete: (id) => del(`types-formations/${id}`),
};

/** Sessions de formation */
export const sessionsApi = {
  getAll: () => get('sessions'),
  getById: (id) => get(`sessions/${id}`),
  getWithRelations: (id) => get(`sessions/${id}/relations`),
  getByAnnee: (anneeId) => get(`sessions/annee/${anneeId}`),
  getByTypeFormation: (typeId) => get(`sessions/type-formation/${typeId}`),
  getByNiveau: (niveauId) => get(`sessions/niveau/${niveauId}`),
  create: (data) => post('sessions', data),
  update: (id, data) => put(`sessions/${id}`, data),
  delete: (id) => del(`sessions/${id}`),
  changeStatut: (id, data) => post(`sessions/${id}/statut`, data),
};

/** Groupes */
export const groupesApi = {
  getAll: () => get('groupes'),
  getById: (id) => get(`groupes/${id}`),
  getWithSession: (id) => get(`groupes/${id}/session`),
  getPlacesRestantes: (id) => get(`groupes/${id}/places-restantes`),
  /** GET /groupes/{id}/salles → salles du groupe (formateur, effectif, auditeurs) */
  getSalles: (id) => get(`groupes/${id}/salles`),
  getBySession: (sessionId) => get(`groupes/session/${sessionId}`),
  getByJour: (jour) => get(`groupes/jour/${jour}`),
  create: (data) => post('groupes', data),
  update: (id, data) => put(`groupes/${id}`, data),
  delete: (id) => del(`groupes/${id}`),
};

/** Formateurs */
export const formateursApi = {
  getAll: () => get('formateurs'),
  getById: (id) => get(`formateurs/${id}`),
  getActifs: () => get('formateurs/actifs'),
  getByMatricule: (m) => get(`formateurs/matricule/${m}`),
  getByEmail: (email) => get(`formateurs/email/${encodeURIComponent(email)}`),
  getByUser: (userId) => get(`formateurs/user/${userId}`),
  create: (data) => post('formateurs', data),
  update: (id, data) => put(`formateurs/${id}`, data),
  delete: (id) => del(`formateurs/${id}`),
  toggleActif: (id) => post(`formateurs/${id}/toggle-actif`),
};

/** Salles */
export const sallesApi = {
  getAll: () => get('salles'),
  getById: (id) => get(`salles/${id}`),
  getDisponibles: () => get('salles/disponibles'),
  getByCode: (code) => get(`salles/code/${code}`),
  create: (data) => post('salles', data),
  update: (id, data) => put(`salles/${id}`, data),
  delete: (id) => del(`salles/${id}`),
  changeStatut: (id, data) => post(`salles/${id}/statut`, data),
};

/** Auditeurs */
export const auditeursApi = {
  getAll: () => get('auditeurs'),
  getById: (id) => get(`auditeurs/${id}`),
  getByMatricule: (m) => get(`auditeurs/matricule/${m}`),
  search: (query) => get(`auditeurs/search/${encodeURIComponent(query)}`),
  /** GET /auditeurs/{id}/dossier — identité, affectations, présences, notes, résultats */
  getDossier: (id) => get(`auditeurs/${id}/dossier`),
  create: (data) => post('auditeurs', data),
  update: (id, data) => put(`auditeurs/${id}`, data),
  delete: (id) => del(`auditeurs/${id}`),
};

/** Types d'employés (rattachés aux auditeurs) */
export const typesEmployesApi = {
  getAll: () => get('types-employes'),
  getById: (id) => get(`types-employes/${id}`),
  create: (data) => post('types-employes', data),
  update: (id, data) => put(`types-employes/${id}`, data),
  delete: (id) => del(`types-employes/${id}`),
};

/** Inscriptions */
export const inscriptionsApi = {
  /** GET /inscriptions?id_annee=&id_session= */
  getAll: ({ id_annee, id_session } = {}) => {
    const params = new URLSearchParams();
    if (id_annee) params.set('id_annee', id_annee);
    if (id_session) params.set('id_session', id_session);
    return get(`inscriptions${params.size ? `?${params.toString()}` : ''}`);
  },
  getById: (id) => get(`inscriptions/${id}`),
  getWithDetails: (id) => get(`inscriptions/${id}/details`),
  getByAuditeur: (auditeurId) => get(`inscriptions/auditeur/${auditeurId}`),
  getByGroupe: (groupeId) => get(`inscriptions/groupe/${groupeId}`),
  getByDepartement: (deptId) => get(`inscriptions/departement/${deptId}`),
  create: (data) => post('inscriptions', data),
  update: (id, data) => put(`inscriptions/${id}`, data),
  delete: (id) => del(`inscriptions/${id}`),
  changeStatut: (id, data) => post(`inscriptions/${id}/statut`, data),
};

/** Emplois du temps */
export const emploisApi = {
  getAll: () => get('emplois-du-temps'),
  getById: (id) => get(`emplois-du-temps/${id}`),
  getPlanningComplet: () => get('emplois-du-temps/planning-complet'),
  getByGroupe: (groupeId) => get(`emplois-du-temps/groupe/${groupeId}`),
  getBySalle: (salleId) => get(`emplois-du-temps/salle/${salleId}`),
  getByFormateur: (formateurId) => get(`emplois-du-temps/formateur/${formateurId}`),
  getByJour: (jour) => get(`emplois-du-temps/jour/${jour}`),
  getByAnnee: (anneeId) => get(`emplois-du-temps/annee/${anneeId}`),
  create: (data) => post('emplois-du-temps', data),
  update: (id, data) => put(`emplois-du-temps/${id}`, data),
  delete: (id) => del(`emplois-du-temps/${id}`),
  checkDisponibilite: (data) => post('emplois-du-temps/check-disponibilite', data),
};

/** Évaluations */
export const evaluationsApi = {
  getAll: () => get('evaluations'),
  getById: (id) => get(`evaluations/${id}`),
  getBySession: (sessionId) => get(`evaluations/session/${sessionId}`),
  create: (data) => post('evaluations', data),
  /** POST /evaluations/generer/{id_session} — crée les évaluations 1 à N manquantes */
  generer: (sessionId) => post(`evaluations/generer/${sessionId}`, {}),
  update: (id, data) => put(`evaluations/${id}`, data),
  delete: (id) => del(`evaluations/${id}`),
};

/** Paramètres d'évaluation */
export const parametresEvaluationApi = {
  getAll: () => get('parametres'),
  getById: (id) => get(`parametres/${id}`),
  getByEvaluation: (evalId) => get(`parametres/evaluation/${evalId}`),
  create: (data) => post('parametres', data),
  attachToEvaluation: (evalId, data) => post(`parametres/evaluation/${evalId}`, data),
  detachFromEvaluation: (evalId, parameterId) => del(`parametres/evaluation/${evalId}/${parameterId}`),
  update: (id, data) => put(`parametres/${id}`, data),
  delete: (id) => del(`parametres/${id}`),
};

/** Notes */
export const notesApi = {
  getAll: () => get('notes'),
  getById: (id) => get(`notes/${id}`),
  getByEvaluation: (evaluationId) => get(`notes/evaluation/${evaluationId}`),
  getByInscription: (inscriptionId) => get(`notes/inscription/${inscriptionId}`),
  getByParametre: (parametreId) => get(`notes/parametre/${parametreId}`),
  getMoyenne: (inscriptionId) => get(`notes/moyenne/${inscriptionId}`),
  create: (data) => post('notes', data),
  saveOrUpdate: (data) => post('notes/save-or-update', data),
  update: (id, data) => put(`notes/${id}`, data),
  delete: (id) => del(`notes/${id}`),
};

/** Résultats calculés (moyennes, appréciations, admis / non admis / en attente) */
export const resultatsApi = {
  getSession: (sessionId, { id_groupe, id_salle } = {}) => {
    const params = new URLSearchParams();
    if (id_groupe) params.set('id_groupe', id_groupe);
    if (id_salle) params.set('id_salle', id_salle);
    return get(`resultats/session/${sessionId}${params.size ? `?${params.toString()}` : ''}`);
  },
  getAuditeur: (auditeurId) => get(`resultats/auditeur/${auditeurId}`),
  validerPassages: (sessionId) => post(`resultats/valider/${sessionId}`, {}),
  getRegles: () => get('regles-evaluation'),
  updateRegles: (data) => put('regles-evaluation', data),
};

/** Passages de niveau */
export const passagesNiveauxApi = {
  getAll: () => get('passages-niveaux'),
  getById: (id) => get(`passages-niveaux/${id}`),
  getByInscription: (inscriptionId) => get(`passages-niveaux/inscription/${inscriptionId}`),
  create: (data) => post('passages-niveaux', data),
  decide: (data) => post('passages-niveaux/decide', data),
  update: (id, data) => put(`passages-niveaux/${id}`, data),
  delete: (id) => del(`passages-niveaux/${id}`),
};

/** Présences */
export const presencesApi = {
  getAll: () => get('presences'),
  getById: (id) => get(`presences/${id}`),
  getByInscription: (inscriptionId) => get(`presences/inscription/${inscriptionId}`),
  getByDate: (date) => get(`presences/date/${date}`),
  getByFormateur: (formateurId) => get(`presences/formateur/${formateurId}`),
  getByEmploiDuTemps: (emploiId) => get(`presences/emploi-du-temps/${emploiId}`),
  getStatistiques: (inscriptionId) => get(`presences/statistiques/${inscriptionId}`),
  create: (data) => post('presences', data),
  mark: (data) => post('presences/mark', data),
  /** POST /presences/mark-bulk { date_presence, statut, ids } */
  markBulk: (data) => post('presences/mark-bulk', data),
  /** GET /presences/feuille?date=&id_session=&id_groupe=&id_salle=&id_formateur= */
  getFeuille: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    return get(`presences/feuille${params.size ? `?${params.toString()}` : ''}`);
  },
  update: (id, data) => put(`presences/${id}`, data),
  delete: (id) => del(`presences/${id}`),
};

/** Tableau de bord et rapports périodiques */
/** Rapports : catalogue et génération (55 rapports en 7 catégories) */
export const rapportsApi = {
  catalogue: () => get('rapports'),
  generate: (code, filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value !== '' && value != null) params.set(key, value); });
    return get(`rapports/${code}${params.size ? `?${params.toString()}` : ''}`);
  },
};

/** Rappels (points importants à traiter selon le rôle) */
export const rappelsApi = { getAll: () => get('rappels') };

/** Journal des opérations */
export const journalApi = {
  search: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value !== '' && value != null) params.set(key, value); });
    return get(`journal${params.size ? `?${params.toString()}` : ''}`);
  },
};

export const dashboardApi = {
  getOverview: ({ date, id_annee, id_session } = {}) => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (id_annee) params.set('id_annee', id_annee);
    if (id_session) params.set('id_session', id_session);
    return get(`tableau-de-bord${params.size ? `?${params.toString()}` : ''}`);
  },
  /** Rapport : type journalier | hebdomadaire | mensuel | annuel | session | periode (+ date_debut / date_fin). */
  getReport: ({ type, ...filters }) => {
    const params = new URLSearchParams({ type });
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    return get(`tableau-de-bord/rapport?${params.toString()}`);
  },
};

// ── Export global groupé ──────────────────────────────────────────────────────
const api = {
  auth: authApi,
  anneesScolaires: anneesScolairesApi,
  roles: rolesApi,
  users: usersApi,
  departements: departementsApi,
  niveaux: niveauxApi,
  typesFormations: typesFormationsApi,
  sessions: sessionsApi,
  groupes: groupesApi,
  formateurs: formateursApi,
  salles: sallesApi,
  auditeurs: auditeursApi,
  typesEmployes: typesEmployesApi,
  inscriptions: inscriptionsApi,
  emplois: emploisApi,
  evaluations: evaluationsApi,
  parametresEvaluation: parametresEvaluationApi,
  notes: notesApi,
  resultats: resultatsApi,
  passagesNiveaux: passagesNiveauxApi,
  presences: presencesApi,
  dashboard: dashboardApi,
};

export default api;
