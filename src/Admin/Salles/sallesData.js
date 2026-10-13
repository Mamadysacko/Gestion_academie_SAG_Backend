import { getPresenceData } from '../Presences/presenceData.js';

const storageKey = 'gestion-academie-salles-demo';
const referenceData = getPresenceData();

const initialRooms = referenceData.salles.map((room) => ({
  ...room,
  type: ['Salle de cours', 'Salle de cours', 'Laboratoire', 'Salle polyvalente'][room.id - 1] || 'Salle de cours',
  batiment: room.id <= 2 ? 'Bâtiment A' : 'Bâtiment B',
  etage: room.id % 2 === 0 ? '1er étage' : 'Rez-de-chaussée',
  description: room.id === 3 ? 'Équipement audiovisuel disponible.' : '',
  etatDemo: room.id === 4 ? 'maintenance' : room.id === 3 ? 'indisponible' : '',
}));

const initialSchedules = referenceData.emplois_du_temps.map((schedule) => ({ ...schedule }));
const initialState = { rooms: initialRooms, schedules: initialSchedules };
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
    // Les changements restent disponibles en mémoire si le stockage du navigateur est indisponible.
  }
}

export function getSallesData() {
  const saved = copy(state);
  const schedules = saved.schedules;
  delete saved.schedules;
  return { ...copy(referenceData), ...saved, emplois_du_temps: schedules };
}

export function roomDisplayStatus(room) {
  return room.etatDemo === 'maintenance' ? 'maintenance' : room.statut;
}

export function saveRoom(record) {
  const code = record.code.trim().toLocaleUpperCase('fr');
  const name = record.libelle.trim();
  const duplicate = state.rooms.some((room) => room.id !== record.id && room.code.toLocaleLowerCase('fr') === code.toLocaleLowerCase('fr'));
  if (duplicate) throw new Error('Ce code de salle est déjà utilisé.');
  if (!code || !name) throw new Error('Le code et le nom de la salle sont obligatoires.');
  if (record.capacite !== '' && record.capacite != null && (!Number.isInteger(Number(record.capacite)) || Number(record.capacite) <= 0 || Number(record.capacite) > 4294967295)) {
    throw new Error('La capacité doit être un entier positif compatible avec le champ SQL int unsigned.');
  }
  const capacity = record.capacite === '' || record.capacite == null ? null : Number(record.capacite);
  const peakEnrollment = Math.max(0, ...state.schedules
    .filter((schedule) => schedule.id_salle === record.id && Number(schedule.statut) === 1)
    .map((schedule) => referenceData.inscriptions.filter((item) => item.id_emploi_du_temps === schedule.id && item.statut === 'active').length));
  if (capacity !== null && peakEnrollment > capacity) {
    throw new Error(`La capacité ne peut pas être inférieure au pic actuel de ${peakEnrollment} auditeurs dans cette salle.`);
  }

  const id = record.id ?? state.rooms.reduce((maximum, room) => Math.max(maximum, room.id), 0) + 1;
  const normalized = {
    id,
    code,
    libelle: name,
    capacite: capacity,
    statut: record.statut === 'disponible' ? 'disponible' : 'indisponible',
    etatDemo: record.statut === 'maintenance' ? 'maintenance' : record.statut === 'indisponible' ? 'indisponible' : '',
    type: record.type || 'Salle de cours',
    batiment: String(record.batiment || '').slice(0, 80),
    etage: String(record.etage || '').slice(0, 30),
    description: String(record.description || '').slice(0, 255),
  };
  state.rooms = record.id
    ? state.rooms.map((room) => room.id === record.id ? normalized : room)
    : [...state.rooms, normalized];
  persist();
  return getSallesData();
}

export function deleteRoom(roomId) {
  if (state.schedules.some((schedule) => schedule.id_salle === roomId)) {
    throw new Error('Cette salle est liée à un emploi du temps et ne peut pas être supprimée. Retirez ou réaffectez ses créneaux avant suppression.');
  }
  state.rooms = state.rooms.filter((room) => room.id !== roomId);
  persist();
  return getSallesData();
}

