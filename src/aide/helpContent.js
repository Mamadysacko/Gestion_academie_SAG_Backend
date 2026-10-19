/**
 * Contenu rédactionnel de l'aide (textes, étapes, mots-clés, règles métier).
 *
 * Ce fichier ne déclare NI les onglets NI les boutons : ils sont relevés automatiquement dans le
 * code par tools/featuresPlugin.js. Il ne sert qu'à décrire ce que le code ne dit pas.
 * Les clés sont « moduleId » ou « moduleId/sousOngletId ». Une fonctionnalité détectée sans texte
 * reçoit une fiche générée (chemin, actions, prérequis) ; un texte dont la fonctionnalité a
 * disparu du code est ignoré et signalé (voir featureModel.js et tests/aide.test.mjs).
 *
 * Champs :
 *   summary       description claire
 *   steps         étapes à suivre
 *   tips          règles et points d'attention (issus des contrôles réels du backend)
 *   keywords      synonymes et formulations courantes, pour la recherche
 *   creates       table de la base alimentée (les prérequis obligatoires s'en déduisent via le schéma SQL)
 *   extraRequires prérequis métier supplémentaires (identifiants de contrôle, voir dependencies.js)
 *   reads         autres modules dont la lecture est nécessaire à l'affichage de l'écran
 *   related       fonctionnalités associées
 */

export const MODULE_CONTENT = {
  overview: {
    summary: 'Vue générale de l’académie : indicateurs en temps réel, rapports et fiche de présence journalière.',
    keywords: ['accueil', 'dashboard', 'indicateurs', 'statistiques generales', 'kpi', 'vue generale'],
  },
  'emplois-temps': {
    summary: 'Consultation et planification des créneaux hebdomadaires (groupe, salle, formateur, jour).',
    keywords: ['planning', 'horaire', 'edt', 'cours', 'agenda'],
  },
  auditeurs: {
    summary: 'Gestion des auditeurs (apprenants), de leurs inscriptions dans les groupes et des statistiques d’effectifs.',
    keywords: ['eleves', 'apprenants', 'stagiaires', 'employes', 'inscrire'],
  },
  formateurs: {
    summary: 'Gestion des formateurs, de leur salle attitrée, de leurs affectations et de leur charge de travail.',
    keywords: ['enseignants', 'professeurs', 'intervenants'],
  },
  salles: {
    summary: 'Registre des salles, affectations des groupes aux salles, disponibilité et occupation.',
    keywords: ['locaux', 'classes', 'capacite'],
  },
  evaluations: {
    summary: 'Évaluations, critères, saisie des notes, résultats, passages de niveau et relevés.',
    keywords: ['notes', 'examens', 'controle', 'resultats', 'bulletin'],
  },
  presences: {
    summary: 'Pointage quotidien des auditeurs et consultation des présences et absences sous plusieurs angles.',
    keywords: ['pointage', 'absences', 'appel', 'assiduite', 'retard'],
  },
  utilisateurs: {
    summary: 'Comptes de connexion, rôles et droits d’accès à chaque module.',
    keywords: ['comptes', 'acces', 'permissions', 'droits', 'mot de passe', 'connexion'],
  },
  rapports: {
    summary: 'Accès direct aux rapports (journalier, hebdomadaire, mensuel, annuel, par session ou par période) avec leurs filtres, l’export Excel et l’impression.',
    steps: ['Ouvrez « Rapports » dans la barre latérale.', 'Choisissez le type de rapport, la période et les filtres.', 'Consultez-le puis exportez-le en Excel ou imprimez-le.'],
    keywords: ['rapport', 'bilan', 'export', 'imprimer', 'periode', 'statistiques'],
  },
  parametres: {
    summary: 'Configuration de l’académie dans l’ordre de ses dépendances : années scolaires, types de formation, niveaux, sessions, groupes, départements, types d’employés et critères d’évaluation.',
    keywords: ['configuration', 'referentiels', 'reglages'],
  },
  profil: {
    summary: 'Vos informations personnelles et votre mot de passe.',
    steps: ['Ouvrez « Mon profil » depuis le menu ou en cliquant sur votre nom en haut de la barre latérale.', 'Modifiez vos informations puis enregistrez.', 'Pour changer de mot de passe, saisissez le nouveau mot de passe et sa confirmation.'],
    keywords: ['mon compte', 'mot de passe', 'identifiant', 'email', 'telephone', 'informations personnelles'],
  },
  'espace-formateur': {
    summary: 'Espace de travail du formateur : son emploi du temps, ses auditeurs, le pointage, les notes et les résultats de ses classes.',
    keywords: ['mes classes', 'mon planning', 'formateur'],
  },
};

