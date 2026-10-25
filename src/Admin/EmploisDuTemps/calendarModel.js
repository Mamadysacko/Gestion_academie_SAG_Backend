/**
 * Modèle du calendrier : dates, couleurs stables par formation / groupe et regroupement des
 * créneaux en « séances » (un groupe, une date, un horaire — toutes ses salles réunies).
 */

// Palette catégorielle validée (ordre fixe, jamais recyclé) : au-delà de 8 entités, gris neutre.
export const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
export const OTHER_COLOR = '#8a8a86';

export const toIso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const parseIso = (iso) => new Date(`${iso}T00:00:00`);
export const addDays = (iso, days) => { const date = parseIso(iso); date.setDate(date.getDate() + days); return toIso(date); };
export const isoWeekday = (iso) => ((parseIso(iso).getDay() + 6) % 7) + 1;
export const mondayOf = (iso) => addDays(iso, 1 - isoWeekday(iso));
export const shortTime = (value) => String(value || '').slice(0, 5);
export const minutes = (value) => { const [h, m] = shortTime(value).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
export const longDate = (iso) => parseIso(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const shortDate = (iso) => parseIso(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

/**
 * Couleur stable de chaque entité : l'ordre suit le libellé (pas le rang à l'écran), si bien qu'un
 * filtre ne repeint jamais les entités restantes. Une couleur choisie pour la formation est prioritaire.
 */
export function buildColorScale(slots, mode) {
  const entities = new Map();
  slots.forEach((slot) => {
    const key = mode === 'groupe' ? `g${slot.id_groupe}` : `f${slot.id_type_formation}`;
    if (!entities.has(key)) {
      entities.set(key, {
        key,
        label: mode === 'groupe' ? `${slot.session_code} · ${slot.groupe_code}` : (slot.formation_libelle || 'Formation'),
        custom: mode === 'groupe' ? null : slot.formation_couleur,
      });
    }
  });
  const ordered = [...entities.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr', { numeric: true }));
  const colors = new Map();
  ordered.forEach((entity, index) => {
    colors.set(entity.key, entity.custom || PALETTE[index] || OTHER_COLOR);
  });
  return {
    colorOf: (slot) => colors.get(mode === 'groupe' ? `g${slot.id_groupe}` : `f${slot.id_type_formation}`) || OTHER_COLOR,
    legend: ordered.map((entity) => ({ ...entity, color: colors.get(entity.key) })),
  };
}

/** Le créneau hebdomadaire a-t-il lieu à cette date (jour, période de la session et de l'année) ? */
export const occursOn = (slot, iso) => Number(slot.jour_semaine) === isoWeekday(iso)
  && (!slot.session_date_debut || (iso >= slot.session_date_debut && iso <= slot.session_date_fin))
  && (!slot.annee_date_debut || (iso >= slot.annee_date_debut && iso <= slot.annee_date_fin));

/** Séances d'une date : créneaux regroupés par groupe et horaire. */
export function sessionsOn(slots, iso) {
  if (isoWeekday(iso) > 5) return [];
  const groups = new Map();
  slots.filter((slot) => occursOn(slot, iso)).forEach((slot) => {
    const key = `${slot.id_groupe}|${shortTime(slot.heure_debut)}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key: `${iso}|${key}`,
        iso,
        id_groupe: slot.id_groupe,
        groupe_code: slot.groupe_code,
        groupe_libelle: slot.groupe_libelle,
        session_code: slot.session_code,
        session_libelle: slot.session_libelle,
        formation_libelle: slot.formation_libelle,
        heure_debut: slot.heure_debut,
        heure_fin: slot.heure_fin,
        jour_semaine: slot.jour_semaine,
        sample: slot,
        rows: [],
      });
    }
    groups.get(key).rows.push(slot);
  });
  return [...groups.values()]
    .map((item) => ({
      ...item,
      rows: item.rows.sort((a, b) => String(a.salle_code).localeCompare(String(b.salle_code), 'fr', { numeric: true })),
      inscrits: item.rows.reduce((sum, row) => sum + (Number(row.inscrits_actifs) || 0), 0),
    }))
    .sort((a, b) => minutes(a.heure_debut) - minutes(b.heure_debut) || String(a.groupe_code).localeCompare(String(b.groupe_code), 'fr', { numeric: true }));
}

/** Répartit des événements qui se chevauchent en colonnes (affichage côte à côte). */
export function layoutColumns(events) {
  const placed = [];
  const columnsEnd = [];
  events.forEach((event) => {
    const start = minutes(event.heure_debut);
    let column = columnsEnd.findIndex((end) => end <= start);
    if (column === -1) { column = columnsEnd.length; columnsEnd.push(0); }
    columnsEnd[column] = minutes(event.heure_fin);
    placed.push({ ...event, column });
  });
  const count = Math.max(1, columnsEnd.length);
  return placed.map((event) => ({ ...event, columns: count }));
}