export function saveRoomAssignment(record) {
  const yearId = Number(record.id_annee);
  const groupId = Number(record.id_groupe);
  const roomId = Number(record.id_salle);
  const trainerId = Number(record.id_formateur);
  const weekday = Number(record.jour_semaine);
  if (![1, 2, 3, 4, 5].includes(weekday)) throw new Error('Choisissez un jour de cours valide.');
  const room = state.rooms.find((item) => item.id === roomId);
  const group = referenceData.groupes.find((item) => item.id === groupId);
  if (!room || !group || !referenceData.formateurs.some((item) => item.id === trainerId)) {
    throw new Error('Le groupe, la salle ou le formateur sélectionné est introuvable.');
  }
  const roomStatus = room.etatDemo === 'maintenance' ? 'maintenance' : room.statut;
  if (roomStatus !== 'disponible') throw new Error('Une salle indisponible ou en maintenance ne peut pas recevoir un nouveau créneau.');
  const enrollmentCount = referenceData.inscriptions.filter((inscription) => (
    inscription.statut === 'active'
    && referenceData.emplois_du_temps.find((schedule) => schedule.id === inscription.id_emploi_du_temps)?.id_groupe === groupId
  )).length;
  if (room.capacite && enrollmentCount > room.capacite) {
    throw new Error(`La salle a ${room.capacite} places, mais ${enrollmentCount} auditeurs sont inscrits dans ce groupe.`);
  }

  const otherRows = state.schedules.filter((schedule) => schedule.id !== record.id);
  if (otherRows.some((schedule) => schedule.id_annee === yearId && schedule.id_salle === roomId && schedule.jour_semaine === weekday)) {
    throw new Error('Cette salle est déjà affectée à un créneau le même jour pour cette année.');
  }
  if (otherRows.some((schedule) => schedule.id_annee === yearId && schedule.id_formateur === trainerId && schedule.jour_semaine === weekday)) {
    throw new Error('Ce formateur a déjà un créneau le même jour pour cette année.');
  }
  if (otherRows.some((schedule) => schedule.id_annee === yearId && schedule.id_groupe === groupId && schedule.id_salle !== roomId)) {
    throw new Error('Ce groupe est déjà lié à une autre salle pendant cette année scolaire.');
  }
  if (otherRows.some((schedule) => schedule.id_annee === yearId && schedule.id_groupe === groupId && schedule.jour_semaine === weekday)) {
    throw new Error('Ce groupe a déjà un créneau le même jour pour cette année.');
  }

  const id = record.id ?? state.schedules.reduce((maximum, schedule) => Math.max(maximum, schedule.id), 0) + 1;
  const assignment = {
    id,
    id_annee: yearId,
    id_groupe: groupId,
    id_salle: roomId,
    id_formateur: trainerId,
    jour_semaine: weekday,
    statut: Number(record.statut ?? 1),
  };
  state.schedules = record.id
    ? state.schedules.map((schedule) => schedule.id === record.id ? assignment : schedule)
    : [...state.schedules, assignment];
  persist();
  return getSallesData();
}

export function deleteRoomAssignment(assignmentId) {
  if (referenceData.inscriptions.some((item) => item.id_emploi_du_temps === assignmentId)) {
    throw new Error('Cette affectation est référencée par des inscriptions et ne peut pas être supprimée (contrainte SQL ON DELETE RESTRICT).');
  }
  if (referenceData.presences.some((item) => item.id_emploi_du_temps === assignmentId)) {
    throw new Error('Cette affectation est référencée par des présences et ne peut pas être supprimée (contrainte SQL ON DELETE RESTRICT).');
  }
  state.schedules = state.schedules.filter((schedule) => schedule.id !== assignmentId);
  persist();
  return getSallesData();
}