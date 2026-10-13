export const STATUS_OPTIONS = [
  { value: 'present', label: 'Présent' },
  { value: 'absent', label: 'Absent' },
  { value: 'permissionnaire', label: 'Permissionnaire' },
  { value: 'malade', label: 'Malade' },
  { value: 'conge', label: 'Congé' },
];

export const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map(({ value, label }) => [value, label]));

export const presenceViews = [
  { id: 'date', label: 'Feuille de pointage' },
  { id: 'salle', label: 'Par salle' },
  { id: 'auditeur', label: 'Par auditeur' },
  { id: 'groupe', label: 'Par groupe' },
  { id: 'formateur', label: 'Par formateur' },
  { id: 'emploi', label: 'Par emploi du temps' },
  { id: 'statistiques', label: 'Statistiques' },
];

export const DAYS_OF_WEEK = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  7: 'Dimanche',
};

export const dateToInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDate = (value) => value
  ? new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

export const formatRate = (part, total) => total ? `${Math.round((part / total) * 100)} %` : '0 %';

export function resolveAttendance(data, record, enrollment = null) {
  const inscription = enrollment || data.inscriptions.find((item) => item.id === record.id_inscription);
  const emploi = data.emplois_du_temps.find((item) => item.id === (record.id_emploi_du_temps ?? inscription?.id_emploi_du_temps));
  const groupe = data.groupes.find((item) => item.id === emploi?.id_groupe);
  const session = data.sessions.find((item) => item.id === groupe?.id_session);
  const niveau = data.niveaux.find((item) => item.id === session?.id_niveau);
  const departement = data.departements.find((item) => item.id === inscription?.id_departement);
  const auditeur = data.auditeurs.find((item) => item.id === inscription?.id_auditeur);
  const salle = data.salles.find((item) => item.id === emploi?.id_salle);
  const formateur = data.formateurs.find((item) => item.id === (record.id_formateur ?? emploi?.id_formateur));

  return {
    ...record,
    id_inscription: inscription?.id,
    id_emploi_du_temps: emploi?.id,
    id_formateur: formateur?.id,
    inscription,
    auditeur,
    emploi,
    groupe,
    session,
    niveau,
    departement,
    salle,
    formateur,
  };
}

export function latestScheduledDate(data, yearId, today) {
  const year = data.annees_scolaires.find((item) => String(item.id) === String(yearId));
  if (!year?.date_debut || !year.date_fin) return null;

  const lastDate = year.date_fin < today ? year.date_fin : today;
  if (lastDate < year.date_debut) return null;

  const date = new Date(`${lastDate}T12:00:00`);
  const firstDate = new Date(`${year.date_debut}T12:00:00`);
  while (date >= firstDate) {
    const value = dateToInput(date);
    const weekday = ((date.getDay() + 6) % 7) + 1;
    if (data.emplois_du_temps.some((emploi) => {
      const group = data.groupes.find((item) => item.id === emploi.id_groupe);
      return String(emploi.id_annee) === String(yearId)
        && Number(emploi.statut) === 1
        && Number(emploi.jour_semaine) === weekday
        && Number(group?.jour_semaine) === weekday;
    })) return value;
    date.setDate(date.getDate() - 1);
  }
  return null;
}

export function countWeekdayMismatches(data, yearId) {
  return data.emplois_du_temps.filter((emploi) => {
    if (String(emploi.id_annee) !== String(yearId) || Number(emploi.statut) !== 1) return false;
    const group = data.groupes.find((item) => String(item.id) === String(emploi.id_groupe));
    if (!group) return false;
    const groupWeekday = Number(group.jour_semaine);
    const scheduleWeekday = Number(emploi.jour_semaine);
    return groupWeekday < 1 || groupWeekday > 5
      || scheduleWeekday < 1 || scheduleWeekday > 5
      || groupWeekday !== scheduleWeekday;
  }).length;
}

