import { exportTable } from '../../utils/exportExcel';
export const ROOM_STATUSES = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'indisponible', label: 'Indisponible' },
];

export const WEEKDAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
];

export const formatRoomCapacity = (capacity) => capacity == null ? 'Non précisée' : `${capacity} places`;

export function getRoomOccupancy(room, schedules, groups, inscriptions) {
  const roomSchedules = schedules.filter((schedule) => schedule.id_salle === room.id && Number(schedule.statut) === 1);
  const assignedGroups = [...new Set(roomSchedules.map((schedule) => schedule.id_groupe))];
  const groupCount = assignedGroups.length;
  const activeLearners = inscriptions.filter((inscription) => inscription.statut === 'active'
    && roomSchedules.some((schedule) => schedule.id === inscription.id_emploi_du_temps)).length;
  const peakLearners = Math.max(0, ...roomSchedules.map((schedule) => inscriptions.filter((inscription) => (
    inscription.statut === 'active' && inscription.id_emploi_du_temps === schedule.id
  )).length));
  const capacity = Number(room.capacite) || 0;
  return {
    schedules: roomSchedules,
    groups: groups.filter((group) => assignedGroups.includes(group.id)),
    groupCount,
    activeLearners,
    peakLearners,
    occupancyRate: capacity ? Math.min(100, Math.round((peakLearners / capacity) * 100)) : null,
  };
}

export function exportRoomsCsv(rows, filename = 'salles') {
  if (!rows.length) return;
  const headings = ['Code', 'Salle', 'Capacité', 'Statut', 'Formateur attitré', 'Groupes affectés', 'Inscrits actifs', 'Taux occupation'];
  const values = rows.map((room) => [room.code, room.libelle, room.capacite, room.displayStatus, room.trainerLabel || '', room.groupCount, room.activeLearners, room.occupancyRate == null ? '' : `${room.occupancyRate}%`]);
  exportTable({ filename, title: 'Registre des salles', headings, rows: values });
}
/**
 * Prépare l'affectation en série de plusieurs groupes à plusieurs salles : une ligne par couple
 * (groupe, salle), chacune avec son verdict de disponibilité. Règles :
 *  - un groupe ne peut pas être affecté deux fois à la même salle ;
 *  - une salle ne reçoit qu'un seul groupe par jour (créneaux actifs de la même année) ;
 *  - deux couples cochés ne peuvent pas prendre la même salle le même jour (le premier coché l'emporte).
 * `excluded` : ensemble des clés « groupe-salle » que l'utilisateur a décochées.
 */
export function planAssignments({ groups, rooms, schedules, yearId, excluded = new Set() }) {
  const active = schedules.filter((item) => Number(item.statut) === 1 && Number(item.id_annee) === Number(yearId));
  const busyBy = new Map(active.map((item) => [`${item.id_salle}-${item.jour_semaine}`, item.id_groupe]));
  const taken = new Map();
  const pairs = [];
  groups.forEach((group) => rooms.forEach((room) => {
    const key = `${group.id}-${room.id}`;
    const slot = `${room.id}-${group.jour_semaine}`;
    const pair = { key, group, room, day: Number(group.jour_semaine), ok: false, excluded: excluded.has(key), reason: '' };
    if (active.some((item) => Number(item.id_groupe) === Number(group.id) && Number(item.id_salle) === Number(room.id))) {
      pair.reason = 'Déjà affecté à cette salle';
    } else if (busyBy.has(slot)) {
      pair.reason = 'Salle occupée ce jour-là par un autre groupe';
    } else if (pair.excluded) {
      pair.reason = 'Décoché';
    } else if (taken.has(slot)) {
      pair.reason = `Même salle et même jour que ${taken.get(slot)} (décochez l’un des deux)`;
    } else {
      pair.ok = true;
      taken.set(slot, group.code);
    }
    pairs.push(pair);
  }));
  return pairs;
}
