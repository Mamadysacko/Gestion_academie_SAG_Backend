import { jourLabel, passageDays } from './emploisHelpers';

const overlaps = (a, b) => String(a.heure_debut) < String(b.heure_fin) && String(b.heure_debut) < String(a.heure_fin);
// Deux sessions successives peuvent réutiliser la même salle : seules les périodes qui se recoupent comptent.
const datesOverlap = (a, b) => !a.session_date_debut || !b.session_date_debut
  || (a.session_date_debut <= b.session_date_fin && b.session_date_debut <= a.session_date_fin);
const label = (slot) => `${slot.groupe_code} · ${slot.salle_code} (${jourLabel(slot.jour_semaine)})`;

/**
 * Conflits et incohérences des créneaux actifs de l'année affichée :
 * salle ou formateur réservés deux fois sur des horaires qui se chevauchent, formateur
 * différent du titulaire de la salle, capacité dépassée, jour différent de celui du groupe,
 * salle indisponible / formateur inactif, groupe actif sans salle.
 */
export function detectConflicts(data) {
  const active = data.emplois_du_temps.filter((slot) => Number(slot.statut) === 1);
  const conflicts = [];

  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i];
      const b = active[j];
      if (Number(a.jour_semaine) !== Number(b.jour_semaine) || !overlaps(a, b) || !datesOverlap(a, b)) continue;
      if (Number(a.id_salle) === Number(b.id_salle)) {
        conflicts.push({ type: 'Salle', slotIds: [a.id, b.id], message: `${a.salle_code} est réservée deux fois sur des horaires qui se chevauchent : ${label(a)} et ${label(b)}.` });
      }
      if (Number(a.id_formateur) === Number(b.id_formateur)) {
        conflicts.push({ type: 'Formateur', slotIds: [a.id, b.id], message: `${a.formateur_prenom} ${a.formateur_nom} est affecté(e) à deux cours simultanés : ${label(a)} et ${label(b)}.` });
      }
    }
  }

  active.forEach((slot) => {
    const titular = data.formateurs.find((trainer) => Number(trainer.id_salle) === Number(slot.id_salle));
    if (titular && Number(titular.id) !== Number(slot.id_formateur)) {
      conflicts.push({ type: 'Affectation', slotIds: [slot.id], message: `${label(slot)} : le formateur (${slot.formateur_prenom} ${slot.formateur_nom}) n’est pas le titulaire de la salle (${titular.prenom} ${titular.nom}).` });
    }
    const capacity = slot.salle_capacite == null ? null : Number(slot.salle_capacite);
    if (capacity !== null && Number(slot.inscrits_actifs) > capacity) {
      conflicts.push({ type: 'Capacité', slotIds: [slot.id], message: `${label(slot)} : ${slot.inscrits_actifs} auditeurs pour ${capacity} places.` });
    }
    const days = passageDays({ passages: slot.groupe_passages, jour_semaine: slot.groupe_jour_semaine });
    if (days.length && !days.includes(Number(slot.jour_semaine))) {
      conflicts.push({ type: 'Jour', slotIds: [slot.id], message: `${label(slot)} : ce jour n’est pas un passage du groupe (${days.map((day) => jourLabel(day).toLocaleLowerCase('fr')).join(', ')}).` });
    }
    if (slot.salle_statut && slot.salle_statut !== 'disponible') {
      conflicts.push({ type: 'Salle', slotIds: [slot.id], message: `${label(slot)} : la salle est indisponible.` });
    }
    if (slot.formateur_actif != null && Number(slot.formateur_actif) !== 1) {
      conflicts.push({ type: 'Formateur', slotIds: [slot.id], message: `${label(slot)} : le formateur est inactif.` });
    }
  });

  const yearIds = new Set(active.map((slot) => Number(slot.id_annee)));
  data.groupes
    .filter((group) => Number(group.statut) === 1)
    .filter((group) => data.sessions.some((session) => Number(session.id) === Number(group.id_session) && yearIds.has(Number(session.id_annee))))
    .filter((group) => !active.some((slot) => Number(slot.id_groupe) === Number(group.id)))
    .forEach((group) => conflicts.push({ type: 'Groupe', slotIds: [], message: `${group.code} · ${group.libelle} n’a aucune salle affectée.` }));

  return conflicts;
}