export function buildDailySheets(data, selectedDate, filters, search, yearId) {
  const date = new Date(`${selectedDate}T12:00:00`);
  const weekday = ((date.getDay() + 6) % 7) + 1;
  const term = search.trim().toLocaleLowerCase('fr');

  return data.emplois_du_temps
    .filter((emploi) => {
      const year = data.annees_scolaires.find((item) => item.id === emploi.id_annee);
      const group = data.groupes.find((item) => item.id === emploi.id_groupe);
      return Number(emploi.statut) === 1
        && year
        && group
        && (!yearId || String(emploi.id_annee) === String(yearId))
        && selectedDate >= year.date_debut
        && selectedDate <= year.date_fin
        && Number(group.jour_semaine) === weekday
        && Number(emploi.jour_semaine) === Number(group.jour_semaine);
    })
    .filter((emploi) => !filters.room || String(emploi.id_salle) === filters.room)
    .filter((emploi) => !filters.group || String(emploi.id_groupe) === filters.group)
    .filter((emploi) => !filters.trainer || String(emploi.id_formateur) === filters.trainer)
    .sort((a, b) => a.id_salle - b.id_salle)
    .map((emploi) => {
      const inscriptions = data.inscriptions.filter((inscription) => (
        inscription.id_emploi_du_temps === emploi.id && inscription.statut === 'active'
      ));
      const rows = inscriptions.map((inscription) => {
        const saved = data.presences.find((presence) => (
          presence.id_inscription === inscription.id && presence.date_presence === selectedDate
        ));
        return resolveAttendance(data, saved || {
          id_inscription: inscription.id,
          id_emploi_du_temps: emploi.id,
          id_formateur: emploi.id_formateur,
          date_presence: selectedDate,
          statut: '',
          observation: '',
        }, inscription);
      }).filter((row) => {
        const fullName = `${row.auditeur?.prenom || ''} ${row.auditeur?.nom || ''} ${row.auditeur?.matricule || ''}`.toLocaleLowerCase('fr');
        return fullName.includes(term);
      });

      return {
        emploi,
        salle: data.salles.find((salle) => salle.id === emploi.id_salle),
        groupe: data.groupes.find((groupe) => groupe.id === emploi.id_groupe),
        formateur: data.formateurs.find((formateur) => formateur.id === emploi.id_formateur),
        session: data.sessions.find((session) => session.id === data.groupes.find((groupe) => groupe.id === emploi.id_groupe)?.id_session),
        rows,
      };
    })
    .filter((sheet) => sheet.rows.length || !term);
}

export function buildGroupRoster(data, groupId, groupRows, search) {
  if (!groupId) return [];
  const term = search.trim().toLocaleLowerCase('fr');
  const enrollments = data.inscriptions.filter((inscription) => (
    inscription.statut === 'active'
    && data.emplois_du_temps.find((emploi) => emploi.id === inscription.id_emploi_du_temps)?.id_groupe === Number(groupId)
  ));

  return enrollments.map((inscription) => {
    const person = data.auditeurs.find((auditeur) => auditeur.id === inscription.id_auditeur);
    const history = groupRows.filter((row) => row.inscription.id === inscription.id);
    const present = history.filter((row) => row.statut === 'present').length;
    return {
      inscription,
      person,
      history,
      present,
      absent: history.filter((row) => row.statut === 'absent').length,
      permissionnaire: history.filter((row) => row.statut === 'permissionnaire').length,
      malade: history.filter((row) => row.statut === 'malade').length,
      conge: history.filter((row) => row.statut === 'conge').length,
      rate: formatRate(present, history.length),
    };
  }).filter((row) => `${row.person?.prenom || ''} ${row.person?.nom || ''} ${row.person?.matricule || ''}`.toLocaleLowerCase('fr').includes(term));
}

export function summarizePresence(rows) {
  const present = rows.filter((row) => row.statut === 'present').length;
  return {
    total: rows.length,
    present,
    absent: rows.filter((row) => row.statut === 'absent').length,
    permissionnaire: rows.filter((row) => row.statut === 'permissionnaire').length,
    malade: rows.filter((row) => row.statut === 'malade').length,
    conge: rows.filter((row) => row.statut === 'conge').length,
    rate: formatRate(present, rows.length),
  };
}

