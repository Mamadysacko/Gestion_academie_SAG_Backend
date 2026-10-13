const storageKey = 'gestion-academie-parametres-demo';

const sampleData = {
  roles: [
    { id: 1, code: 'ADMIN', nom: 'Administrateur' },
    { id: 2, code: 'GESTION', nom: 'Gestionnaire' },
  ],
  users: [
    { id: 1, nom: 'Diallo', prenom: 'Aminata', email: 'aminata.diallo@example.test', telephone: '0700000001', role_id: 1, actif: 1 },
    { id: 2, nom: 'Koné', prenom: 'Moussa', email: 'moussa.kone@example.test', telephone: '0700000002', role_id: 2, actif: 1 },
  ],
  departements: [
    { id: 1, code: 'ANG', libelle: 'Anglais' },
    { id: 2, code: 'ESP', libelle: 'Espagnol' },
  ],
  niveaux: [
    { id: 1, libelle: 'A1 - Débutant' },
    { id: 2, libelle: 'A2 - Élémentaire' },
    { id: 3, libelle: 'B1 - Intermédiaire' },
  ],
  'types-formation': [
    { id: 1, libelle: 'Cours intensif' },
    { id: 2, libelle: 'Cours du soir' },
  ],
  'annees-scolaires': [
    { id: 1, libelle: '2025-2026', date_debut: '2025-09-01', date_fin: '2026-06-30', statut: 1 },
  ],
  sessions: [
    { id: 1, id_annee: 1, id_type_formation: 1, id_niveau: 1, code: 'ANG-A1-2526', libelle: 'Anglais A1 - session automne', date_debut: '2025-09-15', date_fin: '2025-12-20', statut: 'en_cours' },
    { id: 2, id_annee: 1, id_type_formation: 2, id_niveau: 2, code: 'ANG-A2-2526', libelle: 'Anglais A2 - cours du soir', date_debut: '2026-01-12', date_fin: '2026-05-30', statut: 'planifiee' },
  ],
  evaluations: [
    { id: 1, id_session: 1, libelle: 'Évaluation de mi-parcours', date_evaluation: '2025-11-15' },
    { id: 2, id_session: 1, libelle: 'Évaluation finale', date_evaluation: '2025-12-15' },
  ],
  'parametres-evaluation': [
    { id: 1, id_evaluation: 1, libelle: 'Expression orale', bareme: 4 },
    { id: 2, id_evaluation: 1, libelle: 'Compréhension écrite', bareme: 4 },
  ],
};

const copy = (value) => JSON.parse(JSON.stringify(value));

function readStore() {
  if (typeof localStorage === 'undefined') return copy(sampleData);
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? { ...copy(sampleData), ...JSON.parse(saved) } : copy(sampleData);
  } catch {
    return copy(sampleData);
  }
}

let store = readStore();

function persistStore() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, JSON.stringify(store));
  } catch {
    // Les données restent utilisables en mémoire si le stockage du navigateur est indisponible.
  }
}

export function getResource(resource) {
  return copy(store[resource] || []);
}

export function saveResource(resource, record, recordId = null, idField = 'id') {
  const rows = store[resource] || [];
  const safeRecord = { ...record };
  delete safeRecord.password;

  if (recordId !== null) {
    store[resource] = rows.map((row) => (
      String(row[idField]) === String(recordId) ? { ...row, ...safeRecord, [idField]: row[idField] } : row
    ));
  } else {
    const nextId = rows.reduce((maximum, row) => Math.max(maximum, Number(row[idField]) || 0), 0) + 1;
    store[resource] = [...rows, { ...safeRecord, [idField]: nextId }];
  }

  persistStore();
  return getResource(resource);
}

export function deleteResource(resource, recordId, idField = 'id') {
  store[resource] = (store[resource] || []).filter((row) => String(row[idField]) !== String(recordId));
  persistStore();
  return getResource(resource);
}

export function optionId(item) {
  return item.id ?? item.id_annee_scolaire ?? item.id_type_formation ?? item.id_niveau ?? item.id_evaluation;
}