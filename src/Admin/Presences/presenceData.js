const storageKey = 'gestion-academie-presences-demo';

const baseData = {
  annees_scolaires: [
    { id: 1, libelle: '2026-2027', date_debut: '2026-09-01', date_fin: '2027-06-30', statut: 1 },
  ],
  departements: [
    { id: 1, code: 'ANG', libelle: 'Anglais' },
    { id: 2, code: 'FRA', libelle: 'Français' },
  ],
  types_formations: [
    { id: 1, libelle: 'Cours intensif' },
    { id: 2, libelle: 'Cours du soir' },
  ],
  niveaux: [
    { id: 1, libelle: 'A1 - Débutant' },
    { id: 2, libelle: 'A2 - Élémentaire' },
    { id: 3, libelle: 'B1 - Intermédiaire' },
  ],
  sessions: [
    { id: 1, id_annee: 1, id_type_formation: 1, id_niveau: 1, code: 'ANG-A1-2627', libelle: 'Anglais A1', date_debut: '2026-09-15', date_fin: '2027-01-30', statut: 'en_cours' },
    { id: 2, id_annee: 1, id_type_formation: 2, id_niveau: 3, code: 'FRA-B1-2627', libelle: 'Français B1', date_debut: '2026-09-15', date_fin: '2027-01-30', statut: 'en_cours' },
    { id: 3, id_annee: 1, id_type_formation: 1, id_niveau: 2, code: 'ANG-A2-2627', libelle: 'Anglais A2', date_debut: '2026-09-15', date_fin: '2027-01-30', statut: 'ouverte' },
    { id: 4, id_annee: 1, id_type_formation: 2, id_niveau: 2, code: 'FRA-A2-2627', libelle: 'Français A2', date_debut: '2026-09-15', date_fin: '2027-01-30', statut: 'ouverte' },
  ],
  salles: [
    { id: 1, code: 'A-101', libelle: 'Salle A-101', capacite: 24, statut: 'disponible' },
    { id: 2, code: 'B-202', libelle: 'Salle B-202', capacite: 18, statut: 'disponible' },
    { id: 3, code: 'C-103', libelle: 'Salle C-103', capacite: 16, statut: 'disponible' },
    { id: 4, code: 'D-104', libelle: 'Salle D-104', capacite: 14, statut: 'disponible' },
  ],
  formateurs: [
    { id: 1, matricule: 'FOR-001', nom: 'Touré', prenom: 'Aïcha', telephone: '0700000101', email: 'aicha.toure@example.test', actif: 1 },
    { id: 2, matricule: 'FOR-002', nom: 'Mensah', prenom: 'Kwame', telephone: '0700000102', email: 'kwame.mensah@example.test', actif: 1 },
  ],
  auditeurs: [
    { id: 1, matricule: 'AUD-2026-001', nom: 'Traoré', prenom: 'Fatou', sexe: 'F', telephone: '0700000201', email: 'fatou.traore@example.test' },
    { id: 2, matricule: 'AUD-2026-002', nom: 'Koffi', prenom: 'Yao', sexe: 'M', telephone: '0700000202', email: 'yao.koffi@example.test' },
    { id: 3, matricule: 'AUD-2026-003', nom: 'Bah', prenom: 'Mariam', sexe: 'F', telephone: '0700000203', email: 'mariam.bah@example.test' },
    { id: 4, matricule: 'AUD-2026-004', nom: 'Soro', prenom: 'Kader', sexe: 'M', telephone: '0700000204', email: 'kader.soro@example.test' },
    { id: 5, matricule: 'AUD-2026-005', nom: 'Diop', prenom: 'Awa', sexe: 'F', telephone: '0700000205', email: 'awa.diop@example.test' },
    { id: 6, matricule: 'AUD-2026-006', nom: 'Koné', prenom: 'Moussa', sexe: 'M', telephone: '0700000206', email: 'moussa.kone@example.test' },
    { id: 7, matricule: 'AUD-2026-007', nom: 'Diallo', prenom: 'Néné', sexe: 'F', telephone: '0700000207', email: 'nene.diallo@example.test' },
    { id: 8, matricule: 'AUD-2026-008', nom: 'Ouattara', prenom: 'Ibrahim', sexe: 'M', telephone: '0700000208', email: 'ibrahim.ouattara@example.test' },
    { id: 9, matricule: 'AUD-2026-009', nom: 'Ndiaye', prenom: 'Sokhna', sexe: 'F', telephone: '0700000209', email: 'sokhna.ndiaye@example.test' },
    { id: 10, matricule: 'AUD-2026-010', nom: 'Konaté', prenom: 'Amadou', sexe: 'M', telephone: '0700000210', email: 'amadou.konate@example.test' },
  ],
  groupes: [
    { id: 1, id_session: 1, code: 'ANG-A1-ME', libelle: 'Anglais A1 - Mercredi', jour_semaine: 3, capacite: 20, statut: 1 },
    { id: 2, id_session: 2, code: 'FRA-B1-ME', libelle: 'Français B1 - Mercredi', jour_semaine: 3, capacite: 16, statut: 1 },
    { id: 3, id_session: 3, code: 'ANG-A2-LU', libelle: 'Anglais A2 - Lundi', jour_semaine: 1, capacite: 18, statut: 1 },
    { id: 4, id_session: 4, code: 'FRA-A2-VE', libelle: 'Français A2 - Vendredi', jour_semaine: 5, capacite: 14, statut: 1 },
  ],
  emplois_du_temps: [
    { id: 1, id_annee: 1, id_groupe: 1, id_salle: 1, id_formateur: 1, jour_semaine: 3, statut: 1 },
    { id: 2, id_annee: 1, id_groupe: 2, id_salle: 2, id_formateur: 2, jour_semaine: 3, statut: 1 },
    { id: 3, id_annee: 1, id_groupe: 3, id_salle: 3, id_formateur: 1, jour_semaine: 1, statut: 1 },
    { id: 4, id_annee: 1, id_groupe: 4, id_salle: 4, id_formateur: 2, jour_semaine: 5, statut: 1 },
  ],
  inscriptions: [
    { id: 1, id_auditeur: 1, id_emploi_du_temps: 1, id_departement: 1, date_inscription: '2026-09-10', statut: 'active' },
    { id: 2, id_auditeur: 2, id_emploi_du_temps: 1, id_departement: 1, date_inscription: '2026-09-10', statut: 'active' },
    { id: 3, id_auditeur: 3, id_emploi_du_temps: 1, id_departement: 1, date_inscription: '2026-09-11', statut: 'active' },
    { id: 4, id_auditeur: 4, id_emploi_du_temps: 2, id_departement: 2, date_inscription: '2026-09-11', statut: 'active' },
    { id: 5, id_auditeur: 5, id_emploi_du_temps: 2, id_departement: 2, date_inscription: '2026-09-12', statut: 'active' },
    { id: 6, id_auditeur: 6, id_emploi_du_temps: 2, id_departement: 2, date_inscription: '2026-09-12', statut: 'active' },
    { id: 7, id_auditeur: 7, id_emploi_du_temps: 3, id_departement: 1, date_inscription: '2026-09-10', statut: 'active' },
    { id: 8, id_auditeur: 8, id_emploi_du_temps: 3, id_departement: 1, date_inscription: '2026-09-10', statut: 'active' },
    { id: 9, id_auditeur: 9, id_emploi_du_temps: 4, id_departement: 2, date_inscription: '2026-09-12', statut: 'active' },
    { id: 10, id_auditeur: 10, id_emploi_du_temps: 4, id_departement: 2, date_inscription: '2026-09-12', statut: 'active' },
  ],
  presences: [
    { id: 1, id_inscription: 1, id_emploi_du_temps: 1, id_formateur: 1, date_presence: '2026-09-30', statut: 'present', observation: null },
    { id: 2, id_inscription: 2, id_emploi_du_temps: 1, id_formateur: 1, date_presence: '2026-09-30', statut: 'absent', observation: 'Absence à vérifier' },
    { id: 3, id_inscription: 3, id_emploi_du_temps: 1, id_formateur: 1, date_presence: '2026-09-30', statut: 'malade', observation: 'Certificat transmis' },
    { id: 4, id_inscription: 4, id_emploi_du_temps: 2, id_formateur: 2, date_presence: '2026-09-30', statut: 'present', observation: null },
    { id: 5, id_inscription: 5, id_emploi_du_temps: 2, id_formateur: 2, date_presence: '2026-09-30', statut: 'permissionnaire', observation: 'Autorisation de sortie' },
    { id: 6, id_inscription: 6, id_emploi_du_temps: 2, id_formateur: 2, date_presence: '2026-09-30', statut: 'present', observation: null },
    { id: 7, id_inscription: 1, id_emploi_du_temps: 1, id_formateur: 1, date_presence: '2026-09-23', statut: 'present', observation: null },
    { id: 8, id_inscription: 2, id_emploi_du_temps: 1, id_formateur: 1, date_presence: '2026-09-23', statut: 'present', observation: null },
    { id: 9, id_inscription: 3, id_emploi_du_temps: 1, id_formateur: 1, date_presence: '2026-09-23', statut: 'absent', observation: null },
    { id: 10, id_inscription: 4, id_emploi_du_temps: 2, id_formateur: 2, date_presence: '2026-09-23', statut: 'present', observation: null },
    { id: 11, id_inscription: 5, id_emploi_du_temps: 2, id_formateur: 2, date_presence: '2026-09-23', statut: 'absent', observation: 'Appel au responsable' },
    { id: 12, id_inscription: 6, id_emploi_du_temps: 2, id_formateur: 2, date_presence: '2026-09-23', statut: 'present', observation: null },
    { id: 13, id_inscription: 1, id_emploi_du_temps: 1, id_formateur: 1, date_presence: '2026-09-16', statut: 'present', observation: null },
    { id: 14, id_inscription: 2, id_emploi_du_temps: 1, id_formateur: 1, date_presence: '2026-09-16', statut: 'present', observation: null },
    { id: 15, id_inscription: 3, id_emploi_du_temps: 1, id_formateur: 1, date_presence: '2026-09-16', statut: 'present', observation: null },
    { id: 16, id_inscription: 4, id_emploi_du_temps: 2, id_formateur: 2, date_presence: '2026-09-16', statut: 'absent', observation: null },
    { id: 17, id_inscription: 5, id_emploi_du_temps: 2, id_formateur: 2, date_presence: '2026-09-16', statut: 'present', observation: null },
    { id: 18, id_inscription: 6, id_emploi_du_temps: 2, id_formateur: 2, date_presence: '2026-09-16', statut: 'present', observation: null },
    { id: 19, id_inscription: 7, id_emploi_du_temps: 3, id_formateur: 1, date_presence: '2026-09-28', statut: 'present', observation: null },
    { id: 20, id_inscription: 8, id_emploi_du_temps: 3, id_formateur: 1, date_presence: '2026-09-28', statut: 'absent', observation: null },
    { id: 21, id_inscription: 7, id_emploi_du_temps: 3, id_formateur: 1, date_presence: '2026-09-21', statut: 'present', observation: null },
    { id: 22, id_inscription: 8, id_emploi_du_temps: 3, id_formateur: 1, date_presence: '2026-09-21', statut: 'present', observation: null },
    { id: 23, id_inscription: 9, id_emploi_du_temps: 4, id_formateur: 2, date_presence: '2026-09-25', statut: 'present', observation: null },
    { id: 24, id_inscription: 10, id_emploi_du_temps: 4, id_formateur: 2, date_presence: '2026-09-25', statut: 'conge', observation: 'Congé validé', conge_date_debut: '2026-09-24', conge_date_fin: '2026-09-26' },
    { id: 25, id_inscription: 9, id_emploi_du_temps: 4, id_formateur: 2, date_presence: '2026-09-18', statut: 'present', observation: null },
    { id: 26, id_inscription: 10, id_emploi_du_temps: 4, id_formateur: 2, date_presence: '2026-09-18', statut: 'present', observation: null },
  ],
};

const copy = (value) => JSON.parse(JSON.stringify(value));

function readSavedPresences() {
  if (typeof localStorage === 'undefined') return copy(baseData.presences);
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : copy(baseData.presences);
  } catch {
    return copy(baseData.presences);
  }
}

let presences = readSavedPresences();

export function getPresenceData() {
  return { ...copy(baseData), presences: copy(presences) };
}

export function savePresence(record) {
  const existing = presences.find((presence) => (
    Number(presence.id_inscription) === Number(record.id_inscription)
    && presence.date_presence === record.date_presence
  ));

  if (existing) {
    presences = presences.map((presence) => (
      presence.id === existing.id ? { ...presence, ...record, id: existing.id } : presence
    ));
  } else {
    const nextId = presences.reduce((maximum, presence) => Math.max(maximum, presence.id), 0) + 1;
    presences = [...presences, { ...record, id: nextId }];
  }

  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, JSON.stringify(presences));
  } catch {
    // Les changements restent disponibles en mémoire si le stockage du navigateur est indisponible.
  }

  return getPresenceData();
}