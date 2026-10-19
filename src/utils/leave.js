/**
 * Congés et permissions : un pointage « Congé » ou « Permissionnaire » couvre une période (dates de
 * début et de fin). Ces aides produisent le texte de la colonne « Observation » de tous les écrans,
 * rapports et exports, pour qu'ils affichent la même chose.
 */
export const PERIOD_STATUSES = ['conge', 'permissionnaire'];
export const PERIOD_NAMES = { conge: 'Congé', permissionnaire: 'Permission' };

const toFrench = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');

/** « Congé du 01/10/2026 au 05/10/2026 » (ou « Permission le 02/10/2026 ») ; chaîne vide sans période. */
export function leavePeriodLabel(row) {
  if (!row) return '';
  const own = PERIOD_STATUSES.includes(row.statut) && row.conge_date_debut && row.conge_date_fin
    ? { type: row.statut, debut: row.conge_date_debut, fin: row.conge_date_fin }
    : null;
  // Sur la feuille du jour, une période en cours est connue même si l'auditeur n'est pas encore pointé.
  const period = own || (row.conge_en_cours ? { type: row.conge_en_cours.type || 'conge', ...row.conge_en_cours } : null);
  if (!period) return '';
  const name = PERIOD_NAMES[period.type] || PERIOD_NAMES.conge;
  const start = toFrench(period.debut);
  const end = toFrench(period.fin);
  return start === end ? `${name} le ${start}` : `${name} du ${start} au ${end}`;
}

/** Texte complet de la colonne « Observation » : période de congé / permission, puis observation saisie. */
export function observationText(row) {
  const note = row?.observation ? String(row.observation).trim() : '';
  return [leavePeriodLabel(row), note].filter(Boolean).join(' — ');
}