export function exportPresenceCsv(rows, filename) {
  if (!rows.length) return;
  const headings = ['Date', 'Matricule', 'Auditeur', 'Téléphone', 'E-mail', 'Département', 'Groupe', 'Niveau', 'Salle', 'Formateur', 'Statut', 'Observation'];
  const values = rows.map((row) => [
    row.date_presence,
    row.auditeur?.matricule,
    `${row.auditeur?.prenom || ''} ${row.auditeur?.nom || ''}`.trim(),
    row.auditeur?.telephone,
    row.auditeur?.email,
    row.departement?.libelle,
    row.groupe?.libelle,
    row.niveau?.libelle,
    row.salle?.code || row.salle?.libelle,
    row.formateur ? `${row.formateur.prenom} ${row.formateur.nom}` : '',
    STATUS_LABELS[row.statut] || 'À pointer',
    row.observation,
  ]);
  const csv = [headings, ...values].map((line) => line.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function buildRoomRoster(data, roomId, roomRows = [], search = '') {
  if (!roomId) return [];
  const term = search.trim().toLocaleLowerCase('fr');
  const roomSchedules = data.emplois_du_temps.filter((emploi) => (
    Number(emploi.id_salle) === Number(roomId) && Number(emploi.statut) === 1
  ));
  const scheduleIds = new Set(roomSchedules.map((item) => Number(item.id)));

  const enrollments = data.inscriptions.filter((inscription) => (
    inscription.statut === 'active' && scheduleIds.has(Number(inscription.id_emploi_du_temps))
  ));

  return enrollments.map((inscription) => {
    const person = data.auditeurs.find((auditeur) => auditeur.id === inscription.id_auditeur);
    const emploi = data.emplois_du_temps.find((e) => e.id === inscription.id_emploi_du_temps);
    const groupe = data.groupes.find((g) => g.id === emploi?.id_groupe);
    const formateur = data.formateurs.find((f) => f.id === emploi?.id_formateur);
    const history = roomRows.filter((row) => row.id_inscription === inscription.id || row.inscription?.id === inscription.id);
    const present = history.filter((row) => row.statut === 'present').length;
    return {
      inscription,
      person,
      emploi,
      groupe,
      formateur,
      history,
      present,
      absent: history.filter((row) => row.statut === 'absent').length,
      permissionnaire: history.filter((row) => row.statut === 'permissionnaire').length,
      malade: history.filter((row) => row.statut === 'malade').length,
      conge: history.filter((row) => row.statut === 'conge').length,
      rate: formatRate(present, history.length),
    };
  }).filter((row) => `${row.person?.prenom || ''} ${row.person?.nom || ''} ${row.person?.matricule || ''} ${row.groupe?.libelle || ''}`.toLocaleLowerCase('fr').includes(term));
}

export function buildRoomDailySheets(data, roomId, selectedDate, search = '') {
  if (!roomId) return [];
  const term = search.trim().toLocaleLowerCase('fr');
  const roomSchedules = data.emplois_du_temps.filter((emploi) => (
    Number(emploi.id_salle) === Number(roomId) && Number(emploi.statut) === 1
  ));

  return roomSchedules.map((emploi) => {
    const inscriptions = data.inscriptions.filter((inscription) => (
      Number(inscription.id_emploi_du_temps) === Number(emploi.id) && inscription.statut === 'active'
    ));
    const rows = inscriptions.map((inscription) => {
      const saved = data.presences.find((presence) => (
        Number(presence.id_inscription) === Number(inscription.id) && presence.date_presence === selectedDate
      ));
      return resolveAttendance(data, saved || {
        id_inscription: inscription.id,
        id_emploi_du_temps: emploi.id,
        id_formateur: emploi.id_formateur,
        date_presence: selectedDate,
        statut: '',
        observation: '',
      }, inscription);
    }).filter((row) => {
      const fullName = `${row.auditeur?.prenom || ''} ${row.auditeur?.nom || ''} ${row.auditeur?.matricule || ''}`.toLocaleLowerCase('fr');
      return fullName.includes(term);
    });

    return {
      emploi,
      salle: data.salles.find((salle) => Number(salle.id) === Number(emploi.id_salle)),
      groupe: data.groupes.find((groupe) => Number(groupe.id) === Number(emploi.id_groupe)),
      formateur: data.formateurs.find((formateur) => Number(formateur.id) === Number(emploi.id_formateur)),
      session: data.sessions.find((session) => Number(session.id) === Number(data.groupes.find((g) => Number(g.id) === Number(emploi.id_groupe))?.id_session)),
      rows,
    };
  }).filter((sheet) => sheet.rows.length);
}