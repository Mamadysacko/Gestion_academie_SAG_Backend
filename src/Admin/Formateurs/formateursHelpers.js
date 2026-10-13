import { WEEKDAYS } from '../Salles/sallesHelpers';

export function getScheduleDetails(data, schedule) {
  const group = data.groupes.find((item) => item.id === schedule.id_groupe);
  const session = data.sessions.find((item) => item.id === group?.id_session);
  const level = data.niveaux.find((item) => item.id === session?.id_niveau);
  const formationType = data.types_formations.find((item) => item.id === session?.id_type_formation);
  const room = data.salles.find((item) => item.id === schedule.id_salle);
  const trainer = data.formateurs.find((item) => item.id === schedule.id_formateur);
  const year = data.annees_scolaires.find((item) => item.id === schedule.id_annee);
  const activeLearners = data.inscriptionsAccessibles
    ? data.inscriptions.filter((item) => item.id_emploi_du_temps === schedule.id && item.statut === 'active').length
    : null;
  const day = WEEKDAYS.find((item) => item.value === Number(schedule.jour_semaine));
  return { ...schedule, group, session, level, formationType, room, trainer, year, day, activeLearners };
}

export function getTrainerConflicts(data, schedules = data.emplois_du_temps) {
  const detailed = schedules.filter((item) => Number(item.statut) === 1).map((item) => getScheduleDetails(data, item));
  const conflicts = [];
  for (let firstIndex = 0; firstIndex < detailed.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < detailed.length; secondIndex += 1) {
      const first = detailed[firstIndex];
      const second = detailed[secondIndex];
      if (first.id_annee !== second.id_annee || first.jour_semaine !== second.jour_semaine) continue;
      const sameTrainer = first.id_formateur === second.id_formateur;
      const sameRoom = first.id_salle === second.id_salle;
      if (sameTrainer || sameRoom) {
        conflicts.push({ first, second, sameTrainer, sameRoom, sameGroup: false });
      }
    }
  }
  return conflicts;
}

export function getWorkloadByTrainer(data, schedules = data.emplois_du_temps) {
  return data.formateurs.map((trainer) => {
    const assigned = schedules.filter((schedule) => schedule.id_formateur === trainer.id && Number(schedule.statut) === 1);
    return {
      trainer,
      schedules: assigned.length,
      groups: new Set(assigned.map((schedule) => schedule.id_groupe)).size,
    };
  });
}

export function exportTrainerCsv(rows, filename = 'formateurs') {
  if (!rows.length) return;
  const headings = ['Matricule', 'Nom', 'Prénom', 'Salle', 'Téléphone', 'E-mail', 'Statut', 'Créneaux hebdomadaires', 'Groupes'];
  const values = rows.map((row) => [row.trainer.matricule, row.trainer.nom, row.trainer.prenom, row.trainer.salle_code ? `${row.trainer.salle_code} ${row.trainer.salle_libelle || ''}`.trim() : '', row.trainer.telephone, row.trainer.email, Number(row.trainer.actif) === 1 ? 'Actif' : 'Inactif', row.schedules ?? '', row.groups ?? '']);
  const csv = [headings, ...values].map((line) => line.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}