export const FEATURE_CONTENT = {
  // ── Tableau de bord ───────────────────────────────────────────────────────
  'overview/overview': {
    summary: 'Indicateurs sur les inscriptions, présences du jour, ressources, évaluations et décisions, filtrables par année, session et date.',
    steps: ['Choisissez l’année scolaire, la session et la date d’analyse.', 'Lisez les indicateurs ; ils se rafraîchissent après chaque opération.', 'Utilisez « Actualiser » pour forcer la mise à jour.'],
    keywords: ['taux de presence', 'effectifs', 'alertes', 'graphiques'],
  },
  'overview/reports': {
    summary: 'Rapports journaliers, hebdomadaires, mensuels, annuels, par session ou par période, exportables en Excel ou imprimables.',
    steps: ['Ouvrez « Rapports ».', 'Choisissez le type de rapport et la période.', 'Consultez-le à l’écran puis exportez-le ou imprimez-le.'],
    keywords: ['rapport', 'export', 'bilan', 'periode'],
  },
  'overview/fiche': {
    summary: 'Fiche de présence journalière prête à imprimer ou à exporter, avec l’en-tête SAG / AGES.',
    steps: ['Ouvrez « Fiche journalière ».', 'Choisissez la date et, si besoin, la session.', 'Imprimez la fiche ou exportez-la en Excel.'],
    keywords: ['fiche de presence', 'imprimer', 'liste d appel'],
  },

  // ── Organisation pédagogique ──────────────────────────────────────────────
  'parametres/annees': {
    summary: 'Création et gestion des années scolaires ; une seule année est active à la fois.',
    steps: ['Ouvrez Paramètres › « Années scolaires ».', 'Cliquez sur « Nouvelle année ».', 'Saisissez le libellé (ex. 2026-2027) et les dates de début et de fin.', 'Enregistrez, puis activez l’année si elle doit devenir l’année en cours.'],
    tips: ['Le libellé doit être unique.', 'La date de fin doit être postérieure à la date de début.', 'L’année active ne peut pas être supprimée : activez d’abord une autre année.', 'Une année qui contient des sessions ne peut pas être supprimée.'],
    creates: 'annees_scolaires',
    keywords: ['annee scolaire', 'annee active', 'activer annee'],
    related: ['parametres/sessions'],
  },
  'parametres/types': {
    summary: 'Types de formation (ex. alphabétisation) rattachés aux sessions.',
    steps: ['Ouvrez Paramètres › « Types de formations ».', 'Cliquez sur « Ajouter un type de formation ».', 'Saisissez le libellé et enregistrez.'],
    tips: ['Le libellé doit être unique.', 'Un type utilisé par une session ne peut pas être supprimé.'],
    creates: 'types_formations',
    keywords: ['type de formation', 'formation', 'alphabetisation'],
    related: ['parametres/sessions'],
  },
  'parametres/sessions': {
    summary: 'Création des sessions de formation : une période rattachée à une année, un type de formation et un niveau.',
    steps: ['Vérifiez que l’année scolaire, le type de formation et le niveau existent.', 'Ouvrez Paramètres › « Sessions » puis cliquez sur « Nouvelle session ».', 'Renseignez le code, le libellé, l’année, le type de formation, le niveau, les dates et le statut.', 'Enregistrez, puis créez les groupes de la session.'],
    tips: ['Le code de session est unique.', 'Le libellé est unique pour une même année et un même type de formation.', 'La date de fin doit être égale ou postérieure à la date de début.', 'Une session qui contient des groupes ou des évaluations ne peut pas être supprimée.'],
    creates: 'sessions',
    keywords: ['creer une session', 'session de formation', 'nouvelle session'],
    related: ['parametres/groupes', 'parametres/niveaux'],
  },
  'parametres/groupes': {
    summary: 'Groupes (classes) d’une session : jour de cours, horaires et capacité.',
    steps: ['Vérifiez que la session existe.', 'Ouvrez Paramètres › « Groupes » puis cliquez sur « Nouveau groupe ».', 'Choisissez la session, saisissez le code et le libellé.', 'Indiquez le jour (lundi à vendredi), les heures de début et de fin, et la capacité si elle est limitée.', 'Enregistrez.'],
    tips: ['Le code est unique au sein d’une session.', 'Le jour va de 1 (lundi) à 5 (vendredi) et l’heure de fin doit suivre l’heure de début.', 'La capacité est facultative mais doit être un entier positif.', 'Un groupe utilisé dans un emploi du temps ne peut pas être supprimé.'],
    creates: 'groupes',
    keywords: ['classe', 'creer un groupe', 'nouveau groupe', 'jour de cours', 'horaire'],
    related: ['salles/affectations'],
  },

  // ── Emplois du temps ──────────────────────────────────────────────────────
  'emplois-temps/planning_general': {
    summary: 'Liste de tous les créneaux de l’année : jour, groupe, session, formateur, salle, inscrits actifs, statut. Export en Excel disponible.',
    steps: ['Choisissez l’année scolaire.', 'Filtrez par jour, statut ou recherche libre.', 'Exportez la liste si besoin.'],
    keywords: ['planning general', 'tous les creneaux', 'liste des horaires'],
  },
  'emplois-temps/groupe': {
    summary: 'Emploi du temps d’un groupe précis.',
    steps: ['Ouvrez « Par groupe ».', 'Sélectionnez le groupe : ses créneaux (jour, salle, formateur) s’affichent.'],
    keywords: ['planning d un groupe', 'horaire de la classe'],
  },
  'emplois-temps/calendrier': {
    summary: 'Vue calendrier des créneaux.',
    keywords: ['semaine', 'agenda', 'calendrier'],
  },
  'emplois-temps/statistiques': {
    summary: 'Indicateurs sur la charge des salles, des formateurs et des groupes.',
    keywords: ['indicateurs', 'occupation', 'charge'],
  },

  // ── Auditeurs & inscriptions ──────────────────────────────────────────────
  'auditeurs/liste': {
    summary: 'Liste, recherche et gestion des auditeurs (matricule, identité, contact, type d’employé, niveau) et accès à leur dossier complet.',
    steps: ['Ouvrez « Liste des auditeurs ».', 'Recherchez ou filtrez, puis ouvrez le dossier d’un auditeur (identité, parcours, présences, notes, relevés).', 'Créez ou modifiez un auditeur avec les boutons de la liste.'],
    tips: ['Le matricule est unique.', 'Le sexe accepte M ou F ; l’e-mail doit être valide.', 'Un auditeur qui possède des inscriptions ne peut pas être supprimé.'],
    creates: 'auditeurs',
    keywords: ['nouvel auditeur', 'ajouter un auditeur', 'dossier auditeur', 'matricule', 'eleve', 'apprenant'],
    related: ['auditeurs/inscriptions', 'parametres/types-employes'],
  },
  'auditeurs/inscriptions': {
    summary: 'Inscription des auditeurs dans un groupe et une salle, transferts et suivi du statut (active, terminée, abandonnée, annulée).',
    steps: ['Vérifiez que l’auditeur existe et que le groupe est affecté à une salle (emploi du temps).', 'Ouvrez « Inscriptions & Classes » puis cliquez sur « Nouvelle inscription ».', 'Choisissez l’auditeur, le groupe et la salle, puis le département et la date.', 'Enregistrez. Pour changer de classe, utilisez le transfert.'],
    tips: ['Indiquez toujours le groupe ET la salle : c’est la salle (créneau) qui porte l’inscription.', 'Un auditeur ne peut être inscrit qu’une fois dans une même salle.', 'Seuls la salle, le département, la date et le statut peuvent être modifiés après coup.'],
    creates: 'inscriptions',
    keywords: ['inscrire un auditeur', 'nouvelle inscription', 'reinscription', 'transfert', 'changer de classe', 'abandon'],
    related: ['salles/affectations', 'auditeurs/liste'],
  },
  'auditeurs/statistiques': {
    summary: 'Bilan statistique des effectifs : remplissage des classes, répartition par sexe, nouvelles inscriptions, abandons. Export Excel et impression.',
    keywords: ['bilan', 'effectifs', 'repartition', 'taux de remplissage'],
  },

  // ── Formateurs ────────────────────────────────────────────────────────────
  'formateurs/liste': {
    summary: 'Liste des formateurs : création du compte formateur, salle attitrée, activation, accès à leur emploi du temps.',
    steps: ['Ouvrez « Liste des formateurs » puis créez un formateur.', 'Saisissez le matricule, le nom, le prénom, un e-mail ou un téléphone et un mot de passe initial.', 'Rattachez-le à une salle libre (un formateur = une salle).', 'Enregistrez : un compte de connexion est créé en même temps.'],
    tips: ['Le matricule et l’e-mail sont uniques.', 'Un e-mail ou un téléphone est requis pour créer les identifiants.', 'Une salle ne peut avoir qu’un formateur attitré.', 'Un formateur utilisé dans un emploi du temps ou des présences ne peut pas être supprimé : désactivez-le.', 'Un formateur lié à un compte se gère aussi depuis « Utilisateurs & rôles ».'],
    creates: 'formateurs',
    keywords: ['nouveau formateur', 'creer un formateur', 'enseignant', 'compte formateur', 'salle attitree'],
    related: ['salles/salles', 'utilisateurs/liste'],
  },
  'formateurs/affectations': {
    summary: 'Affectation d’un formateur à un groupe, dans une salle, pour le jour de cours du groupe.',
    steps: ['Vérifiez qu’un groupe, une salle et un formateur existent.', 'Ouvrez « Affectations groupe / session » puis cliquez sur « Nouvelle affectation ».', 'Choisissez l’année, le groupe, la salle (le formateur de la salle est proposé) puis le formateur.', 'Enregistrez.'],
    tips: ['Le jour est celui du groupe ; les horaires sont ceux du groupe.', 'Une salle ou un formateur déjà occupé ce jour-là est refusé.'],
    creates: 'emplois_du_temps',
    extraRequires: ['salles_avec_formateur'],
    keywords: ['affecter un formateur', 'affectation formateur', 'emploi du temps formateur'],
    related: ['salles/affectations', 'emplois-temps/groupe'],
  },
  'formateurs/emploi': {
    summary: 'Emploi du temps d’un formateur : séances, ajout, modification et suppression.',
    steps: ['Ouvrez « Emploi du temps » et choisissez le formateur.', 'Ajoutez une séance avec « Ajouter une séance », ou modifiez/supprimez une séance existante.'],
    tips: ['Un créneau utilisé par des inscriptions ou des présences ne peut pas être supprimé : désactivez-le.'],
    creates: 'emplois_du_temps',
    extraRequires: ['salles_avec_formateur'],
    keywords: ['planning formateur', 'seance', 'horaire formateur'],
  },
  'formateurs/charge': {
    summary: 'Nombre de créneaux hebdomadaires par formateur.',
    keywords: ['charge de travail', 'volume horaire', 'creneaux par formateur'],
  },

  // ── Salles ────────────────────────────────────────────────────────────────
  'salles/salles': {
    summary: 'Registre des salles : code, libellé, capacité, statut et formateur attitré.',
    steps: ['Vérifiez qu’un formateur sans salle existe (sinon créez-le d’abord : le guide vous y redirige).', 'Ouvrez « Salles » puis cliquez sur « Nouvelle salle ».', 'Saisissez le code, le libellé et la capacité.', 'Choisissez le statut et le formateur attitré (obligatoire : seuls les formateurs sans salle sont proposés).', 'Enregistrez.'],
    tips: ['Un formateur attitré est obligatoire dès la création : une salle sans formateur ne peut pas être affectée à un groupe.', 'Le code (30 caractères max.) est unique.', 'La capacité ne peut pas être inférieure au nombre d’auditeurs actifs déjà planifiés.', 'Une salle avec des créneaux actifs ne peut pas être rendue indisponible.', 'Une salle utilisée dans un emploi du temps ne peut pas être supprimée.'],
    creates: 'salles',
    extraRequires: ['formateurs_libres'],
    keywords: ['nouvelle salle', 'creer une salle', 'ajouter une salle', 'capacite', 'local'],
    related: ['formateurs/liste', 'salles/affectations'],
  },
  'salles/affectations': {
    summary: 'Affectation d’un groupe à une salle : c’est ainsi qu’un créneau d’emploi du temps est créé.',
    steps: ['Vérifiez qu’il existe un groupe et une salle disponible avec un formateur attitré.', 'Ouvrez « Affectations groupe-salle » puis cliquez sur « Affecter une classe ».', 'Choisissez l’année, éventuellement la session, puis le groupe dans la liste.', 'Choisissez la salle parmi celles proposées : seules les salles libres le jour du groupe apparaissent.', 'Vérifiez le récapitulatif (jour et formateur déduits automatiquement) puis enregistrez.'],
    tips: ['Le jour est celui du groupe et le formateur celui de la salle.', 'Une salle sans formateur attitré n’est pas proposée : attribuez-lui d’abord un formateur.', 'Un groupe peut occuper plusieurs salles le même jour.', 'Un créneau lié à des inscriptions ou des présences ne peut pas être supprimé : désactivez-le.'],
    creates: 'emplois_du_temps',
    extraRequires: ['salles_avec_formateur'],
    reads: ['emplois-temps', 'organisation-pedagogique', 'formateurs'],
    keywords: ['affecter une classe', 'affecter un groupe a une salle', 'attribuer une salle', 'reserver une salle', 'creneau'],
    related: ['parametres/groupes', 'formateurs/liste'],
  },
  'salles/disponibilite': {
    summary: 'Disponibilité des salles.',
    keywords: ['salle libre', 'salle occupee', 'disponible'],
  },
  'salles/statistiques': {
    summary: 'Taux d’occupation et capacité des salles.',
    reads: ['auditeurs', 'emplois-temps', 'organisation-pedagogique'],
    keywords: ['occupation', 'remplissage'],
  },

  // ── Évaluations & notes ───────────────────────────────────────────────────
  'evaluations/saisie': {
    summary: 'Saisie des notes par critère pour chaque inscription d’une session.',
    steps: ['Vérifiez que la session a des évaluations avec des critères et des inscriptions actives.', 'Ouvrez « Saisie des notes » et choisissez la session puis l’évaluation.', 'Saisissez les notes de chaque auditeur puis enregistrez.', 'Consultez ensuite la situation des notes.'],
    tips: ['La moyenne sur 4 = somme des notes ÷ somme des barèmes × 4.', '« Créer les évaluations manquantes » génère les évaluations prévues par la règle de la session.', 'Les formateurs saisissent les notes depuis leur espace, limité à leurs classes.'],
    creates: 'notes',
    reads: ['auditeurs', 'organisation-pedagogique', 'emplois-temps'],
    keywords: ['saisir les notes', 'entrer une note', 'noter', 'notes d une evaluation', 'cotation'],
    related: ['evaluations/types', 'evaluations/rapport'],
  },
  'evaluations/liste': {
    summary: 'Liste détaillée de toutes les notes, avec export Excel et impression.',
    reads: ['auditeurs', 'organisation-pedagogique', 'emplois-temps'],
    keywords: ['toutes les notes', 'export notes', 'modifier une note'],
  },
  'evaluations/rapport': {
    summary: 'Situation des notes d’une session : moyennes, appréciation, présence et résultat de chaque auditeur.',
    keywords: ['situation', 'moyenne generale', 'resultat de la session', 'classement'],
  },
  'evaluations/passages': {
    summary: 'Décisions de passage de niveau (admis, non admis, redoublement, abandon), automatiques ou validées manuellement.',
    steps: ['Ouvrez « Passage de niveau » et choisissez la session.', 'Contrôlez les résultats proposés selon les règles (moyenne d’admission, taux de présence).', 'Validez les décisions.'],
    tips: ['La validation demande la permission « Valider / Clôturer ».'],
    extraRequires: ['notes'],
    keywords: ['passage de niveau', 'admis', 'redoublement', 'decision', 'valider les resultats'],
  },
  'evaluations/releves': {
    summary: 'Relevés de notes individuels prêts à imprimer, avec l’en-tête SAG / AGES.',
    reads: ['auditeurs', 'organisation-pedagogique', 'emplois-temps'],
    keywords: ['bulletin', 'releve de notes', 'imprimer releve'],
  },
  'evaluations/types': {
    summary: 'Définition des évaluations d’une session, de leurs critères (avec barème) et des règles de calcul et d’appréciation.',
    steps: ['Créez les critères (libellé et barème).', 'Créez l’évaluation : session, numéro, libellé et date.', 'Rattachez-lui ses critères.', 'Contrôlez la règle d’évaluation et le barème d’appréciation.'],
    tips: ['Le numéro d’évaluation va de 1 à 9, unique par session.', 'Le barème d’un critère doit être positif.', 'La date respecte le format AAAA-MM-JJ.'],
    creates: 'evaluations',
    keywords: ['creer une evaluation', 'nouvelle evaluation', 'criteres', 'bareme', 'regles d evaluation', 'bareme d appreciation'],
    related: ['evaluations/saisie', 'parametres/evaluations'],
  },
  'evaluations/statistiques': {
    summary: 'Statistiques des évaluations : moyennes, répartition des résultats, notes manquantes.',
    keywords: ['stats notes', 'moyennes', 'repartition'],
  },

  // ── Présences ─────────────────────────────────────────────────────────────
  'presences/date': {
    summary: 'Feuille de pointage d’une date : un statut pour chaque auditeur attendu (présent, absent, permissionnaire, malade, congé).',
    steps: ['Vérifiez que les auditeurs sont inscrits dans un créneau de ce jour.', 'Ouvrez « Feuille de pointage » et choisissez la date.', 'Pointez chaque auditeur ; l’enregistrement est immédiat.', 'Exportez la feuille si besoin.'],
    tips: ['Un formateur ne peut pointer que la date du jour et seulement ses propres classes.', 'Pour un congé, indiquez les dates de début et de fin.'],
    creates: 'presences',
    keywords: ['pointer', 'faire l appel', 'marquer absent', 'enregistrer une absence', 'presence du jour'],
    related: ['presences/statistiques'],
  },
  'presences/salle': { summary: 'Présences regroupées par salle et par période.', keywords: ['absences par salle'] },
  'presences/auditeur': { summary: 'Historique de présence d’un auditeur.', keywords: ['absences d un auditeur', 'consulter les absences', 'assiduite'] },
  'presences/groupe': { summary: 'Présences regroupées par groupe.', keywords: ['absences par groupe', 'classe'] },
  'presences/formateur': { summary: 'Présences pointées par formateur.', keywords: ['absences par formateur'] },
  'presences/emploi': { summary: 'Présences d’un créneau précis de l’emploi du temps.', keywords: ['par creneau', 'par seance'] },
  'presences/statistiques': {
    summary: 'Taux de présence, absences et répartition des statuts sur une période.',
    keywords: ['taux de presence', 'absenteisme', 'statistiques presences'],
  },

  // ── Utilisateurs & rôles ──────────────────────────────────────────────────
  'utilisateurs/dashboard': { summary: 'Vue d’ensemble des comptes et des rôles.', keywords: ['synthese comptes'] },
  'utilisateurs/liste': {
    summary: 'Création, modification, activation et suppression des comptes de connexion.',
    steps: ['Vérifiez que le rôle voulu existe.', 'Ouvrez « Comptes Utilisateurs » et créez un compte.', 'Renseignez l’identité, un e-mail ou un téléphone, le rôle et le mot de passe.', 'Enregistrez ; activez ou désactivez le compte selon les besoins.'],
    tips: ['Un e-mail ou un numéro de téléphone est obligatoire.', 'Vous ne pouvez pas désactiver ou supprimer votre propre compte.', 'Le dernier compte administrateur actif est protégé.', 'Un compte formateur demande un matricule.'],
    creates: 'users',
    keywords: ['creer un compte', 'nouvel utilisateur', 'mot de passe oublie', 'reinitialiser', 'desactiver un compte', 'identifiants'],
    related: ['utilisateurs/roles'],
  },
  'utilisateurs/roles': {
    summary: 'Création et gestion des rôles (profils d’accès).',
    steps: ['Ouvrez « Rôles & Profils » puis créez un rôle.', 'Saisissez un code (minuscules, chiffres, tirets bas) et un nom.', 'Définissez ses droits dans la matrice.'],
    tips: ['Code de 2 à 30 caractères ; code et nom uniques.', 'Un rôle attribué à des utilisateurs ne peut pas être supprimé.', 'Le rôle administrateur système est protégé : ses permissions sont toujours complètes.'],
    creates: 'roles',
    keywords: ['creer un role', 'profil', 'role'],
    related: ['utilisateurs/matrice'],
  },
  'utilisateurs/matrice': {
    summary: 'Matrice des droits : pour chaque rôle et chaque module, les actions autorisées (lire, créer, modifier, supprimer, exporter, valider).',
    steps: ['Ouvrez « Matrice des Droits ».', 'Cochez les actions autorisées pour chaque module du rôle.', 'Enregistrez : les droits s’appliquent aux comptes concernés en quelques secondes.'],
    keywords: ['permissions', 'droits', 'autorisations', 'acces', 'pourquoi je ne peux pas'],
  },

  // ── Paramètres ────────────────────────────────────────────────────────────
  'parametres/configuration': {
    summary: 'Tableau de bord de la configuration : toutes les données nécessaires au fonctionnement de l’académie, rangées dans l’ordre de leurs dépendances, avec leur état (Terminé, À configurer, Bloqué).',
    steps: ['Ouvrez « Configuration » : l’étape recommandée est mise en évidence.', 'Cliquez sur « Configurer » pour créer l’élément, directement ici ou dans son module.', 'Une étape « Bloquée » indique ce qu’il faut créer avant, avec un bouton d’accès direct.'],
    keywords: ['configurer', 'premiere utilisation', 'demarrage', 'ordre', 'dependances', 'etat de la configuration', 'progression'],
    related: ['parametres/annees', 'parametres/sessions'],
  },
  'parametres/departements': {
    summary: 'Départements de l’entreprise, utilisés lors des inscriptions.',
    tips: ['Le code est unique.', 'Un département utilisé par des inscriptions ne peut pas être supprimé.'],
    creates: 'departements',
    keywords: ['departement', 'service'],
  },
  'parametres/niveaux': {
    summary: 'Niveaux de formation et leur ordre (utilisés par les sessions et les passages de niveau).',
    tips: ['Le libellé est unique ; l’ordre détermine le niveau suivant.'],
    creates: 'niveaux',
    keywords: ['niveau', 'ordre des niveaux'],
  },
  'parametres/types-employes': {
    summary: 'Types d’employés (ex. SAG, contractor) attribués aux auditeurs.',
    tips: ['Le libellé est unique.'],
    creates: 'types_employes',
    keywords: ['type d employe', 'categorie d employe'],
  },
  'parametres/evaluations': {
    summary: 'Critères d’évaluation et leur barème.',
    tips: ['Le barème doit être positif et ne pas dépasser 999,99.'],
    creates: 'parametres',
    keywords: ['critere', 'bareme', 'parametres d evaluation'],
  },

  // ── Espace formateur ──────────────────────────────────────────────────────
  'espace-formateur/schedule': { summary: 'Votre emploi du temps : les créneaux de vos classes.', keywords: ['mon planning', 'mes horaires'] },
  'espace-formateur/students': { summary: 'Les auditeurs inscrits dans vos classes.', keywords: ['mes eleves', 'mes auditeurs'] },
  'espace-formateur/attendance-entry': {
    summary: 'Pointage de vos classes pour la date du jour.',
    tips: ['Vous ne pouvez pointer que la date du jour et vos propres classes.'],
    creates: 'presences',
    keywords: ['faire l appel', 'pointer', 'absences du jour'],
  },
  'espace-formateur/attendance': { summary: 'Historique des présences de vos classes.', keywords: ['consulter les absences', 'historique'] },
  'espace-formateur/grade-entry': {
    summary: 'Saisie des notes de vos classes.',
    creates: 'notes',
    keywords: ['saisir les notes', 'noter mes eleves'],
  },
  'espace-formateur/results': { summary: 'Résultats de vos classes par session.', keywords: ['moyennes', 'resultats'] },
  'espace-formateur/grades': { summary: 'Historique des notes que vous avez saisies.', keywords: ['mes notes', 'historique des notes'] },
};

