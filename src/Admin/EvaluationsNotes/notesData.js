import { getPresenceData } from '../Presences/presenceData.js';

const storageKey = 'gestion-academie-notes-demo';

const initialState = {
  evaluations: [
    { id: 1, id_session: 1, libelle: 'Contrôle continu - octobre', date_evaluation: '2026-10-07' },
    { id: 2, id_session: 1, libelle: 'Test de niveau - entrée A1', date_evaluation: '2026-09-16' },
    { id: 3, id_session: 2, libelle: 'Évaluation orale - octobre', date_evaluation: '2026-10-14' },
  ],
  parametres_evaluations: [
    { id: 1, id_evaluation: 1, libelle: 'Compréhension orale', bareme: 5 },
    { id: 2, id_evaluation: 1, libelle: 'Expression orale', bareme: 5 },
    { id: 3, id_evaluation: 1, libelle: 'Compréhension écrite', bareme: 5 },
    { id: 4, id_evaluation: 1, libelle: 'Expression écrite', bareme: 5 },
    { id: 5, id_evaluation: 2, libelle: 'Compréhension orale', bareme: 6 },
    { id: 6, id_evaluation: 2, libelle: 'Expression orale', bareme: 6 },
    { id: 7, id_evaluation: 2, libelle: 'Compréhension écrite', bareme: 8 },
    { id: 8, id_evaluation: 3, libelle: 'Compréhension orale', bareme: 8 },
    { id: 9, id_evaluation: 3, libelle: 'Expression orale', bareme: 6 },
    { id: 10, id_evaluation: 3, libelle: 'Interaction', bareme: 6 },
  ],
  notes: [
    { id_note: 1, id_parametre: 1, id_inscription: 1, note: 4.25, observation: 'Bonne compréhension globale.' },
    { id_note: 2, id_parametre: 2, id_inscription: 1, note: 4.5, observation: '' },
    { id_note: 3, id_parametre: 3, id_inscription: 1, note: 3.75, observation: '' },
    { id_note: 4, id_parametre: 4, id_inscription: 1, note: 4, observation: '' },
    { id_note: 5, id_parametre: 1, id_inscription: 2, note: 3.5, observation: '' },
    { id_note: 6, id_parametre: 2, id_inscription: 2, note: 3.25, observation: 'À encourager à prendre la parole.' },
    { id_note: 7, id_parametre: 3, id_inscription: 2, note: 4, observation: '' },
    { id_note: 8, id_parametre: 4, id_inscription: 2, note: 3.5, observation: '' },
    { id_note: 9, id_parametre: 1, id_inscription: 3, note: 2.75, observation: '' },
    { id_note: 10, id_parametre: 2, id_inscription: 3, note: null, observation: 'Absence justifiée.' },
    { id_note: 11, id_parametre: 3, id_inscription: 3, note: 3, observation: '' },
    { id_note: 12, id_parametre: 4, id_inscription: 3, note: 3.25, observation: '' },
    { id_note: 13, id_parametre: 5, id_inscription: 1, note: 5, observation: '' },
    { id_note: 14, id_parametre: 6, id_inscription: 1, note: 4.5, observation: '' },
    { id_note: 15, id_parametre: 7, id_inscription: 1, note: 6.5, observation: '' },
    { id_note: 16, id_parametre: 5, id_inscription: 2, note: 3, observation: '' },
    { id_note: 17, id_parametre: 6, id_inscription: 2, note: 3, observation: '' },
    { id_note: 18, id_parametre: 7, id_inscription: 2, note: 3, observation: '' },
    { id_note: 19, id_parametre: 8, id_inscription: 4, note: 6.5, observation: '' },
    { id_note: 20, id_parametre: 9, id_inscription: 4, note: 5, observation: '' },
    { id_note: 21, id_parametre: 10, id_inscription: 4, note: 5.5, observation: '' },
    { id_note: 22, id_parametre: 8, id_inscription: 5, note: 5.5, observation: '' },
    { id_note: 23, id_parametre: 9, id_inscription: 5, note: 4.5, observation: '' },
    { id_note: 24, id_parametre: 10, id_inscription: 5, note: 5, observation: '' },
  ],
  passages_niveaux: [
    { id: 1, id_inscription: 1, niveau_depart: 1, niveau_arrivee: 2, decision: 'admis', moyenne: 16, date_decision: '2026-10-08', observation: 'Progression validée après le test de niveau.' },
    { id: 2, id_inscription: 2, niveau_depart: 1, niveau_arrivee: null, decision: 'redouble', moyenne: 9, date_decision: '2026-10-08', observation: 'Consolider les bases avant le niveau suivant.' },
  ],
};

