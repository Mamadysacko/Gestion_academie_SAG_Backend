import { getPresenceData } from '../Presences/presenceData.js';
import { getSallesData } from '../Salles/sallesData.js';

const storageKey = 'gestion-academie-formateurs-demo';
const references = getPresenceData();

const defaultTimes = {
  1: { heure_debut: '08:00', heure_fin: '10:00' },
  2: { heure_debut: '10:00', heure_fin: '12:00' },
  3: { heure_debut: '08:30', heure_fin: '10:30' },
  4: { heure_debut: '14:00', heure_fin: '16:00' },
};

const initialState = {
  formateurs: references.formateurs.map((trainer) => ({
    ...trainer,
    adresse: trainer.id === 1 ? 'Quartier Centre' : '',
    taux_horaire: null,
    prime: null,
  })),
  emplois_du_temps: references.emplois_du_temps.map((schedule) => ({ ...schedule })),
  horaires_demo: defaultTimes,
};

const copy = (value) => JSON.parse(JSON.stringify(value));

function readState() {
  if (typeof localStorage === 'undefined') return copy(initialState);
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? { ...copy(initialState), ...JSON.parse(saved) } : copy(initialState);
  } catch {
    return copy(initialState);
  }
}

let state = readState();

function persist() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Les modifications restent disponibles en mémoire si le stockage du navigateur est indisponible.
  }
}

export function getFormateursData() {
  return {
    ...copy(references),
    salles: getSallesData().salles,
    formateurs: copy(state.formateurs),
    emplois_du_temps: copy(state.emplois_du_temps),
    horaires_demo: copy(state.horaires_demo),
  };
}

export function saveFormateur(record) {
  const matricule = record.matricule.trim().toLocaleUpperCase('fr');
  const email = record.email?.trim().toLocaleLowerCase('fr') || '';
  if (!matricule || !record.nom.trim() || !record.prenom.trim()) {
    throw new Error('Le matricule, le nom et le prénom sont obligatoires.');
  }
  if (state.formateurs.some((item) => item.id !== record.id && item.matricule.toLocaleLowerCase('fr') === matricule.toLocaleLowerCase('fr'))) {
    throw new Error('Ce matricule est déjà utilisé.');
  }
  if (email && state.formateurs.some((item) => item.id !== record.id && item.email?.toLocaleLowerCase('fr') === email)) {
    throw new Error('Cette adresse e-mail est déjà utilisée.');
  }
  const id = record.id ?? state.formateurs.reduce((maximum, item) => Math.max(maximum, item.id), 0) + 1;
  const saved = {
    id,
    user_id: record.user_id ?? null,
    matricule,
    nom: record.nom.trim(),
    prenom: record.prenom.trim(),
    telephone: record.telephone?.trim() || null,
    email: email || null,
    actif: Number(record.actif) === 1 ? 1 : 0,
    adresse: record.adresse?.trim() || '',
    taux_horaire: record.taux_horaire === '' || record.taux_horaire == null ? null : Number(record.taux_horaire),
    prime: record.prime === '' || record.prime == null ? null : Number(record.prime),
  };
  state.formateurs = record.id
    ? state.formateurs.map((item) => item.id === record.id ? saved : item)
    : [...state.formateurs, saved];
  persist();
  return getFormateursData();
}

export function setFormateurStatus(trainerId, active) {
  state.formateurs = state.formateurs.map((trainer) => trainer.id === trainerId ? { ...trainer, actif: active ? 1 : 0 } : trainer);
  if (!active) {
    state.emplois_du_temps = state.emplois_du_temps.map((schedule) => (
      schedule.id_formateur === trainerId ? { ...schedule, statut: 0 } : schedule
    ));
  }
  persist();
  return getFormateursData();
}

function timeToMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function intervalsOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  return timeToMinutes(firstStart) < timeToMinutes(secondEnd)
    && timeToMinutes(secondStart) < timeToMinutes(firstEnd);
}

