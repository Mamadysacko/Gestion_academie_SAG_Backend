import {
  anneesScolairesApi,
  emploisApi,
  formateursApi,
  groupesApi,
  inscriptionsApi,
  niveauxApi,
  sallesApi,
  sessionsApi,
  typesFormationsApi,
} from '../config/apiService';

const rows = (response) => (response?.data || []).map((row) => {
  const normalized = { ...row };
  for (const key of ['id', 'user_id', 'id_annee', 'id_groupe', 'id_salle', 'id_formateur', 'id_session', 'id_niveau', 'id_type_formation', 'id_emploi_du_temps', 'jour_semaine', 'capacite', 'statut', 'actif']) {
    if (normalized[key] !== null && normalized[key] !== undefined && normalized[key] !== '') {
      const value = Number(normalized[key]);
      if (Number.isFinite(value)) normalized[key] = value;
    }
  }
  return normalized;
});

export async function loadPlanningData(currentUser) {
  const isAdmin = currentUser?.role_code === 'admin' || currentUser?.role === 'admin';
  const canRead = (module) => isAdmin || (currentUser?.permissions?.[module] || []).includes('read');
  const load = (allowed, request) => allowed ? request() : Promise.resolve({ data: [] });
  const canReadOrganisation = canRead('organisation-pedagogique');
  const canReadTrainers = canRead('formateurs');
  const canReadRooms = canRead('salles');
  const canReadSchedules = canRead('emplois-temps');
  const canReadEnrollments = canRead('auditeurs');

  const [
    yearsResponse,
    sessionsResponse,
    groupsResponse,
    levelsResponse,
    formationTypesResponse,
    trainersResponse,
    roomsResponse,
    schedulesResponse,
    enrollmentsResponse,
  ] = await Promise.all([
    load(canReadOrganisation, () => anneesScolairesApi.getAll()),
    load(canReadOrganisation, () => sessionsApi.getAll()),
    load(canReadOrganisation, () => groupesApi.getAll()),
    load(canReadOrganisation, () => niveauxApi.getAll()),
    load(canReadOrganisation, () => typesFormationsApi.getAll()),
    load(canReadTrainers, () => formateursApi.getAll()),
    load(canReadRooms, () => sallesApi.getAll()),
    load(canReadSchedules, () => emploisApi.getPlanningComplet()),
    load(canReadEnrollments, () => inscriptionsApi.getAll()),
  ]);

  const schedules = rows(schedulesResponse);
  return {
    annees_scolaires: rows(yearsResponse),
    sessions: rows(sessionsResponse),
    groupes: rows(groupsResponse),
    niveaux: rows(levelsResponse),
    types_formations: rows(formationTypesResponse),
    formateurs: rows(trainersResponse),
    salles: rows(roomsResponse),
    emplois_du_temps: schedules,
    inscriptions: rows(enrollmentsResponse),
    inscriptionsAccessibles: canReadEnrollments,
    presences: [],
    horaires_demo: {},
  };
}