const copy = (value) => JSON.parse(JSON.stringify(value));

function readState() {
  if (typeof localStorage === 'undefined') return copy(initialState);
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? { ...copy(initialState), ...JSON.parse(saved) } : copy(initialState);
  } catch {
    return copy(initialState);
  }
}

let state = readState();

function persist() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Les données restent disponibles en mémoire si le stockage du navigateur est indisponible.
  }
}

export function getNotesData() {
  return { ...getPresenceData(), ...copy(state) };
}

export function saveGradeBatch(changes) {
  let nextId = state.notes.reduce((maximum, row) => Math.max(maximum, row.id_note), 0);
  const byUniqueKey = new Map(state.notes.map((row) => [`${row.id_parametre}:${row.id_inscription}`, row]));

  changes.forEach((change) => {
    const key = `${change.id_parametre}:${change.id_inscription}`;
    const existing = byUniqueKey.get(key);
    const grade = change.note === '' || change.note === undefined ? null : Number(change.note);
    const row = {
      ...existing,
      ...change,
      id_note: existing?.id_note ?? ++nextId,
      note: grade,
      observation: change.observation || '',
    };
    byUniqueKey.set(key, row);
  });

  state.notes = [...byUniqueKey.values()];
  persist();
  return getNotesData();
}

export function createEvaluation(record) {
  const nextId = state.evaluations.reduce((maximum, row) => Math.max(maximum, row.id), 0) + 1;
  const evaluation = { ...record, id: nextId };
  state.evaluations = [...state.evaluations, evaluation];
  persist();
  return copy(evaluation);
}

export function saveCriterion(record) {
  const existing = record.id ? state.parametres_evaluations.find((item) => item.id === record.id) : null;
  const nextId = state.parametres_evaluations.reduce((maximum, row) => Math.max(maximum, row.id), 0) + 1;
  const criterion = { ...record, id: existing?.id ?? nextId, bareme: Number(record.bareme) };
  state.parametres_evaluations = existing
    ? state.parametres_evaluations.map((item) => item.id === existing.id ? criterion : item)
    : [...state.parametres_evaluations, criterion];
  persist();
  return copy(criterion);
}

export function deleteCriterion(criterionId) {
  state.parametres_evaluations = state.parametres_evaluations.filter((item) => item.id !== criterionId);
  state.notes = state.notes.filter((item) => item.id_parametre !== criterionId);
  persist();
  return getNotesData();
}

export function deleteGrade(gradeId) {
  state.notes = state.notes.filter((item) => item.id_note !== gradeId);
  persist();
  return getNotesData();
}

export function savePassage(record) {
  const existing = state.passages_niveaux.find((item) => item.id_inscription === record.id_inscription);
  const nextId = state.passages_niveaux.reduce((maximum, item) => Math.max(maximum, item.id), 0) + 1;
  const passage = { ...existing, ...record, id: existing?.id ?? nextId };
  state.passages_niveaux = existing
    ? state.passages_niveaux.map((item) => item.id === existing.id ? passage : item)
    : [...state.passages_niveaux, passage];
  persist();
  return getNotesData();
}