/**
 * Test de l'aide : exécute le VRAI relevé du code, le VRAI catalogue et le VRAI moteur de recherche
 * (chargés via Vite) et vérifie la cohérence : couverture des sous-onglets, textes orphelins,
 * prérequis déduits du schéma, permissions, pertinence des recherches en langage naturel.
 *
 *   node tests/aide.test.mjs
 */
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const load = (path) => server.ssrLoadModule(path);

let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? '  ✔' : '  ✘'} ${label}${detail ? `  → ${detail}` : ''}`);
  if (!ok) failures += 1;
};

try {
  const manifest = (await load('virtual:ages-features')).default;
  const { buildCatalog } = await load('/src/aide/featureModel.js');
  const { createSearchIndex } = await load('/src/aide/searchEngine.js');
  const { buildMenuItems } = await load('/src/composant/menuConfig.js');
  const { CHECKS } = await load('/src/aide/dependencies.js');

  const t = (key) => key;
  const admin = { role: 'admin', role_code: 'admin', permissions: {} };
  const trainer = { role: 'formateur', role_code: 'formateur', permissions: { presences: ['read', 'create'], formateurs: ['read'] } };
  const adminCatalog = buildCatalog({ manifest, menuItems: buildMenuItems(admin, t), currentUser: admin });
  const trainerCatalog = buildCatalog({ manifest, menuItems: buildMenuItems(trainer, t), currentUser: trainer });

  console.log('\n1. Découverte automatique');
  const modules = Object.keys(manifest.modules);
  const wanted = ['overview', 'emplois-temps', 'auditeurs', 'formateurs', 'salles', 'evaluations', 'presences', 'utilisateurs', 'parametres', 'profil'];
  check(wanted.every((id) => modules.includes(id)), 'les 11 onglets principaux sont détectés', modules.join(', '));
  const subtabCount = Object.values(manifest.modules).reduce((sum, module) => sum + module.subtabs.length, 0);
  check(subtabCount >= 40, `${subtabCount} sous-onglets détectés dans le code`);
  const actionCount = adminCatalog.features.filter((feature) => feature.type === 'action').length;
  check(actionCount >= 15, `${actionCount} actions (boutons) détectées`);
  check(Object.keys(manifest.schema).length >= 20, `${Object.keys(manifest.schema).length} tables lues dans le schéma SQL`);
  check(manifest.errors.length >= 100, `${manifest.errors.length} messages d’erreur métier relevés dans le backend`);

  console.log('\n2. Cohérence contenu ↔ code');
  check(adminCatalog.issues.undocumented.length === 0, 'tout sous-onglet détecté a un texte d’aide', adminCatalog.issues.undocumented.join(', '));
  check(adminCatalog.issues.orphanContent.length === 0, 'aucun texte d’aide ne décrit une fonctionnalité disparue', adminCatalog.issues.orphanContent.join(', '));
  check(adminCatalog.issues.badCreates.length === 0, 'les tables citées existent dans le schéma', adminCatalog.issues.badCreates.join(', '));
  check(adminCatalog.issues.badJourneySteps.length === 0, 'toutes les étapes de parcours existent', adminCatalog.issues.badJourneySteps.join(', '));
  const unknownChecks = adminCatalog.features.flatMap((feature) => feature.requires).filter((id) => !CHECKS[id]);
  check(unknownChecks.length === 0, 'tous les prérequis déduits ont un contrôle de vérification', [...new Set(unknownChecks)].join(', '));

  console.log('\n3. Prérequis déduits du schéma');
  const requires = (id) => adminCatalog.features.find((feature) => feature.id === id)?.requires.sort().join(',');
  check(requires('parametres/sessions') === 'annees_scolaires,niveaux,types_formations', 'session ← année, type de formation, niveau', requires('parametres/sessions'));
  check(requires('salles/salles')?.includes('formateurs_libres'), 'salle ← formateur disponible (sans salle attitrée)', requires('salles/salles'));
  check(!adminCatalog.modules.some((module) => module.id === 'organisation-pedagogique'), 'l’onglet « Organisation pédagogique » n’existe plus');
  check(requires('salles/affectations')?.includes('salles_avec_formateur') && requires('salles/affectations')?.includes('groupes'), 'affectation ← groupe, salle, formateur attitré', requires('salles/affectations'));
  check(requires('auditeurs/inscriptions')?.includes('emplois_du_temps') && requires('auditeurs/inscriptions')?.includes('auditeurs'), 'inscription ← auditeur, emploi du temps, département, session', requires('auditeurs/inscriptions'));
  check(requires('evaluations/saisie') === 'evaluations,inscriptions,parametres', 'notes ← évaluation, critère, inscription', requires('evaluations/saisie'));

  console.log('\n4. Permissions');
  check(adminCatalog.modules.length >= 11, `l’administrateur voit ${adminCatalog.modules.length} modules`);
  check(!trainerCatalog.features.some((feature) => feature.moduleId === 'utilisateurs'), 'le formateur ne voit pas « Utilisateurs & rôles »');
  const trainerAction = trainerCatalog.features.find((feature) => feature.type === 'action' && feature.moduleId === 'presences');
  check(!trainerAction || trainerAction.allowed !== undefined, 'les actions portent un indicateur d’autorisation');

  console.log('\n5. Pertinence des recherches (administrateur)');
  const search = createSearchIndex(adminCatalog.features, adminCatalog.journeys);
  const expectations = [
    ['Comment inscrire un nouvel auditeur ?', 'auditeurs/inscriptions'],
    ['Comment créer une session de formation ?', 'parametres/sessions'],
    ['Comment créer une salle ?', 'salles/salles'],
    ['Comment affecter un formateur à un emploi du temps ?', ['formateurs/affectations', 'salles/affectations']],
    ['Comment consulter les absences ?', ['presences/auditeur', 'presences/date', 'presences/statistiques', 'presences/groupe', 'presences/salle']],
    ['Comment saisir les notes d’une évaluation ?', 'evaluations/saisie'],
    ['Pourquoi ne puis-je pas enregistrer une inscription ?', 'auditeurs/inscriptions'],
    ['Où modifier les informations de mon compte ?', ['profil', 'utilisateurs/liste']],
    ['inscrption auditeur', 'auditeurs/inscriptions'],
    ['afecter salle', 'salles/affectations'],
    ['mot de passe', ['profil', 'utilisateurs/liste']],
    ['export excel notes', ['evaluations/liste', 'evaluations/rapport']],
    ['creer salle', 'salles/salles'],
    ['bareme', ['evaluations/types', 'parametres/evaluations']],
    ['droits d acces', ['utilisateurs/matrice', 'utilisateurs/roles']],
  ];
  expectations.forEach(([query, expected]) => {
    const { results } = search(query, { limit: 4 });
    const top = results.map((item) => item.feature.id);
    const accepted = [].concat(expected);
    const rank = top.findIndex((id) => accepted.includes(id.split('#')[0]) || accepted.includes(id));
    check(rank !== -1 && rank < 3, `« ${query} »`, `${rank === -1 ? 'absent' : `rang ${rank + 1}`} · ${top.slice(0, 3).join(' | ')}`);
  });
  const errorSearch = search('Pourquoi ne puis-je pas enregistrer une inscription ?', { limit: 3 });
  check(errorSearch.results.some((item) => item.errorHits.length > 0), 'les erreurs réelles du backend sont proposées pour une question « pourquoi »',
    errorSearch.results.flatMap((item) => item.errorHits).slice(0, 1).map((error) => error.message).join(''));
  const journeyHit = search('préparer une évaluation').journeys.map((journey) => journey.id);
  check(journeyHit.includes('evaluation'), 'un parcours guidé est proposé pour « préparer une évaluation »', journeyHit.join(', '));
  const planningJourney = search('Quelles sont les étapes à effectuer avant de créer un emploi du temps ?').journeys.map((journey) => journey.id);
  check(planningJourney.includes('planning'), 'les étapes avant un emploi du temps ouvrent le parcours « Planifier les cours »', planningJourney.join(', '));
  check(search('zzzzqqq').results.length === 0, 'une requête sans rapport ne renvoie rien');
} finally {
  await server.close();
}

console.log(failures ? `\n${failures} vérification(s) en échec.` : '\nToutes les vérifications sont passées.');
process.exit(failures ? 1 : 0);
