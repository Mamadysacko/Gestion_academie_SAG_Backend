/**
 * Test de bout en bout du calendrier et de la planification automatique (Chrome piloté via CDP).
 * Prérequis : XAMPP (Apache + MySQL) démarré et `npm run dev` actif sur le port 5173.
 *
 *   E2E_EMAIL=admin@gmail.com E2E_PASSWORD=... node tests/e2e-planification.mjs
 *
 * Lecture seule : la planification est simulée, jamais appliquée.
 * Vérifie aussi que l'API est appelée avec un jeton JWT (en-tête Authorization: Bearer).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const URL_APP = process.env.E2E_URL || 'http://localhost:5173/';
const EMAIL = process.env.E2E_EMAIL || 'admin@gmail.com';
const PASSWORD = process.env.E2E_PASSWORD || '111';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = process.env.E2E_SHOTS || '';

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ages-e2e-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9334', `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' });

let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? '  ✔' : '  ✘'} ${label}${detail ? `  → ${detail}` : ''}`);
  if (!ok) failures += 1;
};

async function connect() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const targets = await (await fetch('http://127.0.0.1:9334/json')).json();
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
const apiCalls = [];
socket.onmessage = (message) => {
  const data = JSON.parse(message.data);
  if (data.id && pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id); }
  if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') jsErrors.push(data.params.args.map((arg) => arg.value || arg.description).join(' '));
  if (data.method === 'Runtime.exceptionThrown') jsErrors.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
  if (data.method === 'Network.requestWillBeSent' && data.params.request.url.includes('/Backend_AGES/Route/')) {
    apiCalls.push({ url: data.params.request.url, auth: data.params.request.headers.Authorization || '' });
  }
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
const waitFor = async (expression, timeout = 10000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(expression)) return true;
    await sleep(150);
  }
  return false;
};
const setValue = (selector, value) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
const clickByText = (selector, text) => evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((node) => node.textContent.replace(/\\s+/g, ' ').trim().includes(${JSON.stringify(text)})); if (!el) return false; el.click(); return true; })()`);
const bodyHas = (text) => `document.body.innerText.toLocaleLowerCase().includes(${JSON.stringify(text.toLocaleLowerCase())})`;

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Page.navigate', { url: URL_APP });

  console.log('\nConnexion (JWT)');
  check(await waitFor("!!document.querySelector('#usernameOrEmail')"), 'page de connexion affichée');
  await setValue('#usernameOrEmail', EMAIL);
  await setValue('#password', PASSWORD);
  await clickByText('button[type=submit]', 'Se connecter');
  const logged = await waitFor("!!document.querySelector('aside nav button')");
  check(logged, 'connexion réussie');
  if (!logged) throw new Error('connexion impossible : arrêt du test');

  console.log('\nCalendrier');
  await clickByText('aside nav button', 'Emplois du temps');
  check(await waitFor(bodyHas('Séances programmées')), 'les indicateurs du calendrier s’affichent');
  await sleep(1200);
  check(await evaluate("!document.body.innerText.match(/Séances programmées\\s*—/i)"), 'les indicateurs sont calculés par l’API');
  check(await waitFor("[...document.querySelectorAll('[aria-label=Semaine] button[title]')].length > 0", 6000), 'la semaine affiche des séances');
  await shot('p01-semaine');
  await evaluate("document.querySelector('[aria-label=Semaine] button[title]')?.click()");
  check(await waitFor("!!document.querySelector('[role=dialog][aria-labelledby=seance-title]')"), 'le détail d’une séance s’ouvre (salles, formateurs)');
  await shot('p02-detail');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(300);

  for (const [view, marker] of [['Jour', 'Séances du jour'], ['Mois', 'séance(s)'], ['Occupation des salles', 'Jours occupés']]) {
    await clickByText('[role=tab]', view);
    check(await waitFor(bodyHas(marker)), `vue « ${view} »`);
    await shot(`p03-${view.slice(0, 4)}`);
  }
  check(await waitFor(bodyHas('Libre')), 'les salles libres sont signalées');

  console.log('\nPlanification automatique (simulation seulement)');
  await clickByText('nav button, [role=tablist] button, button', 'Planification auto');
  check(await waitFor(bodyHas('Générer l’emploi du temps d’une session')), 'l’onglet s’ouvre');
  await sleep(500);
  await clickByText('button', 'Simuler');
  check(await waitFor("/répartition\\(s\\) sans conflit|Aucune affectation complète/.test(document.body.innerText)", 15000), 'la simulation renvoie des propositions ou un diagnostic explicite');
  check(await evaluate(bodyHas('Passages par semaine')), 'les trois paramètres distincts sont affichés');
  await shot('p04-simulation');

  console.log('\nFormations & salles');
  await clickByText('button', 'Formations & salles');
  check(await waitFor(bodyHas('Salles par groupe')), 'la configuration de référence s’affiche');
  check(await waitFor(bodyHas('Versions de la configuration')), 'l’historique des versions est visible');
  await shot('p05-formations');

  console.log('\nSécurité');
  const bearer = apiCalls.filter((call) => !call.url.includes('/auth/') && call.auth.startsWith('Bearer '));
  check(bearer.length > 0, 'les appels API portent un jeton JWT', `${bearer.length}/${apiCalls.filter((call) => !call.url.includes('/auth/')).length}`);

  check(jsErrors.length === 0, 'aucune erreur JavaScript', jsErrors.slice(0, 3).join(' | '));
} catch (error) {
  failures += 1;
  console.error(error);
} finally {
  socket.close();
  chrome.kill();
}

console.log(failures ? `\n${failures} échec(s)` : '\nTous les contrôles sont passés.');
process.exit(failures ? 1 : 0);