/**
 * Parcours guidés. Chaque étape pointe vers une fonctionnalité réelle (clé « module/sousOnglet »)
 * et, si possible, vers le contrôle qui dit si elle est déjà faite (`check`, voir dependencies.js).
 * Une étape dont la fonctionnalité n’existe plus dans le code est écartée automatiquement.
 */
export const JOURNEYS = [
  {
    id: 'session',
    title: 'Mettre en place une session de formation',
    summary: 'De l’année scolaire aux groupes : la structure pédagogique dont dépend tout le reste.',
    keywords: ['demarrer', 'commencer', 'nouvelle session', 'preparer la rentree', 'structure pedagogique'],
    steps: [
      { feature: 'parametres/annees', check: 'annees_scolaires', title: 'Créer l’année scolaire' },
      { feature: 'parametres/types', check: 'types_formations', title: 'Créer le type de formation' },
      { feature: 'parametres/niveaux', check: 'niveaux', title: 'Définir les niveaux' },
      { feature: 'parametres/sessions', check: 'sessions', title: 'Créer la session' },
      { feature: 'parametres/groupes', check: 'groupes', title: 'Créer les groupes' },
    ],
  },
  {
    id: 'planning',
    title: 'Planifier les cours : salles, formateurs et emploi du temps',
    summary: 'Préparer les ressources puis affecter chaque groupe à une salle.',
    keywords: ['emploi du temps', 'planifier', 'affecter', 'salle', 'formateur'],
    steps: [
      { feature: 'salles/salles', check: 'salles', title: 'Créer les salles' },
      { feature: 'formateurs/liste', check: 'formateurs', title: 'Créer les formateurs' },
      { feature: 'formateurs/liste', check: 'salles_avec_formateur', title: 'Attribuer un formateur à chaque salle' },
      { feature: 'salles/affectations', check: 'emplois_du_temps', title: 'Affecter les groupes aux salles' },
    ],
  },
  {
    id: 'inscription',
    title: 'Inscrire un auditeur',
    summary: 'Créer l’auditeur puis l’inscrire dans un groupe et une salle.',
    keywords: ['inscrire', 'nouvel auditeur', 'inscription'],
    steps: [
      { feature: 'parametres/departements', check: 'departements', title: 'Disposer d’un département' },
      { feature: 'auditeurs/liste', check: 'auditeurs', title: 'Créer l’auditeur' },
      { feature: 'salles/affectations', check: 'emplois_du_temps', title: 'S’assurer que le groupe est affecté à une salle' },
      { feature: 'auditeurs/inscriptions', check: 'inscriptions', title: 'Inscrire l’auditeur' },
    ],
  },
  {
    id: 'presences',
    title: 'Suivre les présences',
    summary: 'Pointer chaque jour puis analyser les absences.',
    keywords: ['pointage', 'absences', 'appel', 'presence'],
    steps: [
      { feature: 'auditeurs/inscriptions', check: 'inscriptions', title: 'Avoir des auditeurs inscrits' },
      { feature: 'presences/date', check: 'presences', title: 'Pointer la feuille du jour' },
      { feature: 'presences/statistiques', title: 'Analyser les statistiques de présence' },
    ],
  },
  {
    id: 'evaluation',
    title: 'Préparer une évaluation et exploiter les résultats',
    summary: 'Critères, évaluation, saisie des notes, résultats, passage de niveau et relevés.',
    keywords: ['evaluation', 'notes', 'examen', 'resultats', 'releves'],
    steps: [
      { feature: 'evaluations/types', check: 'parametres', title: 'Créer les critères et leur barème' },
      { feature: 'evaluations/types', check: 'evaluations', title: 'Créer l’évaluation de la session' },
      { feature: 'evaluations/saisie', check: 'notes', title: 'Saisir les notes' },
      { feature: 'evaluations/rapport', title: 'Contrôler la situation des notes' },
      { feature: 'evaluations/passages', title: 'Valider les passages de niveau' },
      { feature: 'evaluations/releves', title: 'Imprimer les relevés' },
    ],
  },
  {
    id: 'acces',
    title: 'Donner un accès à un utilisateur',
    summary: 'Définir un rôle et ses droits, puis créer le compte.',
    keywords: ['compte', 'acces', 'role', 'droits', 'permission'],
    steps: [
      { feature: 'utilisateurs/roles', check: 'roles', title: 'Créer ou choisir un rôle' },
      { feature: 'utilisateurs/matrice', title: 'Définir ses droits dans la matrice' },
      { feature: 'utilisateurs/liste', check: 'users', title: 'Créer le compte et lui attribuer le rôle' },
    ],
  },
];

