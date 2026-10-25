import { exportTable } from '../../utils/exportExcel';
export const RESULT_LABELS = {
  admis: 'Admis',
  non_admis: 'Non admis',
  en_attente: 'En attente',
  abandonne: 'Abandon',
};

export const DECISION_LABELS = {
  admis: 'Admis',
  non_admis: 'Non admis',
  redouble: 'Redouble',
  abandonne: 'Abandon',
  termine: 'Formation terminée',
};

export const formatAverage = (value) => (value === null || value === undefined ? '—' : `${Number(value).toFixed(2)} /4`);

/** Même règle que le serveur : la note dont le seuil minimal est atteint (barème 1 à 4). */
export function appreciationFor(average, bareme = []) {
  if (average === null || average === undefined || !Number.isFinite(Number(average))) return null;
  let result = null;
  [...bareme].sort((a, b) => a.note - b.note).forEach((row) => {
    if (Number(average) + 1e-9 >= Number(row.seuil_min)) result = { note: row.note, libelle: row.libelle };
  });
  return result;
}

/** Même formule que le serveur : Σ notes / Σ barèmes × 4, arrondie à 2 décimales. */
export function averageOnFour(points, maximum) {
  if (!maximum) return null;
  return Math.round((points / maximum) * 400) / 100;
}

export function downloadCsv(filename, headings, lines, title = 'Situation des notes') {
  exportTable({ filename, title, headings, rows: lines });
}
