# Spécification fonctionnelle — Gestion Académie (AGES)

Application web (React + API PHP/MySQL `Backend_AGES`, base `academie_langues3`) de gestion d’une académie : organisation pédagogique, inscriptions, salles, formateurs, présences, évaluations et passages de niveau.

## 1. Principes directeurs

- **Données réelles** : tout est lu et écrit en base ; aucune donnée fictive.
- **Une seule source de calcul** : moyennes, appréciations, taux et décisions sont calculés par le serveur (`Resultat`, `Dashboard`, `Presence::getFeuille`) et réutilisés par tous les écrans, pour garantir la cohérence des chiffres.
- **Organisation par année et par session** : inscriptions, groupes, salles, formateurs, présences et résultats sont rattachés à une année scolaire et à une session.
- **Actualisation automatique** : après toute création, modification ou suppression, les écrans ouverts se rechargent en silence (hook `useLiveRefresh`, aussi au retour sur l’onglet et à intervalle régulier).
- **Confirmation systématique** des créations, modifications et suppressions (modale animée) ; **notifications** animées (toasts) à la place des alertes du navigateur.
- **Rôles stricts** : contrôle des permissions côté serveur (`Authorization`) ; l’interface ne fait que masquer.

## 2. Rôles et accès

| Rôle | Accès |
| --- | --- |
| Administrateur | Tous les modules, tous les filtres, validation des passages, paramètres, journal des opérations. |
| Formateur | Uniquement ses salles, groupes, sessions et auditeurs (créneaux où il est affecté) : espace formateur, feuille de pointage du jour, saisie des notes, résultats de ses classes, calendrier filtré. |
| Autres rôles (scolarité, secrétaire…) | Selon la matrice de permissions par module (`read`, `create`, `update`, `delete`, `validate`). |

Un formateur ne peut pointer que **la date du jour** et seulement ses auditeurs ; ses notes sont verrouillées une fois le passage de niveau validé.

## 3. Modèle métier

- **Année scolaire** → **Sessions** (type de formation, niveau, période, statut) → **Groupes** (un jour de cours, horaires, capacité).
- **Créneau (emploi du temps)** = groupe × salle × jour. Un groupe utilise **plusieurs salles** le même jour ; chaque salle a **un seul formateur attitré** et ses propres auditeurs. Le jour du créneau suit automatiquement le jour du groupe.
- **Auditeur** : identité, position, type d’employé, niveau actuel. **Inscription** : auditeur + session + groupe + salle (créneau) + département ; un auditeur n’a qu’**une inscription active par session**.
- **Évaluations** : 3 par session (nombre configurable), numérotées ; chacune a des critères avec barème.
- **Règles** (`regles_evaluation`) : règle générale + règles par niveau (moyenne d’admission, présence minimale, passage automatique, nombre d’évaluations). **Barème d’appréciation** (`baremes_appreciation`) : notes 1 à 4 selon des seuils de moyenne.
- **Passage de niveau** : historique par inscription (décision, moyenne, appréciation, présence, mode automatique/manuel).
- **Journal des opérations** : trace de chaque écriture (utilisateur, action, ressource, code, message ; mots de passe masqués).

## 4. Modules

