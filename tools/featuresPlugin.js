/**
 * Plugin Vite « ages-features » : analyse le code source du projet à chaque démarrage, à chaque
 * modification et à chaque build, et expose le résultat dans le module virtuel
 * `virtual:ages-features`. L'aide de l'application s'appuie sur ce relevé : elle ne dépend donc
 * d'aucune liste de fonctionnalités tenue à la main.
 *
 * Ce qui est détecté :
 *  - les modules (onglets principaux) et leurs fichiers d'entrée, d'après le routage d'AdminDashboard ;
 *  - les sous-onglets de chaque module (tableaux « tabs / sections / views » du code) ;
 *  - les actions disponibles (boutons « Nouvelle… », « Supprimer », « Exporter »…) par module et,
 *    quand le code permet de le déterminer, par sous-onglet ;
 *  - le schéma de la base (tables, clés étrangères obligatoires) d'après le dump SQL du backend ;
 *  - les messages d'erreur métier renvoyés par les contrôleurs PHP du backend.
 */
import fs from 'node:fs';
import path from 'node:path';

const VIRTUAL_ID = 'virtual:ages-features';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

const ACTION_VERBS = {
  create: ['nouvelle', 'nouveau', 'ajouter', 'créer', 'creer', 'inscrire', 'affecter', 'générer', 'generer', 'importer', 'pointer', 'marquer', 'saisir', 'transférer', 'transferer'],
  update: ['modifier', 'enregistrer', 'activer', 'désactiver', 'desactiver', 'changer', 'mettre'],
  delete: ['supprimer', 'retirer'],
  export: ['exporter', 'imprimer', 'télécharger', 'telecharger', 'excel', 'pdf'],
  validate: ['valider', 'clôturer', 'cloturer', 'décider', 'decider', 'confirmer'],
};
const VERB_TO_PERMISSION = Object.fromEntries(
  Object.entries(ACTION_VERBS).flatMap(([permission, verbs]) => verbs.map((verb) => [verb, permission])),
);

const read = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : '');
const normalizeKey = (value) => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '').replace(/s/g, '');

/** Résout un import relatif vers un fichier (avec ou sans extension, ou un dossier avec index). */
function resolveImport(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const candidate of [base, `${base}.jsx`, `${base}.js`, path.join(base, 'index.jsx'), path.join(base, 'index.js')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Suit les ré-exports (`export { default } from './X'`) jusqu'au fichier qui contient le code. */
function followReexport(file) {
  let current = file;
  for (let i = 0; i < 3; i += 1) {
    const match = read(current).match(/^export \{ default \} from '(\.[^']+)';?\s*$/m);
    if (!match) break;
    current = resolveImport(current, match[1]) || current;
  }
  return current;
}

function importsOf(file) {
  const map = new Map();
  const source = read(file);
  for (const match of source.matchAll(/import\s+(\w+)\s+from\s+'(\.[^']+)'/g)) map.set(match[1], resolveImport(file, match[2]));
  for (const match of source.matchAll(/import\s+\{([^}]+)\}\s+from\s+'(\.[^']+)'/g)) {
    const target = resolveImport(file, match[2]);
    match[1].split(',').map((item) => item.trim().split(/\s+as\s+/).pop()).filter(Boolean).forEach((name) => map.set(name, target));
  }
  return map;
}

function translations(root) {
  const source = read(path.join(root, 'src/i18n/LanguageProvider.jsx'));
  const fr = source.slice(source.indexOf('fr: {'), source.indexOf('en: {'));
  return Object.fromEntries([...fr.matchAll(/^\s*(\w+):\s*'((?:[^'\\]|\\.)*)'/gm)].map((m) => [m[1], m[2].replace(/\\'/g, '’')]));
}

/** Modules : routage d'AdminDashboard (`activeTab === 'x'` → composant → fichier). */
function detectModules(root) {
  const dashboard = path.join(root, 'src/Admin/AdminDashboard.jsx');
  const source = read(dashboard);
  const imports = importsOf(dashboard);
  const modules = {};
  for (const match of source.matchAll(/activeTab === '([\w-]+)'[\s\S]{0,260}?<([A-Z]\w+)/g)) {
    const [, id, component] = match;
    if (modules[id] || !imports.get(component)) continue;
    modules[id] = { id, component, entry: followReexport(imports.get(component)) };
  }
  return modules;
}

