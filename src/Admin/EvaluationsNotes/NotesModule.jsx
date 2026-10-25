import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Award, BookOpenCheck, ChartNoAxesCombined, ClipboardList, FileText,
  ListChecks, Plus, RefreshCw, Settings2, X,
} from 'lucide-react';
import {
  auditeursApi, departementsApi, evaluationsApi, notesApi, parametresEvaluationApi, resultatsApi,
} from '../../config/apiService';
import { loadPlanningData } from '../planningData';
import { resolveGrade } from './notesHelpers';
import { getCurrentSchoolYear } from '../../utils/schoolYear';
import { useConfirm } from '../../composant/confirmContext';
import { useLiveRefresh } from '../../composant/useLiveRefresh';
import SaisieNotes from './SaisieNotes';
import ListeNotes from './ListeNotes';
import TypesNotes from './TypesNotes';
import RapportSituation from './RapportSituation';
import PassagesNiveau from './PassagesNiveau';
import RelevesNotes from './RelevesNotes';
import StatistiquesNotes from './StatistiquesNotes';
import ReglesEvaluationPanel from './ReglesEvaluationPanel';
import { useToastNotice } from '../../composant/toastContext';
import SubTabNav from '../../composant/SubTabNav';
import ModalOverlay from '../../composant/ModalOverlay';

const sections = [
  { id: 'saisie', label: 'Saisie des notes', icon: BookOpenCheck },
  { id: 'liste', label: 'Liste des notes', icon: ListChecks },
  { id: 'rapport', label: 'Situation des notes', icon: ClipboardList },
  { id: 'passages', label: 'Passage de niveau', icon: Award },
  { id: 'releves', label: 'Relevés de notes', icon: FileText },
  { id: 'types', label: 'Évaluations, critères & règles', icon: Settings2 },
  { id: 'statistiques', label: 'Statistiques', icon: ChartNoAxesCombined },
];

const emptyData = {
  annees_scolaires: [], sessions: [], groupes: [], niveaux: [], types_formations: [],
  formateurs: [], salles: [], emplois_du_temps: [], inscriptions: [], auditeurs: [],
  departements: [], evaluations: [], parametres: [], parametres_evaluations: [],
  notes: [], regles: null, bareme: [],
};

const numericKeys = new Set([
  'id', 'id_note', 'id_evaluation', 'id_parametre', 'id_inscription', 'id_session',
  'id_annee', 'id_groupe', 'id_salle', 'id_formateur', 'id_departement', 'numero',
  'id_auditeur', 'id_emploi_du_temps', 'id_niveau', 'niveau_depart', 'niveau_arrivee',
  'ordre', 'statut', 'actif', 'bareme', 'note', 'moyenne', 'capacite',
]);

const normalizeRows = (items) => (Array.isArray(items) ? items : []).map((item) => {
  const row = { ...item };
  for (const key of numericKeys) {
    if (row[key] !== null && row[key] !== undefined && row[key] !== '') {
      const value = Number(row[key]);
      if (Number.isFinite(value)) row[key] = value;
    }
  }
  return row;
});

const rows = (response) => normalizeRows(response?.data);

function currentDateValue() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function fetchNotesData(currentUser) {
  const isAdmin = currentUser?.role_code === 'admin' || currentUser?.role === 'admin';
  const canRead = (module) => isAdmin || (currentUser?.permissions?.[module] || []).includes('read');
  if (!canRead('evaluations')) throw new Error('Votre rôle ne dispose pas du droit de consultation des évaluations.');
  const [planning, evaluationsResponse, parametersResponse, attendeesResponse, departmentsResponse, rulesResponse] = await Promise.all([
    loadPlanningData(currentUser),
    evaluationsApi.getAll(),
    parametresEvaluationApi.getAll(),
    canRead('auditeurs') ? auditeursApi.getAll() : Promise.resolve({ data: [] }),
    canRead('organisation-pedagogique') ? departementsApi.getAll() : Promise.resolve({ data: [] }),
    resultatsApi.getRegles(),
  ]);
  const evaluations = rows(evaluationsResponse);
  const linked = await Promise.all(evaluations.map(async (evaluation) => {
    const [criteriaResponse, notesResponse] = await Promise.all([
      parametresEvaluationApi.getByEvaluation(evaluation.id),
      notesApi.getByEvaluation(evaluation.id),
    ]);
    return {
      criteria: rows(criteriaResponse).map((criterion) => ({ ...criterion, id_evaluation: Number(evaluation.id) })),
      notes: rows(notesResponse),
    };
  }));

  return {
    ...emptyData,
    ...Object.fromEntries(Object.entries(planning).map(([key, value]) => [key, normalizeRows(value)])),
    auditeurs: rows(attendeesResponse),
    departements: rows(departmentsResponse),
    evaluations,
    parametres: rows(parametersResponse),
    parametres_evaluations: linked.flatMap((item) => item.criteria),
    notes: linked.flatMap((item) => item.notes),
    regles: rulesResponse.data?.regles || null,
    bareme: rulesResponse.data?.bareme || [],
  };
}

