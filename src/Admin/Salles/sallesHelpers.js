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
  const csv = [headings, ...values].map((line) => line.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}