/** Synonymes courants du vocabulaire de l'application (chaque ligne = un groupe équivalent). */
export const SYNONYMS = [
  ['inscrire', 'inscription', 'inscriptions', 'reinscription', 'inscrit'],
  ['creer', 'ajouter', 'nouveau', 'nouvelle', 'ajout', 'creation', 'enregistrer'],
  ['modifier', 'editer', 'changer', 'modification', 'corriger', 'mettre'],
  ['supprimer', 'effacer', 'retirer', 'enlever', 'suppression'],
  ['absence', 'absences', 'absent', 'presence', 'presences', 'pointage', 'pointer', 'appel', 'assiduite'],
  ['note', 'notes', 'saisie', 'saisir', 'noter', 'cotation'],
  ['auditeur', 'auditeurs', 'eleve', 'eleves', 'apprenant', 'apprenants', 'etudiant', 'stagiaire'],
  ['formateur', 'formateurs', 'enseignant', 'professeur', 'prof', 'intervenant'],
  ['salle', 'salles', 'local', 'locaux'],
  ['groupe', 'groupes', 'classe', 'classes'],
  ['planning', 'horaire', 'horaires', 'calendrier', 'edt', 'agenda', 'emploi'],
  ['exporter', 'export', 'telecharger', 'excel', 'csv', 'imprimer', 'impression', 'pdf'],
  ['compte', 'comptes', 'utilisateur', 'utilisateurs', 'identifiant', 'connexion'],
  ['droit', 'droits', 'permission', 'permissions', 'autorisation', 'acces', 'role', 'roles'],
  ['session', 'sessions', 'formation'],
  ['affecter', 'affectation', 'affectations', 'attribuer', 'attribution', 'assigner'],
  ['evaluation', 'evaluations', 'examen', 'controle', 'test'],
  ['resultat', 'resultats', 'moyenne', 'bulletin', 'releve', 'releves'],
  ['annee', 'annees', 'exercice'],
  ['mot de passe', 'password', 'mdp'],
];