/** Sous-onglets : objets `{ id, label|labelKey }` des tableaux nommés tabs / sections / views. */
function detectSubtabs(entry, i18n) {
  const files = [entry, ...[...importsOf(entry).values()].filter((file) => file && path.dirname(file) === path.dirname(entry) && file !== entry)];
  const entrySource = read(entry);
  const subtabs = [];
  const seen = new Set();
  const itemPattern = /\{\s*id:\s*'([\w-]+)'\s*,\s*(?:(label):\s*(?:'((?:[^'\\]|\\.)*)'|"([^"]*)"|t\('(\w+)'\))|(labelKey):\s*'(\w+)')/g;
  for (const file of files) {
    const source = read(file);
    for (const match of source.matchAll(itemPattern)) {
      const owner = [...source.slice(0, match.index).matchAll(/(?:const|let)\s+(\w+)\s*=/g)].pop()?.[1] || '';
      // Le tableau doit servir dans le fichier d'entrée : sinon ce n'est pas la navigation du module.
      const usedByEntry = file === entry || new RegExp(`import\\s*\\{[^}]*\\b${owner}\\b[^}]*\\}`).test(entrySource);
      if (!/tab|view|section/i.test(owner) || seen.has(match[1]) || !usedByEntry) continue;
      const key = match[5] || match[7];
      const label = (match[3] || match[4] || (key && i18n[key]) || match[1]).replace(/\\'/g, '’');
      seen.add(match[1]);
      subtabs.push({ id: match[1], label, file });
    }
    // Variante « paires » : [['overview', "Vue d'ensemble"], ['reports', 'Rapports']]
    for (const match of source.matchAll(/\[\s*'(\w+)'\s*,\s*(?:"([^"]+)"|'([^']+)')\s*\]/g)) {
      const around = source.slice(Math.max(0, match.index - 80), match.index);
      if (!/role="tablist"|\[\s*\[$|\],\s*$|\[$/.test(around) || seen.has(match[1]) || !/setView\(|setActiveTab\(|setSection\(/.test(source)) continue;
      seen.add(match[1]);
      subtabs.push({ id: match[1], label: match[2] || match[3], file });
    }
  }
  return { subtabs, files };
}

/** Associe chaque sous-onglet au composant qu'il affiche (`id === 'x' && <Comp`, `case 'x': return <Comp`, `component: Comp`). */
function bindComponents(subtabs, files) {
  const imports = new Map();
  files.forEach((file) => importsOf(file).forEach((target, name) => { if (target && !imports.has(name)) imports.set(name, target); }));
  const sources = files.map(read).join('\n');
  subtabs.forEach((subtab) => {
    const id = subtab.id.replace(/[-]/g, '\\-');
    const patterns = [
      new RegExp(`(?:===\\s*|case\\s*)'${id}'[^<]{0,140}?<([A-Z]\\w+)`),
      new RegExp(`id:\\s*'${id}'[^}]*?component:\\s*(\\w+)`),
      new RegExp(`[{,\\s]${id}:\\s*([A-Z]\\w+)\\s*[,}]`),
    ];
    for (const pattern of patterns) {
      const global = new RegExp(pattern.source, 'g');
      const match = [...sources.matchAll(global)].find((candidate) => imports.get(candidate[1]));
      if (match) { subtab.componentFile = imports.get(match[1]); subtab.component = match[1]; break; }
    }
  });
}

/** Actions : libellés de boutons commençant par un verbe d'action, avec la permission correspondante. */
function detectActions(file) {
  const source = read(file);
  const found = new Map();
  const add = (label, index) => {
    const clean = label.replace(/\s+/g, ' ').replace(/[{}]/g, '').trim();
    const first = clean.split(/[\s/]/)[0].toLowerCase();
    const permission = VERB_TO_PERMISSION[first];
    if (!permission || clean.length < 4 || clean.length > 60 ) return;
    const lineStart = source.lastIndexOf('\n', index) + 1;
    const lineEnd = source.indexOf('\n', index);
    const line = source.slice(lineStart, lineEnd < 0 ? undefined : lineEnd);
    // Portée : la condition de sous-onglet la plus proche AVANT le bouton, sur la même ligne.
    const before = line.slice(0, index - lineStart);
    const scope = [...before.matchAll(/(?:activeTab|section|view)\s*===\s*'([\w-]+)'/g)].pop()?.[1] || null;
    const key = `${clean.toLowerCase()}|${scope}`;
    if (!found.has(key)) found.set(key, { label: clean, permission, scope });
  };
  for (const match of source.matchAll(/(?:\/>|>)\s*([A-ZÀ-Ý][^<>{}\n]{2,58}?)\s*<\/button>/g)) add(match[1], match.index);
  for (const match of source.matchAll(/<button[^>]*?(?:aria-label|title)="([^"{}]{3,50})"/g)) add(match[1], match.index);
  return [...found.values()];
}

/** Schéma : tables, colonnes obligatoires et clés étrangères d'après le dump SQL. */
function detectSchema(backend) {
  const source = read(path.join(backend, 'database/DB Gestion Academie.sql'));
  const tables = {};
  for (const block of source.matchAll(/CREATE TABLE `(\w+)` \(\n([\s\S]*?)\n\) ENGINE/g)) {
    const [, name, body] = block;
    const columns = {};
    for (const col of body.matchAll(/^\s+`(\w+)` .*$/gm)) {
      columns[col[1]] = { required: / NOT NULL/.test(col[0]) && !/DEFAULT|AUTO_INCREMENT|GENERATED/.test(col[0]) };
    }
    const foreignKeys = [...body.matchAll(/FOREIGN KEY \(`(\w+)`\) REFERENCES `(\w+)`/g)].map((m) => ({
      column: m[1], references: m[2], required: Boolean(columns[m[1]]?.required),
    }));
    tables[name] = { foreignKeys };
  }
  return tables;
}

/** Messages d'erreur métier des contrôleurs PHP, rattachés au module d'après le routage d'autorisation. */
function detectErrors(backend) {
  const authorization = read(path.join(backend, 'Controller/Authorization.php'));
  const resourceModules = [...authorization.matchAll(/'([\w-]+)' => '([\w-]+)',/g)].map((m) => ({ resource: m[1], module: m[2] }));
  const errors = [];
  const dir = path.join(backend, 'Controller');
  if (!fs.existsSync(dir)) return errors;
  for (const name of fs.readdirSync(dir).filter((file) => file.endsWith('Controller.php'))) {
    const base = normalizeKey(name.replace('Controller.php', ''));
    const target = resourceModules.find((item) => normalizeKey(item.resource) === base);
    if (!target) continue;
    const source = read(path.join(dir, name));
    const messages = new Map();
    for (const m of source.matchAll(/sendError\(\s*(4\d\d)\s*,\s*(?:"([^"\n]{12,220})"|'([^'\n]{12,220})')/g)) messages.set(m[2] || m[3], Number(m[1]));
    for (const m of source.matchAll(/new (?:\w*Exception)\(\s*(?:"([^"\n]{12,220})"|'([^'\n]{12,220})')\s*,\s*(4\d\d)\s*\)/g)) messages.set(m[1] || m[2], Number(m[3]));
    for (const [message, code] of messages) {
      if (/introuvable|non trouvée/i.test(message)) continue;
      errors.push({ module: target.module, resource: target.resource, code, message: message.replace(/\\'/g, '’').replace(/\{?\$[\w>[\]'"-]+\}?/g, '…') });
    }
  }
  // Un même message peut apparaître plusieurs fois (création / modification) : une seule fois par module.
  return errors.filter((error, index) => errors.findIndex((other) => other.module === error.module && other.message === error.message) === index);
}

/** Relevé complet du projet (utilisable aussi hors Vite, par les tests). */
export function buildManifest(root) {
  const watched = new Set();
  const backend = path.resolve(root, '../Backend_AGES');
  const i18n = translations(root);
  const modules = detectModules(root);
  const output = {};
  for (const module of Object.values(modules)) {
    const { subtabs, files } = detectSubtabs(module.entry, i18n);
    bindComponents(subtabs, files);
    const moduleActions = detectActions(module.entry);
    files.forEach((file) => watched.add(file));
    output[module.id] = {
      id: module.id,
      component: module.component,
      entry: path.relative(root, module.entry).split(path.sep).join('/'),
      subtabs: subtabs.map((subtab) => {
        const own = subtab.componentFile ? detectActions(subtab.componentFile) : [];
        if (subtab.componentFile) watched.add(subtab.componentFile);
        // Actions du fichier d'entrée explicitement limitées à ce sous-onglet (même ligne de code).
        const scoped = moduleActions.filter((action) => action.scope === subtab.id);
        const merged = [...own, ...scoped].filter((action, index, all) => all.findIndex((x) => x.label.toLowerCase() === action.label.toLowerCase()) === index);
        return {
          id: subtab.id,
          label: subtab.label,
          component: subtab.component || null,
          file: subtab.componentFile ? path.relative(root, subtab.componentFile).split(path.sep).join('/') : null,
          actions: merged.map(({ label, permission }) => ({ label, permission })),
        };
      }),
      actions: moduleActions.filter((action) => !action.scope).map(({ label, permission }) => ({ label, permission })),
    };
    watched.add(module.entry);
  }
  // Un module qui réutilise l'écran d'un autre (ex. « Rapports » = onglet de l'accueil) n'a pas de sous-onglets propres.
  const seenEntries = new Map();
  Object.values(output).forEach((module) => {
    if (seenEntries.has(module.entry)) { module.subtabs = []; module.actions = []; module.aliasOf = seenEntries.get(module.entry); } else seenEntries.set(module.entry, module.id);
  });
  const controllers = path.join(backend, 'Controller');
  [path.join(backend, 'database/DB Gestion Academie.sql'), path.join(root, 'src/Admin/AdminDashboard.jsx'), path.join(root, 'src/i18n/LanguageProvider.jsx')]
    .forEach((file) => fs.existsSync(file) && watched.add(file));
  if (fs.existsSync(controllers)) fs.readdirSync(controllers).forEach((name) => watched.add(path.join(controllers, name)));
  return { manifest: { modules: output, schema: detectSchema(backend), errors: detectErrors(backend) }, watched };
}

export default function featuresPlugin() {
  let root = process.cwd();
  let watched = new Set();

  return {
    name: 'ages-features',
    configResolved(config) { root = config.root; },
    resolveId(id) { return id === VIRTUAL_ID ? RESOLVED_ID : null; },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      const result = buildManifest(root);
      watched = result.watched;
      watched.forEach((file) => this.addWatchFile(file));
      return `export default ${JSON.stringify(result.manifest)};`;
    },
    handleHotUpdate({ file, server }) {
      if (watched.has(path.normalize(file))) {
        const module = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (module) server.moduleGraph.invalidateModule(module);
      }
    },
  };
}
