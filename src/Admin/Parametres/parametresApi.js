import { apiRequest as request } from '../../config/apiService';

/**
 * Normalisation des noms de ressources vers les endpoints de l'API Backend_AGES.
 */
const RESOURCE_ENDPOINTS = {
  departements: 'departements',
  niveaux: 'niveaux',
  'types-formations': 'types-formations',
  'types-formation': 'types-formations',
  'types-employes': 'types-employes',
  'regles-passage': 'regles-passage',
  'baremes-appreciation': 'baremes-appreciation',
  sessions: 'sessions',
  'parametres-evaluations': 'parametres-evaluations',
  'parametres-evaluation': 'parametres-evaluations',
  evaluations: 'evaluations',
  'annees-scolaires': 'annees-scolaires',
  salles: 'salles',
  formateurs: 'formateurs',
  groupes: 'groupes',
  roles: 'roles',
  users: 'users',
};

/**
 * Convertit un identifiant de ressource en segment d'URL valide.
 */
export function normalizeResource(resource) {
  return RESOURCE_ENDPOINTS[resource] || resource;
}

/**
 * Exécute une requête HTTP JSON standardisée vers l'API Backend_AGES.
 */
async function apiRequest(endpoint, options = {}) {
  const data = await request(endpoint.replace(/^\/+/, ''), {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  });
  if (data && data.success === false) {
    throw new Error(data.error || data.message || 'Erreur serveur');
  }
  return data;
}

/**
 * Récupère tous les enregistrements d'une ressource depuis la base de données.
 */
export async function getResource(resource) {
  const endpoint = normalizeResource(resource);
  const result = await apiRequest(endpoint, { method: 'GET' });
  if (Array.isArray(result?.data)) {
    return result.data;
  }
  if (result?.data && typeof result.data === 'object') {
    return [result.data];
  }
  return [];
}

/**
 * Récupère un enregistrement par son identifiant.
 */
export async function getResourceById(resource, id) {
  const endpoint = `${normalizeResource(resource)}/${id}`;
  const result = await apiRequest(endpoint, { method: 'GET' });
  return result?.data ?? null;
}

/**
 * Crée ou met à jour un enregistrement dans la base de données.
 */
export async function saveResource(resource, record, recordId = null) {
  const endpoint = normalizeResource(resource);
  const safePayload = { ...record };

  // Retrait des champs non pertinents pour l'insertion / modification directe
  delete safePayload.password;
  delete safePayload.created_at;
  delete safePayload.updated_at;

  if (recordId !== null && recordId !== undefined && recordId !== '') {
    // Mise à jour (PUT)
    return await apiRequest(`${endpoint}/${recordId}`, {
      method: 'PUT',
      body: safePayload,
    });
  }

  // Création (POST)
  return await apiRequest(endpoint, {
    method: 'POST',
    body: safePayload,
  });
}

/**
 * Supprime un enregistrement de la base de données.
 */
export async function deleteResource(resource, recordId) {
  const endpoint = `${normalizeResource(resource)}/${recordId}`;
  return await apiRequest(endpoint, { method: 'DELETE' });
}

/**
 * Helper pour extraire l'identifiant primaire de manière tolérante.
 */
export function optionId(item) {
  if (!item || typeof item !== 'object') return null;
  return item.id ?? item.id_annee ?? item.id_type_formation ?? item.id_niveau ?? item.id_evaluation ?? null;
}
