// Outil ponctuel : prérequis bloquants sur les salles (formateur obligatoire), les séances et l'emploi du temps.
import fs from 'node:fs';

function edit(file, pairs, imports = []) {
  let source = fs.readFileSync(file, 'utf8');
  const crlf = source.includes('\r\n');
  if (crlf) source = source.split('\r\n').join('\n');
  for (const [from, to] of pairs) {
    if (!source.includes(from)) throw new Error(`${file} : motif introuvable : ${from.slice(0, 80)}`);
    source = source.replace(from, to);
  }
  if (imports.length) {
    const lines = source.split('\n');
    let last = -1;
    lines.forEach((line, index) => { if (/^import .* from /.test(line) || /^} from /.test(line)) last = index; });
    const missing = imports.filter((line) => !source.includes(line));
    lines.splice(last + 1, 0, ...missing);
    source = lines.join('\n');
  }
  fs.writeFileSync(file, crlf ? source.split('\n').join('\r\n') : source);
  console.log('ok', file);
}

const BANNER_IMPORTS = {
  salles: ["import PrerequisiteBanner from '../../aide/Prerequisites';", "import { usePrerequisites } from '../../aide/usePrerequisites';"],
};

// ── Salles : un formateur disponible est indispensable pour créer une salle ─────────────────────
edit('src/Admin/Salles/SallesModule.jsx', [
  ["  const prerequisites = usePrerequisites('salles/affectations', currentUser);\n", "  const prerequisites = usePrerequisites('salles/affectations', currentUser);\n  const roomPrerequisites = usePrerequisites('salles/salles', currentUser);\n"],
  ["onClick={() => { setError(''); setRoomDialog({ room: null }); }} className=\"inline-flex items-center gap-2 bg-teal-800 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-teal-900\"><Plus className=\"h-4 w-4\" /> Nouvelle salle",
   "onClick={() => { setError(''); setRoomDialog({ room: null }); }} disabled={roomPrerequisites.blocked} title={roomPrerequisites.blocked ? 'Créez d’abord un formateur disponible (voir le message ci-dessous)' : undefined} className=\"inline-flex items-center gap-2 bg-brand-charcoal px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-brand-gold disabled:cursor-not-allowed disabled:opacity-40\"><Plus className=\"h-4 w-4\" /> Nouvelle salle"],
  ["canCreate={hasAccess('salles', 'create')} canUpdate={hasAccess('salles', 'update')}", "canCreate={hasAccess('salles', 'create') && !roomPrerequisites.blocked} canUpdate={hasAccess('salles', 'update')}"],
  ["      <ListeSalles rooms={rooms}", "      <PrerequisiteBanner prerequisites={roomPrerequisites} action=\"de créer une salle\" />\n      <ListeSalles rooms={rooms}"],
], BANNER_IMPORTS.salles);

// ── Formulaire de salle : le formateur attitré est obligatoire à la création ────────────────────
edit('src/Admin/Salles/SallesComponents.jsx', [
  ["    if (mode === 'affect' && !form.id_formateur) return 'Une salle doit avoir un formateur attitré avant d’être affectée à un groupe : choisissez-en un.';",
   "    if (isNew && !form.id_formateur) return 'Une salle doit avoir un formateur attitré dès sa création (sans lui, elle ne peut pas être affectée à un groupe) : choisissez-en un.';"],
  ["<TagSelect label=\"Formateur attitré\" value=", "<TagSelect label=\"Formateur attitré\" required={isNew} value="],
]);

// ── Séances formateur ───────────────────────────────────────────────────────────────────────────
edit('src/Admin/Formateurs/FormateursModule.jsx', [
  ["  const canUsePlanning = [", "  const planningPrerequisites = usePrerequisites('formateurs/affectations', currentUser);\n  const canUsePlanning = ["],
  ["{!loading && activeTab === 'affectations' && canUsePlanning && <AffectationsFormateur", "{!loading && (activeTab === 'affectations' || activeTab === 'emploi') && canUsePlanning && <PrerequisiteBanner prerequisites={planningPrerequisites} action=\"de planifier une séance\" />}\n    {!loading && activeTab === 'affectations' && canUsePlanning && <AffectationsFormateur"],
], ["import PrerequisiteBanner from '../../aide/Prerequisites';", "import { usePrerequisites } from '../../aide/usePrerequisites';"]);