export default function NotesModule({ onBack, currentUser, initialTab }) {
  const confirm = useConfirm();
  const today = currentDateValue();
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState(initialTab || 'saisie');
  const [yearId, setYearId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useToastNotice();
  const [formOpen, setFormOpen] = useState(false);
  const [evaluationForm, setEvaluationForm] = useState({ id_session: '', numero: '', libelle: '', date_evaluation: today });

  const isAdmin = currentUser?.role_code === 'admin' || currentUser?.role === 'admin';
  const permissions = currentUser?.permissions?.evaluations || [];
  const can = (action) => isAdmin || permissions.includes(action);
  const canReadEvaluations = can('read');
  const canReadRosterData = isAdmin || (
    (currentUser?.permissions?.auditeurs || []).includes('read')
    && (currentUser?.permissions?.['organisation-pedagogique'] || []).includes('read')
    && (currentUser?.permissions?.['emplois-temps'] || []).includes('read')
  );
  // Approbation des passages : administrateur, ou rôle disposant du droit « Passages de niveau ».
  const canApprovePassages = isAdmin || (currentUser?.permissions?.['passages-niveau'] || []).includes('validate');
  const canOpenModule = (module) => isAdmin || (currentUser?.permissions?.[module] || []).includes('read');
  const canWriteGrades = can('update') && canReadRosterData;

  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!canReadEvaluations) return false;
    if (!silent) setLoading(true);
    try {
      const next = await fetchNotesData(currentUser);
      setData(next);
      setYearId((current) => current || String(getCurrentSchoolYear(next.annees_scolaires)?.id || ''));
      if (!silent) setError('');
      return true;
    } catch (loadError) {
      setError(loadError.message || 'Impossible de charger les évaluations, barèmes et notes depuis le serveur.');
      return false;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [canReadEvaluations, currentUser]);

  useEffect(() => { Promise.resolve().then(() => reload()); }, [reload]);
  useLiveRefresh(() => reload({ silent: true }), { enabled: canReadEvaluations, intervalMs: 60000 });

  const sessionsForYear = useMemo(() => data.sessions
    .filter((session) => !yearId || String(session.id_annee) === yearId)
    .sort((a, b) => String(b.date_debut).localeCompare(String(a.date_debut))), [data.sessions, yearId]);
  const allNoteRows = useMemo(() => data.notes
    .map((grade) => resolveGrade(data, grade))
    .filter((row) => row.criterion && row.evaluation && row.attendee), [data]);

  const withMutation = async (action, successMessage) => {
    setSaving(true);
    setError('');
    try {
      const response = await action();
      setNotice(response?.message || successMessage);
      await reload({ silent: true });
      return true;
    } catch (mutationError) {
      setError(mutationError.message || 'L’opération n’a pas pu aboutir.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveGrades = async (grades) => {
    if (!grades.length) return false;
    if (!(await confirm({ title: 'Enregistrer les notes ?', message: `${grades.length} note(s) seront enregistrées. Les moyennes, appréciations et résultats seront recalculés automatiquement.`, tone: 'primary' }))) return false;
    return withMutation(async () => {
      for (const grade of grades) await notesApi.saveOrUpdate(grade);
    }, `${grades.length} note(s) enregistrée(s).`);
  };

  const generateEvaluations = async (sessionId) => {
    if (!(await confirm({ title: 'Créer les évaluations manquantes ?', message: `Les évaluations 1 à ${data.regles?.nb_evaluations || 3} manquantes seront créées pour cette session.`, tone: 'primary' }))) return;
    withMutation(() => evaluationsApi.generer(sessionId), 'Évaluations créées.');
  };

  const handleCreateEvaluation = async (event) => {
    event.preventDefault();
    if (!evaluationForm.id_session || !evaluationForm.libelle.trim() || !evaluationForm.date_evaluation) return;
    if (!(await confirm({ title: 'Planifier cette évaluation ?', message: `${evaluationForm.numero ? `Évaluation ${evaluationForm.numero} · ` : ''}${evaluationForm.libelle.trim()} le ${evaluationForm.date_evaluation}.`, tone: 'primary' }))) return;
    const created = await withMutation(() => evaluationsApi.create({
      id_session: Number(evaluationForm.id_session),
      numero: evaluationForm.numero ? Number(evaluationForm.numero) : null,
      libelle: evaluationForm.libelle.trim(),
      date_evaluation: evaluationForm.date_evaluation,
    }), 'Évaluation créée. Associez-lui ses critères avant la saisie des notes.');
    if (created) {
      setEvaluationForm({ id_session: '', numero: '', libelle: '', date_evaluation: today });
      setFormOpen(false);
      setSection('types');
    }
  };

  const handleSaveParameter = async (record) => {
    if (!(await confirm({ title: record.id ? 'Modifier ce critère ?' : 'Créer ce critère ?', message: `${record.libelle} — barème /${record.bareme}.`, tone: record.id ? 'warning' : 'primary' }))) return false;
    return withMutation(async () => {
      const payload = { libelle: record.libelle.trim(), bareme: Number(record.bareme) };
      if (record.id) await parametresEvaluationApi.update(record.id, payload);
      else await parametresEvaluationApi.create(payload);
    }, record.id ? 'Critère mis à jour.' : 'Critère créé. Associez-le à une évaluation depuis la liste.');
  };

  const handleSaveGrade = async (grade) => {
    if (!(await confirm({ title: 'Modifier cette note ?', message: `${grade.attendee?.prenom} ${grade.attendee?.nom} — ${grade.criterion?.libelle} : ${grade.note ?? '—'}/${grade.criterion?.bareme}.`, tone: 'warning' }))) return false;
    return withMutation(() => notesApi.saveOrUpdate({
      id_evaluation: grade.id_evaluation,
      id_parametre: grade.id_parametre,
      id_inscription: grade.id_inscription,
      note: grade.note === '' || grade.note === null ? null : Number(grade.note),
      observation: grade.observation || '',
    }), 'Note enregistrée.');
  };

  const usedNumbers = data.evaluations.filter((item) => String(item.id_session) === evaluationForm.id_session).map((item) => item.numero);
  const freeNumbers = Array.from({ length: data.regles?.nb_evaluations || 3 }, (_, index) => index + 1).filter((value) => !usedNumbers.includes(value));

  return (
    <main className="space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {onBack && <button type="button" onClick={onBack} className="mb-3 text-xs font-semibold text-emerald-800 hover:text-emerald-950">← Tableau de bord</button>}
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Pilotage académique</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Évaluations, notes et passages</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">{data.regles?.nb_evaluations || 3} évaluations par session, moyennes et appréciations (1 à 4) calculées automatiquement, passage de niveau approuvé par l’administrateur ou un utilisateur habilité.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-slate-600">Année scolaire<select value={yearId} onChange={(event) => setYearId(event.target.value)} className="mt-1 block border border-slate-300 bg-white px-3 py-2 text-sm">{data.annees_scolaires.map((year) => <option key={year.id} value={year.id}>{year.libelle}</option>)}</select></label>
          {can('create') && <button type="button" onClick={() => setFormOpen(true)} className="inline-flex items-center justify-center gap-2 bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"><Plus className="h-4 w-4" />Planifier une évaluation</button>}
          <button type="button" onClick={() => reload()} disabled={loading || !canReadEvaluations} aria-label="Actualiser" className="border border-slate-300 bg-white p-2.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </header>

      {!canReadEvaluations && <div role="alert" className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Votre rôle ne dispose pas du droit de consultation des évaluations.</div>}
      {error && <div role="alert" className="flex items-start gap-3 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span className="flex-1">{error}</span><button type="button" onClick={() => setError('')} aria-label="Fermer le message"><X className="h-4 w-4" /></button></div>}
      {notice && <div role="status" className="flex items-start justify-between gap-3 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Fermer"><X className="h-4 w-4" /></button></div>}

      <SubTabNav label="Sections de gestion des notes" items={sections} active={section} onChange={setSection} />

      {loading && canReadEvaluations ? <div role="status" className="border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Chargement des données académiques…</div> : canReadEvaluations ? (
        <>
          {!canReadRosterData && ['saisie', 'liste', 'releves'].includes(section) && <div role="alert" className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Pour consulter les notes par auditeur, votre rôle doit aussi disposer des droits de lecture « Auditeurs & inscriptions », « Organisation pédagogique » et « Emplois du temps ».</div>}
          {section === 'saisie' && canReadRosterData && <SaisieNotes data={data} sessions={sessionsForYear} regles={data.regles} bareme={data.bareme} canWrite={canWriteGrades} canGenerate={can('create')} onSave={saveGrades} onGenerate={generateEvaluations} saving={saving} />}
          {section === 'liste' && canReadRosterData && <ListeNotes rows={allNoteRows} sessions={sessionsForYear} groups={data.groupes} rooms={data.salles} evaluations={data.evaluations} onSave={handleSaveGrade} onDelete={(grade) => withMutation(() => notesApi.delete(grade.id_note), 'Note supprimée.')} canUpdate={can('update')} canDelete={can('delete')} saving={saving} />}
          {section === 'rapport' && <RapportSituation sessions={sessionsForYear} data={data} />}
          {section === 'passages' && <PassagesNiveau sessions={sessionsForYear} allSessions={data.sessions} canApprove={canApprovePassages} canOpen={canOpenModule} />}
          {section === 'releves' && canReadRosterData && <RelevesNotes sessions={sessionsForYear} data={data} />}
          {section === 'types' && <div className="space-y-6">
            <ReglesEvaluationPanel regles={data.regles} bareme={data.bareme} sessions={sessionsForYear} evaluations={data.evaluations} criteria={data.parametres_evaluations} canUpdate={can('update')} canCreate={can('create')} canDelete={can('delete')} onChanged={() => reload({ silent: true })} />
            <TypesNotes
              evaluations={data.evaluations} parameters={data.parametres}
              criteria={data.parametres_evaluations} sessions={sessionsForYear}
              onSave={handleSaveParameter}
              onDelete={(parameter) => withMutation(() => parametresEvaluationApi.delete(parameter.id), 'Critère supprimé.')}
              onToggleParameter={(evaluationIdValue, parameterId, linked, ordre) => withMutation(
                () => linked
                  ? parametresEvaluationApi.detachFromEvaluation(evaluationIdValue, parameterId)
                  : parametresEvaluationApi.attachToEvaluation(evaluationIdValue, { id_parametre: parameterId, ordre }),
                linked ? 'Critère détaché de cette évaluation.' : 'Critère associé à cette évaluation.',
              )}
              canCreate={can('create')} canUpdate={can('update')} canDelete={can('delete')}
              busy={saving}
            />
          </div>}
          {section === 'statistiques' && <StatistiquesNotes data={data} years={data.annees_scolaires} sessions={data.sessions} evaluations={data.evaluations} groups={data.groupes} threshold={data.regles?.moyenne_admission ?? 2} />}
        </>
      ) : null}

      {formOpen && <ModalOverlay onClose={() => { setFormOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="evaluation-form-title" className="w-full max-w-lg border border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-200 p-5"><div><h2 id="evaluation-form-title" className="text-base font-bold text-slate-900">Planifier une évaluation</h2><p className="mt-1 text-xs text-slate-500">Chaque session compte {data.regles?.nb_evaluations || 3} évaluations numérotées.</p></div><button type="button" onClick={() => setFormOpen(false)} aria-label="Fermer" className="p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><form onSubmit={handleCreateEvaluation} className="space-y-4 p-5">
        <label className="block text-xs font-semibold text-slate-700">Session<select required value={evaluationForm.id_session} onChange={(event) => setEvaluationForm((current) => ({ ...current, id_session: event.target.value, numero: '' }))} className="mt-1 w-full border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">Sélectionner une session</option>{sessionsForYear.map((session) => <option key={session.id} value={session.id}>{session.code} · {session.libelle} ({session.statut})</option>)}</select></label>
        <label className="block text-xs font-semibold text-slate-700">Numéro<select required value={evaluationForm.numero} disabled={!evaluationForm.id_session} onChange={(event) => setEvaluationForm((current) => ({ ...current, numero: event.target.value, libelle: current.libelle || `Évaluation ${event.target.value}` }))} className="mt-1 w-full border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-100"><option value="">Sélectionner</option>{freeNumbers.map((value) => <option key={value} value={value}>Évaluation {value}</option>)}</select>{evaluationForm.id_session && !freeNumbers.length && <span className="mt-1 block font-normal text-amber-700">Cette session a déjà toutes ses évaluations.</span>}</label>
        <label className="block text-xs font-semibold text-slate-700">Libellé<input required maxLength="100" value={evaluationForm.libelle} onChange={(event) => setEvaluationForm((current) => ({ ...current, libelle: event.target.value }))} placeholder="Ex. Évaluation finale" className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm" /></label>
        <label className="block text-xs font-semibold text-slate-700">Date<input required type="date" value={evaluationForm.date_evaluation} onChange={(event) => setEvaluationForm((current) => ({ ...current, date_evaluation: event.target.value }))} className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm" /></label>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setFormOpen(false)} disabled={saving} className="border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700">Annuler</button><button type="submit" disabled={saving || !evaluationForm.id_session || !evaluationForm.numero || !evaluationForm.libelle.trim()} className="inline-flex items-center gap-2 bg-emerald-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{saving ? 'Création…' : 'Créer l’évaluation'}</button></div>
      </form></section></ModalOverlay>}
    </main>
  );
}
