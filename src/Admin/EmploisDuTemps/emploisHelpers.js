export const JOURS = [
  { id: 1, label: 'Lundi' },
  { id: 2, label: 'Mardi' },
  { id: 3, label: 'Mercredi' },
  { id: 4, label: 'Jeudi' },
  { id: 5, label: 'Vendredi' },
];

export const rows = (response) => (Array.isArray(response?.data) ? response.data : []);

export const normalizeRows = (response) => rows(response).map((row) => {
  const normalized = { ...row };
  for (const key of [
    'id', 'id_annee', 'id_groupe', 'id_salle', 'id_formateur', 'id_session',
    'jour_semaine', 'statut', 'capacite', 'groupe_capacite', 'salle_capacite',
    'inscrits_actifs', 'groupe_actif', 'formateur_actif',
  ]) {
    if (normalized[key] !== null && normalized[key] !== undefined && normalized[key] !== '') {
      const value = Number(normalized[key]);
      if (Number.isFinite(value)) normalized[key] = value;
    }
  }
  return normalized;
});

export const jourLabel = (jour) => JOURS.find((item) => item.id === Number(jour))?.label || 'Jour inconnu';

export const groupLabel = (group) => [group?.code, group?.libelle].filter(Boolean).join(' · ') || 'Groupe';

export const trainerLabel = (trainer) => [trainer?.prenom, trainer?.nom].filter(Boolean).join(' ') || 'Formateur';

export const roomLabel = (room) => [room?.code, room?.libelle].filter(Boolean).join(' · ') || 'Salle';

export const trainerForRoom = (roomId, trainers = []) => trainers.find((trainer) => Number(trainer.id_salle) === Number(roomId));

export const roomForTrainer = (trainerId, trainers = [], rooms = []) => {
  const trainer = trainers.find((item) => Number(item.id) === Number(trainerId));
  if (!trainer?.id_salle) return null;
  return rooms.find((room) => Number(room.id) === Number(trainer.id_salle)) || null;
};

export const checkConflits = (assignment, schedules = [], excludeId = null) => {
  const errors = [];
  const yearId = Number(assignment.id_annee);
  const roomId = Number(assignment.id_salle);
  const trainerId = Number(assignment.id_formateur);
  const day = Number(assignment.jour_semaine);

  if (![1, 2, 3, 4, 5].includes(day)) errors.push('Le jour doit être compris entre lundi et vendredi.');

  schedules.filter((item) => Number(item.id) !== Number(excludeId)).forEach((item) => {
    if (Number(item.id_annee) !== yearId || Number(item.jour_semaine) !== day) return;
    if (Number(item.id_salle) === roomId) {
      errors.push(`La salle ${item.salle_code || ''} est déjà réservée ce jour-là (${item.groupe_code || 'autre groupe'}).`);
    }
    if (Number(item.id_formateur) === trainerId) {
      errors.push(`Le formateur ${[item.formateur_prenom, item.formateur_nom].filter(Boolean).join(' ')} est déjà affecté ce jour-là.`);
    }
  });
  return errors;
};

/** Jours de passage d'un groupe (« 1,3 » renvoyé par l'API), à défaut son jour de cours. */
export const passageDays = (group) => {
  const days = String(group?.passages || '').split(',').map(Number).filter((day) => day >= 1 && day <= 5);
  return days.length ? days : (group?.jour_semaine ? [Number(group.jour_semaine)] : []);
};

export const passagesLabel = (group) => passageDays(group).map((day) => jourLabel(day)).join(', ');
