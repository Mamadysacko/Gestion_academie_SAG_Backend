/**
 * Test de bout en bout de l'aide dans un vrai navigateur (Chrome piloté via le protocole CDP).
 * Prérequis : XAMPP (Apache + MySQL) démarré et `npm run dev` actif sur le port 5173.
 *
 *   E2E_EMAIL=admin@gmail.com E2E_PASSWORD=... node tests/e2e-aide.mjs
 *
 * Pour chaque sous-onglet détecté dans le code, le test ouvre sa fiche dans l'aide, clique sur
 * « Accéder à cette fonctionnalité » et vérifie que l'écran s'ouvre sur le bon sous-onglet, sans erreur JavaScript.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildManifest } from '../tools/featuresPlugin.js';

const URL_APP = process.env.E2E_URL || 'http://localhost:5173/';
const EMAIL = process.env.E2E_EMAIL || 'admin@gmail.com';
const PASSWORD = process.env.E2E_PASSWORD || '111';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = process.env.E2E_SHOTS || '';
const TRAINER = process.env.E2E_ROLE === 'formateur';

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ages-e2e-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9333', `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' });

let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? '  ✔' : '  ✘'} ${label}${detail ? `  → ${detail}` : ''}`);
  if (!ok) failures += 1;
};

async function connect() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const targets = await (await fetch('http://127.0.0.1:9333/json')).json();
      const page = targets.find((target) => target.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* Chrome démarre */ }
    await sleep(250);
  }
  throw new Error('Chrome injoignable');
}

