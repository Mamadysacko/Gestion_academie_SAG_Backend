import { exportGrid, exportTable } from '../../utils/exportExcel';
/**
 * Helpers pour le module Auditeurs & Inscriptions
 */

export const STATUT_CONFIG = {
  active: {
    label: 'Active',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  terminee: {
    label: 'Terminée',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  abandonnee: {
    label: 'Abandonnée',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
  annulee: {
    label: 'Annulée',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    dot: 'bg-slate-400',
  },
  'Non inscrit': {
    label: 'Non inscrit',
    bg: 'bg-slate-50',
    text: 'text-slate-500',
    border: 'border-slate-200',
    dot: 'bg-slate-300',
  },
};

export function getStatutBadgeConfig(statut) {
  return STATUT_CONFIG[statut] || STATUT_CONFIG['Non inscrit'];
}

export function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const diff = Date.now() - dob.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

export function formatDateFr(dateStr) {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('fr-FR');
  } catch {
    return dateStr;
  }
}

/**
 * Reconstitue la vue détaillée d'un auditeur
 */
export function getAuditeurFullDetails(auditeur, data, targetYearId = null) {
  const activeYear = targetYearId
    ? data.annees.find((y) => y.id === Number(targetYearId))
    : data.annees.find((y) => y.statut === 1) || data.annees[0];

  const yearId = activeYear?.id;

  // Inscriptions de cet auditeur
  const studentEnrollments = data.inscriptions.filter(
    (i) => i.id_auditeur === auditeur.id
  );

  // Inscription active pour l'année ciblée
  const activeEnrollment = studentEnrollments.find(
    (i) => i.id_annee === yearId && i.statut === 'active'
  );

  // Ou dernière inscription pour l'année ciblée
  const latestEnrollmentInYear = studentEnrollments
    .filter((i) => i.id_annee === yearId)
    .sort((a, b) => (b.date_inscription || '').localeCompare(a.date_inscription || ''))[0];

  const currentEnrollment = activeEnrollment || latestEnrollmentInYear;

  // Groupe actuel
  const currentGroup = currentEnrollment
    ? data.groupes.find((g) => g.id === currentEnrollment.id_groupe)
    : null;


  // Historique complet des inscriptions avec détails groupe et année
  const history = studentEnrollments
    .map((enrollment) => {
      const g = data.groupes.find((group) => group.id === enrollment.id_groupe);
      const y = data.annees.find((year) => year.id === enrollment.id_annee);
      const statusLogs = data.historique_statuts.filter(
        (h) => h.id_inscription === enrollment.id
      ).sort((a, b) => b.id - a.id);

      return {
        ...enrollment,
        groupe: g,
        annee: y,
        statusLogs,
      };
    })
    .sort((a, b) => (b.date_inscription || '').localeCompare(a.date_inscription || ''));

  return {
    ...auditeur,
    age: calculateAge(auditeur.date_naissance),
    currentEnrollment,
    currentGroup,
    currentStatut: currentEnrollment ? currentEnrollment.statut : 'Non inscrit',
    history,
  };
}

/**
 * Calcul des statistiques du module
 */
export function calculateStatistics(data, targetYearId = null) {
  const activeYear = targetYearId
    ? data.annees.find((y) => y.id === Number(targetYearId))
    : data.annees.find((y) => y.statut === 1) || data.annees[0];

  const yearId = activeYear?.id || 1;

  // Inscriptions dans l'année active
  const yearInscriptions = data.inscriptions.filter((i) => Number(i.id_annee) === Number(yearId));
  const activeInscriptions = yearInscriptions.filter((i) => i.statut === 'Active');

  // Auditeurs uniques inscrits dans l'année (tous statuts confondus)
  const uniqueAuditeursYearIds = new Set(yearInscriptions.map((i) => i.id_auditeur));
  const totalInscritsAnnee = uniqueAuditeursYearIds.size;

  // Auditeurs uniques inscrits ACTIFS dans l'année
  const uniqueActiveAuditeursIds = new Set(activeInscriptions.map((i) => i.id_auditeur));
  const totalAuditeurs = data.auditeurs.length;
  const totalInscritsActifs = uniqueActiveAuditeursIds.size;

  // Répartition par sexe des auditeurs actifs de l'année
  let maleCount = 0;
  let femaleCount = 0;
  uniqueActiveAuditeursIds.forEach((id) => {
    const a = data.auditeurs.find((aud) => aud.id === id);
    if (a?.sexe === 'F') femaleCount++;
    else maleCount++;
  });

  const totalGender = maleCount + femaleCount || 1;
  const malePercent = Math.round((maleCount / totalGender) * 100);
  const femalePercent = Math.round((femaleCount / totalGender) * 100);
  const ratioFemmeHomme = maleCount > 0 ? (femaleCount / maleCount).toFixed(2) : '—';

  // Types d'inscription pour l'année
  const nouvellesInscriptions = yearInscriptions.filter((i) => i.type_inscription === 'Nouvelle').length;
  const reinscriptions = yearInscriptions.filter((i) => i.type_inscription === 'Réinscription').length;
  const transferts = yearInscriptions.filter((i) => i.type_inscription === 'Transfert').length;

  const totalTypes = nouvellesInscriptions + reinscriptions || 1;
  const pctNouvelles = Math.round((nouvellesInscriptions / totalTypes) * 100);
  const pctReinscriptions = Math.round((reinscriptions / totalTypes) * 100);

  // Statuts d'inscription pour l'année
  const abandons = yearInscriptions.filter((i) => i.statut === 'Abandonnée').length;
  const enAttente = yearInscriptions.filter((i) => i.statut === 'En attente').length;
  const terminees = yearInscriptions.filter((i) => i.statut === 'Terminée').length;
  const transferees = yearInscriptions.filter((i) => i.statut === 'Transférée').length;
  const annulees = yearInscriptions.filter((i) => i.statut === 'Annulée').length;

  const tauxAbandon = totalInscritsAnnee > 0 ? Math.round((abandons / totalInscritsAnnee) * 100) : 0;
  const tauxReussite = totalInscritsAnnee > 0 ? Math.round((terminees / totalInscritsAnnee) * 100) : 0;

  // Effectif et taux de remplissage par classe / groupe
  const groupsInYear = data.groupes.filter((g) => !g.id_annee || Number(g.id_annee) === Number(yearId));
  let totalCapacity = 0;
  let totalEnrolled = 0;

  const classStats = groupsInYear.map((g) => {
    const classActiveInsc = activeInscriptions.filter((i) => Number(i.id_groupe) === Number(g.id));
    const enrolledCount = classActiveInsc.length;
    const capacity = g.capacite || 20;
    totalCapacity += capacity;
    totalEnrolled += enrolledCount;
    const rate = Math.round((enrolledCount / capacity) * 100);

    // Répartition de genre dans la classe
    let classMale = 0;
    let classFemale = 0;
    classActiveInsc.forEach((insc) => {
      const a = data.auditeurs.find((aud) => aud.id === insc.id_auditeur);
      if (a?.sexe === 'F') classFemale++;
      else classMale++;
    });

    let statusCategory = 'available';
    if (rate >= 100) statusCategory = 'full';
    else if (rate >= 80) statusCategory = 'warning';

    return {
      id: g.id,
      code: g.code,
      libelle: g.libelle,
      formation: g.formation,
      formateur: g.formateur,
      salle: g.salle,
      jour_semaine: g.jour_semaine,
      capacite: capacity,
      effectif: enrolledCount,
      placesRestantes: Math.max(0, capacity - enrolledCount),
      tauxRemplissage: rate,
      statusCategory,
      classMale,
      classFemale,
    };
  });

  const globalRate = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

  // Évolution sur plusieurs années scolaires (avec calcul de croissance interannuelle)
  const sortedAnnees = [...data.annees].sort((a, b) => (a.date_debut || '').localeCompare(b.date_debut || ''));
  const multiYearEvolution = sortedAnnees.map((year, idx) => {
    const inscInYear = data.inscriptions.filter((i) => Number(i.id_annee) === Number(year.id));
    const activeInYear = inscInYear.filter((i) => i.statut === 'Active');
    const termineesInYear = inscInYear.filter((i) => i.statut === 'Terminée');
    const abandonsInYear = inscInYear.filter((i) => i.statut === 'Abandonnée');
    const uniqueStudents = new Set(inscInYear.map((i) => i.id_auditeur)).size;

    // Croissance par rapport à l'année précédente
    let growthRate = null;
    if (idx > 0) {
      const prevYear = sortedAnnees[idx - 1];
      const prevInsc = new Set(data.inscriptions.filter((i) => Number(i.id_annee) === Number(prevYear.id)).map((i) => i.id_auditeur)).size;
      if (prevInsc > 0) {
        growthRate = Math.round(((uniqueStudents - prevInsc) / prevInsc) * 100);
      }
    }

    return {
      id: year.id,
      libelle: year.libelle,
      activeYear: year.statut === 1,
      totalInscrits: uniqueStudents,
      totalInscriptions: inscInYear.length,
      actifs: activeInYear.length,
      termines: termineesInYear.length,
      abandons: abandonsInYear.length,
      growthRate,
    };
  });

  return {
    activeYear,
    totalAuditeurs,
    totalInscritsAnnee,
    totalInscritsActifs,
    totalInscriptionsAnnee: yearInscriptions.length,
    maleCount,
    femaleCount,
    malePercent,
    femalePercent,
    ratioFemmeHomme,
    nouvellesInscriptions,
    reinscriptions,
    pctNouvelles,
    pctReinscriptions,
    transferts,
    abandons,
    tauxAbandon,
    enAttente,
    terminees,
    tauxReussite,
    transferees,
    annulees,
    classStats,
    totalCapacity,
    totalEnrolled,
    globalRate,
    multiYearEvolution,
  };
}

/**
 * Export des Inscriptions au format CSV UTF-8 avec BOM (compatible Excel)
 */
export function exportInscriptionsToCSV(inscriptionsList, yearLibelle = '2026-2027') {
  const headers = [
    'Matricule',
    'Auditeur',
    'Sexe',
    'Téléphone',
    'Email',
    'Classe / Groupe',
    'Formation',
    'Salle',
    'Formateur',
    'Année scolaire',
    'Date inscription',
    'Type inscription',
    'Statut',
    'Motif / Observation',
  ];

  const rows = inscriptionsList.map((item) => {
    return [
      item.student?.matricule || '',
      item.student ? `${item.student.prenom} ${item.student.nom}` : '',
      item.student?.sexe || '',
      item.student?.telephone || '',
      item.student?.email || '',
      item.group?.libelle || '',
      item.group?.formation || '',
      item.group?.salle || '',
      item.group?.formateur || '',
      item.year?.libelle || '',
      item.date_inscription ? formatDateFr(item.date_inscription) : '',
      item.type_inscription || '',
      item.statut || '',
      item.motif_statut || '',
    ];
  });

  exportTable({
    filename: `inscriptions_${yearLibelle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}`,
    title: 'Liste des inscriptions',
    subtitle: `Année scolaire ${yearLibelle}`,
    headings: headers,
    rows,
  });
}

/**
 * Export au format CSV UTF-8 avec BOM (compatible Excel)
 */
export function exportAuditeursToCSV(auditeursDetailedList, yearLibelle = '2026-2027') {
  const headers = [
    'Matricule',
    'Nom',
    'Prénom',
    'Sexe',
    'Date de naissance',
    'Âge',
    'Téléphone',
    'Email',
    'Adresse',
    'Classe actuelle',
    'Statut inscription',
    'Type inscription',
    'Date inscription',
  ];

  const rows = auditeursDetailedList.map((a) => {
    return [
      a.matricule || '',
      a.nom || '',
      a.prenom || '',
      a.sexe || '',
      a.date_naissance ? formatDateFr(a.date_naissance) : '',
      a.age != null ? a.age : '',
      a.telephone || '',
      a.email || '',
      a.adresse || '',
      a.currentGroup?.libelle || 'Aucune',
      a.currentStatut || 'Non inscrit',
      a.currentEnrollment?.type_inscription || '—',
      a.currentEnrollment?.date_inscription ? formatDateFr(a.currentEnrollment.date_inscription) : '',
    ];
  });

  exportTable({
    filename: `auditeurs_${yearLibelle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}`,
    title: 'Liste des auditeurs',
    subtitle: `Année scolaire ${yearLibelle}`,
    headings: headers,
    rows,
  });
}

/**
 * Export du Bilan Statistique Académique en CSV
 */
export function exportStatistiquesToCSV(stats, yearLibelle = '2026-2027') {
  const lines = [
    ['INDICATEUR', 'VALEUR', 'DÉTAIL'],
    ['Total Auditeurs enregistrés (base)', stats.totalAuditeurs, 'Effectif global'],
    ['Auditeurs inscrits (année active)', stats.totalInscritsAnnee, 'Ayant au moins 1 inscription'],
    ['Inscrits Actifs en classe', stats.totalInscritsActifs, 'Présents dans les groupes'],
    ['Taux de Remplissage Global', `${stats.globalRate}%`, `${stats.totalEnrolled} / ${stats.totalCapacity} places`],
    ['Répartition Masculin (M)', stats.maleCount, `${stats.malePercent}%`],
    ['Répartition Féminin (F)', stats.femaleCount, `${stats.femalePercent}%`],
    ['Ratio Féminin / Masculin', stats.ratioFemmeHomme, 'Femmes pour 1 homme'],
    ['Nouvelles Inscriptions', stats.nouvellesInscriptions, `${stats.pctNouvelles}% des inscriptions`],
    ['Réinscriptions (anciens)', stats.reinscriptions, `${stats.pctReinscriptions}% des inscriptions`],
    ['Transferts de classe', stats.transferts, 'Changements de groupe'],
    ['Abandons', stats.abandons, `Taux d'abandon: ${stats.tauxAbandon}%`],
    ['Dossiers en attente', stats.enAttente, 'En cours de validation'],
    ['Formations terminées', stats.terminees, `Taux de réussite: ${stats.tauxReussite}%`],
    [],
    ['DÉTAIL PAR CLASSE'],
    ['Code', 'Classe', 'Formation', 'Salle', 'Formateur', 'Effectif Actif', 'Capacité', 'Places Libres', 'Taux Remplissage (%)', 'Hommes', 'Femmes'],
    ...stats.classStats.map((c) => [
      c.code,
      c.libelle,
      c.formation,
      c.salle,
      c.formateur,
      c.effectif,
      c.capacite,
      c.placesRestantes,
      `${c.tauxRemplissage}%`,
      c.classMale,
      c.classFemale,
    ]),
    [],
    ['ÉVOLUTION PLURIANNUELLE DES EFFECTIFS'],
    ['Année scolaire', 'Inscrits Totaux', 'Actifs', 'Terminés', 'Abandons', 'Croissance vs N-1'],
    ...stats.multiYearEvolution.map((y) => [
      y.libelle,
      y.totalInscrits,
      y.actifs,
      y.termines,
      y.abandons,
      y.growthRate != null ? `${y.growthRate > 0 ? '+' : ''}${y.growthRate}%` : '—',
    ]),
  ];

  exportGrid({
    filename: `bilan_statistiques_${yearLibelle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}`,
    title: 'Bilan statistique académique',
    subtitle: `Année scolaire ${yearLibelle}`,
    lines,
  });
}