| Module | Fonctions |
| --- | --- |
| Tableau de bord | Indicateurs réels (auditeurs, formateurs, salles, groupes, sessions en cours, évaluations réalisées), pointage attendu/réalisé du jour, effectifs par salle/groupe/session/niveau/type d’employé/département, taux de présence et d’absence, résultats et moyennes, graphiques interactifs, alertes. |
| Fiche journalière | Sous-onglet du tableau de bord : feuille de présence **A4 paysage** générée automatiquement pour chaque classe (salle × groupe) d'une date — logos SAG / AGES, bandeau « Siguiri Education Project », date, salle, niveau, formateur, effectif par type d'employé, une ligne par auditeur (+3 lignes de réserve : département, jour, salle, matricule, poste, sexe, nom, téléphone) ; présents, absents, signatures et observations restent à remplir à la main ; pied de page « Vérifié par : AGES COORDINATEUR » / « SAG EDUCATION PROJECT » ; impression et PDF. |
| Rapports | **7 sous-onglets, 56 analyses** générées par le serveur à partir des données réelles : (1) auditeurs (effectif, listes par groupe/salle/session/niveau, répartitions par département et type d'employeur, statuts d'inscription) ; (2) présences (journalier, hebdomadaire, mensuel, annuel, par auditeur/groupe/salle/formateur/session, absences justifiées ou non) ; (3) notes et évaluations (par évaluation, résultats, moyennes, appréciations, notes manquantes, classement) ; (4) passage de niveau (admis, non admis, redoublements, décisions par session et par année, progression, taux de réussite) ; (5) formateurs (affectations, séances, groupes, salles, présences et notes saisies) ; (6) salles et emplois du temps (occupation, disponibilité, séances, emplois du temps, conflits, effectifs) ; (7) administratifs et statistiques (tableau général, par année/session/département/type, comparatif, global, synthèse annuelle). Filtres adaptés à chaque catégorie (période, année, session, niveau, groupe, salle, formateur, département, type d'employeur…). **Export Excel (.xlsx)** et **PDF** (impression) en **A4 paysage** : en-tête avec logos SAG / AGES et titre de l'analyse, pied de page « Vérifié par : AGES COORDINATEUR » / « SAG EDUCATION PROJECT ». La fiche journalière s'exporte aussi en Excel. |
| Organisation pédagogique | Années, sessions, groupes (jour + horaires), types de formation. |
| Auditeurs & inscriptions | Fiche auditeur (position, type d’employé), inscription guidée Session → Groupe (jour automatique) → Salle, modification et suppression, dossier individuel complet. |
| Dossier individuel | Identité et données administratives, parcours (niveaux, groupes, sessions, affectations), historique complet des présences, notes/moyennes/appréciations par évaluation et par session, relevés imprimables, décisions de passage. |
| Salles | Salles, formateur attitré, affectations groupe↔salle, disponibilité, statistiques. |
| Emplois du temps | Vue générale, par groupe (salles, formateurs, auditeurs), **calendrier** jour/semaine/mois avec détection des conflits (salle, formateur, capacité, jour), statistiques. |
| Formateurs | Fiche, compte, charge de travail ; **espace formateur** (date du jour automatique, pointage, notes, résultats de ses classes). |
| Présences | **Feuille de pointage automatique** (auditeurs attendus selon date, session, groupe, salle, formateur ; congés pris en compte), historiques par auditeur/groupe/salle/formateur, statistiques. |
| Évaluations & notes | Saisie par session → groupe → salle → évaluation (moyenne et appréciation en direct), liste des notes (filtres session, groupe, salle, évaluation), situation des notes, passage de niveau automatique, relevés (impression individuelle ou groupée), statistiques, critères et règles. |
| Paramètres | Départements, niveaux (ordre), types de formation, types d’employés, sessions, critères d’évaluation, **règles d’évaluation**, **barème d’appréciation** (ajout, modification, suppression). |
| Utilisateurs | Comptes, rôles, matrice de permissions, **journal des opérations**. |

## 5. Calculs

- Moyenne d’une évaluation = Σ notes ÷ Σ barèmes × 4 (uniquement si tous les critères sont notés).
- Moyenne générale = moyenne des évaluations de la session, calculable quand les N évaluations prévues sont complètes.
- Appréciation = plus haute note du barème dont le seuil est atteint.
- Résultat : **admis** (moyenne ≥ seuil et présence ≥ minimum), **non admis**, **en attente** (notes ou évaluations manquantes), **abandon**.
- Validation des passages : à la clôture de la session (si automatique) ou par bouton ; met à jour le niveau de l’auditeur et conserve l’historique.
- Taux de présence = présents ÷ pointages ; taux d’absence = absents ÷ pointages.

## 6. Rappels

La cloche affiche, selon le rôle et les données du jour : pointage du jour à compléter, notes manquantes pour des évaluations passées, évaluations dans les 7 jours, sessions bientôt terminées sans passages validés, groupes sans salle, évaluations à planifier, salles surchargées. Chaque point est annoncé une fois par jour et ouvre l’écran concerné.

## 7. Règles d’interface

- Listes de sélection **déroulantes avec étiquettes** (recherche, sélection simple ou multiple, clavier) dans tous les formulaires d'affectation, d'inscription, de paramètres et les filtres.
- Aucune gestion de parents / responsables d'auditeur : le dossier ne contient que l'auditeur, son parcours et ses résultats.
- Animations Framer Motion (transitions d’écran, modales, notifications, onglets, graphiques).
- Tableaux, filtres, formulaires et boutons uniformes ; mise en page responsive ; relevés et rapports adaptés à l’impression A4.

## 8. Prérequis et déploiement

- Apache + MySQL (XAMPP), base `academie_langues3` ; appliquer dans l’ordre les scripts de `Backend_AGES/database/` : `migration_2026_10_inscriptions_salles.sql`, `migration_2026_10_resultats_passages.sql`, `migration_2026_10_journal.sql`, `migration_2026_10_regles_par_niveau.sql` (le dump `DB Gestion Academie.sql` contient déjà tout).
- Fuseau horaire du serveur d’application : `Africa/Conakry` (date du jour des pointages).
- Avant mise en production : mots de passe chiffrés (actuellement en clair dans la base), HTTPS, `DEBUG_MODE` désactivé.

## 9. Critères d’acceptation

- `npm run build` réussit.
- Un formateur ne voit ni ne modifie aucune donnée hors de ses affectations (vérifié par l’API).
- Un auditeur ne peut avoir qu’une inscription active par session ; une salle pleine refuse l’inscription.
- Les chiffres du tableau de bord, des rapports, des relevés et du dossier concordent pour un même périmètre.
- Chaque création, modification, suppression et validation figure dans le journal des opérations.
