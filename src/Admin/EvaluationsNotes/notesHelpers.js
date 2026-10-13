export function calculateAverageOnFour(totalPoints, totalMaximum) {
  const points = Number(totalPoints);
  const maximum = Number(totalMaximum);
  if (!Number.isFinite(points) || !Number.isFinite(maximum) || maximum <= 0) return null;
  return Math.round((points / maximum) * 400) / 100;
}

export function resolveGrade(data, grade) {
  const criterion = data.parametres_evaluations.find((item) => Number(item.id) === Number(grade.id_parametre)
    && Number(item.id_evaluation) === Number(grade.id_evaluation));
  const evaluation = data.evaluations.find((item) => Number(item.id) === Number(grade.id_evaluation));
  const session = data.sessions.find((item) => Number(item.id) === Number(evaluation?.id_session));
  const enrollment = data.inscriptions.find((item) => Number(item.id) === Number(grade.id_inscription));
  const attendee = data.auditeurs.find((item) => Number(item.id) === Number(enrollment?.id_auditeur));
  const schedule = data.emplois_du_temps.find((item) => Number(item.id) === Number(enrollment?.id_emploi_du_temps));
  const group = data.groupes.find((item) => Number(item.id) === Number(schedule?.id_groupe));
  const department = data.departements.find((item) => Number(item.id) === Number(enrollment?.id_departement));
  const room = data.salles.find((item) => Number(item.id) === Number(schedule?.id_salle));
  const trainer = data.formateurs.find((item) => Number(item.id) === Number(schedule?.id_formateur));
  const level = data.niveaux.find((item) => Number(item.id) === Number(session?.id_niveau));

  return {
    ...grade,
    criterion,
    evaluation,
    session,
    enrollment,
    attendee,
    schedule,
    group,
    department,
    room,
    trainer,
    level,
  };
}

export function getEvaluationRoster(data, evaluationId, groupId = '') {
  const evaluation = data.evaluations.find((item) => Number(item.id) === Number(evaluationId));
  if (!evaluation) return [];
  const groupIds = new Set(data.groupes
    .filter((group) => Number(group.id_session) === Number(evaluation.id_session) && (!groupId || Number(group.id) === Number(groupId)))
    .map((group) => Number(group.id)));
  const criteria = data.parametres_evaluations.filter((item) => Number(item.id_evaluation) === Number(evaluation.id));

  return data.inscriptions
    .filter((enrollment) => ['active', 'terminee'].includes(enrollment.statut))
    .filter((enrollment) => {
      const schedule = data.emplois_du_temps.find((item) => Number(item.id) === Number(enrollment.id_emploi_du_temps));
      return groupIds.has(Number(schedule?.id_groupe));
    })
    .map((enrollment) => {
      const attendee = data.auditeurs.find((item) => Number(item.id) === Number(enrollment.id_auditeur));
      const schedule = data.emplois_du_temps.find((item) => Number(item.id) === Number(enrollment.id_emploi_du_temps));
      const group = data.groupes.find((item) => Number(item.id) === Number(schedule?.id_groupe));
      const session = data.sessions.find((item) => Number(item.id) === Number(group?.id_session));
      const scores = criteria.map((criterion) => data.notes.find((item) => (
        Number(item.id_evaluation) === Number(evaluation.id)
        && Number(item.id_parametre) === Number(criterion.id)
        && Number(item.id_inscription) === Number(enrollment.id)
      )) || null);
      const scored = scores.flatMap((grade, index) => (
        grade?.note === null || grade?.note === undefined || grade?.note === ''
          ? []
          : [{ grade: Number(grade.note), max: Number(criteria[index].bareme) }]
      ));
      const possible = scored.reduce((sum, item) => sum + item.max, 0);
      const achieved = scored.reduce((sum, item) => sum + item.grade, 0);
      const average4 = criteria.length && scored.length === criteria.length
        ? calculateAverageOnFour(achieved, possible)
        : null;

      return {
        enrollment,
        attendee,
        group,
        session,
        department: data.departements.find((item) => Number(item.id) === Number(enrollment.id_departement)),
        grades: Object.fromEntries(criteria.map((criterion, index) => [criterion.id, scores[index]])),
        completedCount: scored.length,
        average4,
      };
    })
    .filter((row) => row.attendee)
    .sort((a, b) => `${a.attendee.nom} ${a.attendee.prenom}`.localeCompare(`${b.attendee.nom} ${b.attendee.prenom}`, 'fr'));
}

export function getGradeValue(data, grade) {
  return resolveGrade(data, grade);
}

export function formatMonth(value) {
  if (!value) return '—';
  return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export function formatDate(value) {
  return value
    ? new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
}

export function exportNotesCsv(rows, filename) {
  if (!rows.length) return;
  const headings = ['Matricule', 'Auditeur', 'Groupe', 'Département', 'Évaluation', 'Critère', 'Note', 'Barème', 'Moyenne /4', 'Date', 'Formateur', 'Observation'];
  const csvRows = [headings, ...rows.map((row) => [
    row.attendee?.matricule,
    `${row.attendee?.prenom || ''} ${row.attendee?.nom || ''}`.trim(),
    row.group?.libelle,
    row.department?.libelle,
    row.evaluation?.libelle,
    row.criterion?.libelle,
    row.note,
    row.criterion?.bareme,
    row.average4,
    row.evaluation?.date_evaluation,
    row.trainer ? `${row.trainer.prenom} ${row.trainer.nom}` : '',
    row.observation,
  ])];
  const csv = csvRows.map((line) => line.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}