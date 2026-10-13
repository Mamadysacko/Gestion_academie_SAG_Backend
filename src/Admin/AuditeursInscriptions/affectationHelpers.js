const OPEN_SESSION_STATUSES = ['ouverte', 'en_cours'];

const toIsoDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Date courte jj/MM/AA. */
export const formatShortDate = (value) => {
  if (!value) return '—';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  return `${day}/${month}/${year.slice(2)}`;
};

/** Prochaines dates de cours (jour hebdomadaire du groupe) dans la période de la session. */
export function nextCourseDates(weekday, session, count = 4) {
  if (!weekday || !session) return [];
  const today = toIsoDate(new Date());
  const start = session.date_debut > today ? session.date_debut : today;
  const cursor = new Date(`${start}T00:00:00`);
  const dates = [];
  for (let guard = 0; guard < 400 && dates.length < count; guard += 1) {
    const iso = toIsoDate(cursor);
    if (session.date_fin && iso > session.date_fin) break;
    if (((cursor.getDay() + 6) % 7) + 1 === Number(weekday)) dates.push(iso);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/** Sessions ouvertes aux inscriptions pour une année (plus la session courante en modification). */
export function eligibleSessions(data, yearId, keepSessionId = null) {
  return data.sessions.filter((session) => (
    (Number(session.id) === Number(keepSessionId))
    || ((!yearId || Number(session.id_annee) === Number(yearId)) && OPEN_SESSION_STATUSES.includes(session.statut))
  ));
}

/** Salles actives d'un groupe avec leur effectif (l'inscription en cours de modification est exclue). */
export function groupRooms(data, groupId, excludeInscriptionId = null) {
  return data.emplois
    .filter((emploi) => Number(emploi.id_groupe) === Number(groupId) && Number(emploi.statut) === 1)
    .map((emploi) => {
      const enrolled = data.inscriptions.filter((item) => (
        item.statut === 'active'
        && Number(item.id_emploi_du_temps) === Number(emploi.id)
        && Number(item.id) !== Number(excludeInscriptionId)
      )).length;
      const capacity = emploi.salle_capacite == null ? null : Number(emploi.salle_capacite);
      return { ...emploi, enrolled, capacity, full: capacity !== null && enrolled >= capacity };
    })
    .sort((a, b) => String(a.salle_code).localeCompare(String(b.salle_code), 'fr', { numeric: true }));
}


/* ------------------------------------------------------------------
 | Options des listes déroulantes à étiquettes (TagSelect)
 |------------------------------------------------------------------ */

const hhmm = (value) => String(value || '').slice(0, 5);

export const sessionOptions = (sessions) => sessions.map((item) => ({
  value: String(item.id),
  label: `${item.code} · ${item.libelle}`,
  hint: `${formatShortDate(item.date_debut)} → ${formatShortDate(item.date_fin)}`,
}));

export const groupOptions = (groups, dayLabel) => groups.map((item) => ({
  value: String(item.id),
  label: `${item.code} · ${item.libelle}`,
  hint: `${dayLabel(item.jour_semaine)} · ${hhmm(item.heure_debut)}–${hhmm(item.heure_fin)}`,
}));

/** Salles d'un groupe : libellé, formateur attitré et places ; les salles pleines sont écartées sauf la salle choisie. */
export const roomOptions = (rooms, selectedId = '') => rooms
  .filter((room) => !room.full || String(room.id) === String(selectedId))
  .map((room) => ({
    value: String(room.id),
    label: `${room.salle_code} · ${room.salle_libelle}`,
    hint: `${room.formateur_prenom} ${room.formateur_nom} · ${room.enrolled}${room.capacity !== null ? `/${room.capacity}` : ''} auditeur(s)`,
  }));