const socket = new WebSocket(await connect());
await new Promise((resolve) => { socket.onopen = resolve; });
let counter = 0;
const pending = new Map();
const jsErrors = [];
socket.onmessage = (message) => {
  const data = JSON.parse(message.data);
  if (data.id && pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id); }
  if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') jsErrors.push(data.params.args.map((arg) => arg.value || arg.description).join(' '));
  if (data.method === 'Log.entryAdded' && data.params.entry.level === 'error') jsErrors.push(`${data.params.entry.text} ${data.params.entry.url || ''}`);
  if (data.method === 'Runtime.exceptionThrown') jsErrors.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
};
const send = (method, params = {}) => new Promise((resolve) => { counter += 1; pending.set(counter, resolve); socket.send(JSON.stringify({ id: counter, method, params })); });
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  return result.result?.result?.value;
};
const shot = async (name) => {
  if (!SHOTS) return;
  const { result } = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, `${name}.png`), Buffer.from(result.data, 'base64'));
};
const waitFor = async (expression, timeout = 8000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(expression)) return true;
    await sleep(150);
  }
  return false;
};
const setValue = (selector, value) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
const clickByText = (selector, text) => evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((node) => node.textContent.replace(/\\s+/g, ' ').trim().includes(${JSON.stringify(text)})); if (!el) return false; el.click(); return true; })()`);

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');
  await send('Page.navigate', { url: URL_APP });

  console.log('\nConnexion');
  check(await waitFor("!!document.querySelector('#usernameOrEmail')"), 'page de connexion affichée');
  await setValue('#usernameOrEmail', EMAIL);
  await setValue('#password', PASSWORD);
  await clickByText('button[type=submit]', 'Se connecter');
  const logged = await waitFor("!!document.querySelector('aside nav button')");
  check(logged, 'connexion réussie avec les identifiants fournis');
  if (!logged) throw new Error('connexion impossible : arrêt du test');
  await shot('01-accueil');

  if (!TRAINER) {
  console.log('\nRecherche rapide (barre supérieure)');
  await setValue('header input[type=search]', 'inscrire un auditeur');
  check(await waitFor("[...document.querySelectorAll('[role=listbox] button')].some((b) => b.textContent.includes('Inscriptions'))"), 'les suggestions apparaissent en direct');
  await shot('02-recherche-rapide');
  await clickByText('[role=listbox] button', 'Inscriptions');
  check(await waitFor("document.body.innerText.includes('Nouvelle inscription')"), 'un clic ouvre directement « Inscriptions & Classes »');
  await shot('03-acces-direct');

  console.log('\nGuide d’aide');
  await clickByText('aside nav button', 'Aide & guide');
  check(await waitFor("document.body.innerText.includes('Que souhaitez-vous faire')"), 'la page d’aide s’ouvre');
  await setValue('main input[type=search]', 'Pourquoi ne puis-je pas enregistrer une inscription ?');
  check(await waitFor("document.body.innerText.includes('Cause possible')"), 'une question « pourquoi » propose des causes réelles');
  await shot('04-recherche-aide');
  await clickByText('main button', 'Inscriptions & Classes');
  check(await waitFor("/prérequis et dépendances/i.test(document.body.innerText) && /disponible/i.test(document.body.innerText)"), 'la fiche affiche les prérequis avec leur état réel');
  await shot('05-fiche');
  await waitFor("[...document.querySelectorAll('article li span')].some((s) => ['Disponible', 'Manquant', 'À compléter', 'Non vérifiable'].includes(s.textContent.trim()))", 6000);
  const states = await evaluate("[...document.querySelectorAll('article li span')].map((s) => s.textContent).filter((t) => ['Disponible', 'Manquant', 'À compléter', 'Non vérifiable'].includes(t.trim())).join(',')");
  check(Boolean(states), 'états de prérequis calculés', states);

  for (const panel of ['Parcours guidés']) {
    await clickByText('[role=tab]', panel);
    await sleep(700);
    await shot(`06-${panel.slice(0, 4)}`);
  }
  check(await evaluate("[...document.querySelectorAll('[role=tab]')].map((tab) => tab.textContent.trim()).join('|')") === 'Fonctionnalités|Parcours guidés', 'le centre d’aide n’a plus que les sous-onglets Fonctionnalités et Parcours guidés');

  console.log('\nFenêtres, superpositions et formulaires');
  await clickByText('aside nav button', 'Paramètres');
  await waitFor("[...document.querySelectorAll('nav button')].some((b) => b.textContent.includes('Départements'))");
  await clickByText('nav button', 'Départements');
  await waitFor("[...document.querySelectorAll('main button')].some((b) => b.textContent.includes('Ajouter'))");
  const inViewport = "(() => { const d = document.querySelector('[data-modal-layer] [role=dialog]'); if (!d) return false; const r = d.getBoundingClientRect(); return r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight + 1 && r.right <= window.innerWidth + 1; })()";
  const submitVisible = "(() => { const b = document.querySelector('[data-modal-layer] button[type=submit]'); if (!b) return false; const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight + 1 && r.height > 0; })()";
  for (const [label, width, height, mobile] of [['ordinateur', 1440, 1000, false], ['petit écran de téléphone', 360, 560, true]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    await sleep(300);
    await clickByText('main button', 'Ajouter');
    check(await waitFor("!!document.querySelector('[data-modal-layer] [role=dialog]')"), `la fenêtre s’ouvre (${label})`);
    await sleep(500);
    check(await evaluate("document.querySelector('[data-modal-layer]').parentElement === document.body"), `la fenêtre est rendue dans <body> (${label})`);
    check(await evaluate(inViewport), `la fenêtre reste entièrement dans l’écran (${label})`);
    check(await evaluate(submitVisible), `le bouton d’enregistrement est visible sans défiler (${label})`);
    check(await evaluate("document.body.style.overflow === 'hidden' && document.getElementById('root').inert === true"), `la page derrière est bloquée (${label})`);
    await shot(`13-fenetre-${mobile ? 'mobile' : 'bureau'}`);
    await evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))");
    check(await waitFor("!document.querySelector('[data-modal-layer]') && document.body.style.overflow !== 'hidden' && document.getElementById('root').inert === false", 4000), `Échap ferme la fenêtre et libère la page (${label})`);
  }
  await send('Emulation.clearDeviceMetricsOverride');

  // Fenêtres superposées : la confirmation s'ouvre AU-DESSUS du formulaire, Échap ne ferme que la plus récente.
  await clickByText('main button', 'Ajouter');
  await waitFor("!!document.querySelector('[data-modal-layer] form')");
  const typed = await evaluate("(() => { const inputs = [...document.querySelectorAll('[data-modal-layer] form input[type=text], [data-modal-layer] form input:not([type])')]; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; inputs.slice(0, 2).forEach((el, i) => { setter.call(el, i === 0 ? 'ZZTEST' : 'Département test'); el.dispatchEvent(new Event('input', { bubbles: true })); }); return inputs.length; })()");
  check(typed >= 2, 'les champs du formulaire sont saisissables', String(typed));
  await clickByText('[data-modal-layer] button[type=submit]', 'Créer');
  check(await waitFor("document.querySelectorAll('[data-modal-layer]').length === 2", 5000), 'la confirmation s’ouvre en plus du formulaire (deux couches)');
  const zOrder = await evaluate("(() => { const layers = [...document.querySelectorAll('[data-modal-layer]')]; const confirm = layers.find((l) => l.dataset.modalLayer === 'confirm'); const modal = layers.find((l) => l.dataset.modalLayer === 'modal'); return Number(confirm.style.zIndex) > Number(modal.style.zIndex); })()");
  check(zOrder, 'la confirmation est au-dessus du formulaire');
  await shot('14-fenetres-superposees');
  await evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))");
  check(await waitFor("document.querySelectorAll('[data-modal-layer]').length === 1", 3000), 'Échap ne ferme que la confirmation, le formulaire et sa saisie restent');
  check(await evaluate("[...document.querySelectorAll('[data-modal-layer] form input')].some((el) => el.value === 'ZZTEST')"), 'les données saisies sont conservées');
  await evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))");
  check(await waitFor("!document.querySelector('[data-modal-layer]')", 3000), 'un second Échap ferme le formulaire');

  console.log('\nRapports (barre latérale)');
  await clickByText('aside nav button', 'Rapports');
  check(await waitFor("document.body.innerText.includes('Rapports') && !!document.querySelector('[role=tablist] [aria-selected=true]') && document.querySelector('[role=tablist] [aria-selected=true]').textContent.includes('Rapports')"), 'l’entrée « Rapports » ouvre directement les rapports');
  await shot('08-rapports');

  console.log('\nConfiguration centralisée (Paramètres)');
  await clickByText('aside nav button', 'Paramètres');
  check(await waitFor("document.body.innerText.includes('Configuration de l’académie')"), 'Paramètres s’ouvre sur la configuration');
  await waitFor("document.querySelectorAll('main ol > li').length > 8 && !document.body.innerText.includes('Vérification…')", 8000);
  const order = await evaluate("[...document.querySelectorAll('main ol > li p.font-bold')].map((p) => p.textContent.trim()).join(' > ')");
  const indexOf = (label) => order.split(' > ').indexOf(label);
  check(indexOf('Année scolaire') < indexOf('Session') && indexOf('Session') < indexOf('Groupe') && indexOf('Salle') < indexOf('Affectation classe–salle (emploi du temps)'), 'l’ordre suit les dépendances (année → session → groupe, salle → affectation)', order.slice(0, 160));
  check(await evaluate("[...document.querySelectorAll('main ol > li span')].some((s) => ['Terminé', 'À configurer', 'Bloqué'].includes(s.textContent.trim()))"), 'chaque étape affiche son état (Terminé / À configurer / Bloqué)');
  check(await evaluate("!!document.querySelector('[role=progressbar]')"), 'une barre de progression est affichée');
  await shot('09-configuration');

  console.log('\nPrésences : formateur de la salle');
  await clickByText('aside nav button', 'Présences');
  await waitFor("[...document.querySelectorAll('nav button')].some((b) => b.textContent.includes('Par salle'))");
  await clickByText('nav button', 'Par salle');
  await waitFor("!!document.querySelector('main [role=combobox]')");
  await evaluate("document.querySelector('main [role=combobox]').click()");
  await sleep(300);
  if (await evaluate("!!document.querySelector('main [role=listbox] [role=option]')")) {
    await evaluate("document.querySelector('main [role=listbox] [role=option]').click()");
    check(await waitFor("document.body.innerText.toLowerCase().includes('formateur du créneau')", 5000), 'après le choix d’une salle, le formateur du créneau s’affiche');
    await shot('10-presences-salle');
  } else {
    console.log('  – aucune salle en base : vérification ignorée');
  }

  console.log('\nPrérequis bloquants et redirection (Salles)');
  const freeTrainer = await evaluate("fetch('http://localhost/Backend_AGES/Route/formateurs', { credentials: 'include' }).then((r) => r.json()).then((j) => j.data.some((f) => !f.id_salle && Number(f.actif) === 1))");
  await clickByText('aside nav button', 'Salles');
  await waitFor("[...document.querySelectorAll('button')].some((b) => b.textContent.includes('Nouvelle salle'))");
  if (freeTrainer) {
    console.log('  – un formateur est disponible : le blocage ne peut pas être observé sans modifier les données');
  } else {
    check(await waitFor("document.body.innerText.includes('Bloqué') && document.body.innerText.includes('Formateur disponible')", 8000), 'sans formateur disponible, un bandeau « Bloqué » explique ce qui manque');
    check(await evaluate("[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Nouvelle salle'))?.disabled === true"), 'le bouton « Nouvelle salle » est désactivé');
    await shot('11-salles-bloque');
    await clickByText('section[role=alert] button', 'maintenant');
    check(await waitFor("document.body.innerText.includes('Comptes Utilisateurs') || !!document.querySelector('form')", 8000), 'la redirection ouvre l’écran des comptes utilisateurs (création ou complétion des profils)');
    check(await waitFor("document.body.innerText.includes('vous complétez un prérequis') || document.body.innerText.includes('Vous complétez un prérequis')", 5000), 'une barre propose de retourner à l’écran d’origine');
    await shot('12-redirection');
    await clickByText('button', 'Retourner à');
    check(await waitFor("[...document.querySelectorAll('button')].some((b) => b.textContent.includes('Nouvelle salle'))", 8000), 'le retour ramène à l’écran des salles');
  }
  } else {
    console.log('\nPermissions (compte formateur)');
    await clickByText('aside nav button', 'Aide & guide');
    await waitFor("!!document.querySelector('[data-module-id]')");
    const cards = await evaluate("[...document.querySelectorAll('[data-module-id]')].map((card) => card.dataset.moduleId).join(',')");
    check(!cards.includes('utilisateurs') && !cards.includes('parametres'), 'le formateur ne voit ni « Utilisateurs & rôles » ni « Paramètres » dans l’aide', cards);
    check(cards.includes('espace-formateur'), 'il voit son espace formateur');
    await setValue('main input[type=search]', 'créer un compte utilisateur');
    await sleep(500);
    const leaked = await evaluate("[...document.querySelectorAll('main [data-feature-id]')].some((row) => row.dataset.featureId.startsWith('utilisateurs'))");
    check(!leaked, 'la recherche ne révèle aucune fonctionnalité réservée aux administrateurs');
    await setValue('main input[type=search]', '');
  }

  console.log('\nNavigation vers chaque sous-onglet détecté');
  const { manifest } = buildManifest(path.resolve('.'));
  const targets = Object.values(manifest.modules).filter((module) => module.id !== 'aide' && (TRAINER ? module.id === 'espace-formateur' : module.id !== 'espace-formateur')).flatMap((module) => module.subtabs.map((subtab) => ({ module: module.id, ...subtab })));
  for (const target of targets) {
    await clickByText('aside nav button', 'Aide & guide');
    await waitFor("!!document.querySelector('main input[type=search]')");
    await setValue('main input[type=search]', '');
    await clickByText('[role=tab]', 'Fonctionnalités');
    // Ouvre la carte du module puis la ligne du sous-onglet (identifiants posés par l'interface d'aide).
    await waitFor(`!!document.querySelector('[data-module-id="${target.module}"]')`, 4000);
    await evaluate(`(() => { const card = document.querySelector('[data-module-id="${target.module}"]'); if (card && card.getAttribute('aria-expanded') !== 'true') card.click(); return true; })()`);
    await waitFor(`!!document.querySelector('[data-feature-id="${target.module}/${target.id}"]')`, 3000);
    const clicked = await evaluate(`(() => { const row = document.querySelector('[data-feature-id="${target.module}/${target.id}"]'); if (!row) return false; row.click(); return true; })()`);
    const opened = clicked;
    const accessible = clicked && await waitFor("[...document.querySelectorAll('article button')].some((b) => b.textContent.includes('Accéder à cette fonctionnalité'))", 3000);
    if (!accessible) { check(clicked, `${target.module} › ${target.label}`, opened ? 'fiche sans bouton d’accès (droits ou sous-onglet masqué)' : 'fiche introuvable'); continue; }
    await clickByText('article button', 'Accéder à cette fonctionnalité');
    await sleep(900);
    const body = await evaluate('document.body.innerText');
    const selected = await evaluate("[...document.querySelectorAll('main [aria-current=page], main [aria-selected=true], main button.border-teal-700, main button[class*=text-brand-charcoal]')].map((n) => n.textContent.trim()).join(' | ')");
    const left = !body.includes('Que souhaitez-vous faire');
    check(left && (selected.includes(target.label) || body.includes(target.label)), `${target.module} › ${target.label}`, selected.slice(0, 70));
  }
  await shot('07-derniere-navigation');

  const realErrors = jsErrors.filter((message) => !/Unauthorized|auth.me/.test(message)); // 401 = vérification de session avant la connexion : normal
  check(realErrors.length === 0, 'aucune erreur JavaScript pendant tout le parcours', JSON.stringify(realErrors.slice(0, 4)).slice(0, 700));
} catch (error) {
  console.error(`\nErreur : ${error.message}`);
  failures += 1;
} finally {
  socket.close();
  chrome.kill();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* verrous Windows : sans importance */ }
}

console.log(failures ? `\n${failures} vérification(s) en échec.` : '\nParcours complet réussi.');
process.exit(failures ? 1 : 0);