export function saveTrainerSchedule(record) {
  const trainer = state.formateurs.find((item) => item.id === Number(record.id_formateur));
  if (!trainer || Number(trainer.actif) !== 1) throw new Error('Un formateur inactif ne peut pas recevoir de nouvelle séance.');
  const room = getSallesData().salles.find((item) => item.id === Number(record.id_salle));
  if (!room || room.statut !== 'disponible') throw new Error('La salle sélectionnée n’est pas disponible dans le schéma de référence.');
  if (timeToMinutes(record.heure_fin) <= timeToMinutes(record.heure_debut)) throw new Error('L’heure de fin doit être postérieure à l’heure de début.');
  const weekday = Number(record.jour_semaine);
  const yearId = Number(record.id_annee);
  const otherSchedules = state.emplois_du_temps.filter((schedule) => schedule.id !== record.id);

  const sqlConflicts = otherSchedules.filter((schedule) => (
    schedule.id_annee === yearId
    && schedule.jour_semaine === weekday
    && (schedule.id_formateur === trainer.id || schedule.id_salle === Number(record.id_salle))
  ));
  if (sqlConflicts.length) {
    const sameTrainer = sqlConflicts.some((schedule) => schedule.id_formateur === trainer.id);
    const sameRoom = sqlConflicts.some((schedule) => schedule.id_salle === Number(record.id_salle));
    throw new Error(`Conflit de contrainte SQL pour ce jour : ${sameTrainer ? 'ce formateur est déjà planifié' : ''}${sameTrainer && sameRoom ? ' et ' : ''}${sameRoom ? 'cette salle est déjà occupée' : ''}. Le schéma interdit plus d’une affectation par formateur/salle et jour, même à des heures différentes.`);
  }

  const groupOverlap = otherSchedules.find((schedule) => {
    if (schedule.id_annee !== yearId || schedule.id_groupe !== Number(record.id_groupe) || schedule.jour_semaine !== weekday) return false;
    const otherTime = state.horaires_demo[schedule.id] || defaultTimes[schedule.id] || { heure_debut: '08:00', heure_fin: '10:00' };
    return intervalsOverlap(record.heure_debut, record.heure_fin, otherTime.heure_debut, otherTime.heure_fin);
  });
  if (groupOverlap) throw new Error('Ce groupe a déjà un cours qui chevauche cet horaire.');

  const group = references.groupes.find((item) => item.id === Number(record.id_groupe));
  const session = references.sessions.find((item) => item.id === group?.id_session);
  if (!group || !session || group.jour_semaine !== weekday) throw new Error('Le groupe sélectionné n’est pas programmé ce jour-là.');
  const currentGroupEnrollment = references.inscriptions.filter((enrollment) => (
    enrollment.statut === 'active'
    && references.emplois_du_temps.find((item) => item.id === enrollment.id_emploi_du_temps)?.id_groupe === group.id
  )).length;
  if (room.capacite && currentGroupEnrollment > room.capacite) {
    throw new Error(`La salle choisie a ${room.capacite} places pour ${currentGroupEnrollment} auditeurs inscrits.`);
  }
  const id = record.id ?? state.emplois_du_temps.reduce((maximum, schedule) => Math.max(maximum, schedule.id), 0) + 1;
  const schedule = {
    id,
    id_annee: yearId,
    id_groupe: Number(record.id_groupe),
    id_salle: Number(record.id_salle),
    id_formateur: trainer.id,
    jour_semaine: weekday,
    statut: Number(record.statut ?? 1),
  };
  state.emplois_du_temps = record.id
    ? state.emplois_du_temps.map((item) => item.id === record.id ? schedule : item)
    : [...state.emplois_du_temps, schedule];
  state.horaires_demo = { ...state.horaires_demo, [id]: { heure_debut: record.heure_debut, heure_fin: record.heure_fin } };
  persist();
  return getFormateursData();
}

export function deleteTrainerSchedule(scheduleId) {
  if (references.inscriptions.some((item) => item.id_emploi_du_temps === scheduleId)
    || references.presences.some((item) => item.id_emploi_du_temps === scheduleId)) {
    throw new Error('Cette séance est utilisée par des inscriptions ou présences; la contrainte SQL empêche sa suppression.');
  }
  state.emplois_du_temps = state.emplois_du_temps.filter((schedule) => schedule.id !== scheduleId);
  const { [scheduleId]: removed, ...remainingTimes } = state.horaires_demo;
  void removed;
  state.horaires_demo = remainingTimes;
  persist();
  return getFormateursData();
}