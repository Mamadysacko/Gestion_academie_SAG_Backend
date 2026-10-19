import { useMemo, useState } from 'react';
import { Check, Link2, Link2Off, Plus, SquarePen, Trash2, X } from 'lucide-react';
import { NotesFilter, NotesSearch } from './NotesComponents';
import { useConfirm } from '../../composant/confirmContext';
import ModalOverlay from '../../composant/ModalOverlay';

const emptyForm = { id: null, libelle: '', bareme: '4.00' };

export default function TypesNotes({
  evaluations, parameters, criteria, sessions, onSave, onDelete, onToggleParameter,
  canCreate, canUpdate, canDelete, busy,
}) {
  const confirm = useConfirm();
  const [evaluationId, setEvaluationId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const visibleEvaluations = evaluations.filter((evaluation) => (
    (!sessionId || String(evaluation.id_session) === sessionId)
    && (!evaluationId || String(evaluation.id) === evaluationId)
  ));
  const selectedEvaluationId = evaluationId || String(visibleEvaluations[0]?.id || '');
  const selectedEvaluation = evaluations.find((evaluation) => String(evaluation.id) === selectedEvaluationId);
  const linked = criteria.filter((criterion) => Number(criterion.id_evaluation) === Number(selectedEvaluationId));
  const linkedIds = new Set(linked.map((criterion) => Number(criterion.id)));

  const visibleParameters = useMemo(() => parameters
    .filter((parameter) => `${parameter.libelle} ${selectedEvaluation?.libelle || ''}`.toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr')))
    .slice()
    .sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr')), [parameters, search, selectedEvaluation]);

  const openForm = (parameter = null) => {
    setForm(parameter
      ? { id: parameter.id, libelle: parameter.libelle, bareme: String(parameter.bareme) }
      : { ...emptyForm });
    setError('');
    setDialogOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    const bareme = Number(form.bareme);
    const libelle = form.libelle.trim();
    if (!libelle || libelle.length > 100) {
      setError('Le libellé doit contenir entre 1 et 100 caractères.');
      return;
    }
    if (!Number.isFinite(bareme) || bareme <= 0 || bareme > 999.99 || Math.round(bareme * 100) !== bareme * 100) {
      setError('Le barème doit être positif, au maximum 999,99, avec deux décimales au plus.');
      return;
    }
    const saved = await onSave({
      id: form.id,
      libelle,
      bareme,
    });
    if (saved) setDialogOpen(false);
  };

  const remove = async (parameter) => {
    if (await confirm(`Supprimer définitivement le paramètre partagé « ${parameter.libelle} » ? L’API refusera la suppression si des notes lui sont rattachées.`)) {
      await onDelete(parameter);
    }
  };

  const toggle = async (parameter) => {
    if (!selectedEvaluationId) return;
    const isLinked = linkedIds.has(Number(parameter.id));
    if (isLinked && await confirm('Détacher ce paramètre ? Les notes déjà saisies empêchent le détachement afin de préserver la cohérence des résultats.')) {
      await onToggleParameter(Number(selectedEvaluationId), Number(parameter.id), true, linked.length);
    } else if (!isLinked) {
      await onToggleParameter(Number(selectedEvaluationId), Number(parameter.id), false, linked.length + 1);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Configuration des évaluations</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">Paramètres partagés et barèmes</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">Un paramètre (libellé et barème) est global. Il peut être associé à plusieurs évaluations; modifier son barème met à jour son barème commun.</p>
      </header>

      <section className="grid gap-3 border border-slate-200 bg-white p-4 lg:grid-cols-[minmax(200px,1fr)_minmax(200px,1fr)_minmax(220px,1.2fr)_auto] lg:items-end">
        <NotesFilter label="Session" value={sessionId} onChange={(value) => { setSessionId(value); setEvaluationId(''); }} options={sessions.map((session) => ({ value: String(session.id), label: `${session.code} · ${session.libelle}` }))} placeholder="Toutes les sessions" />
        <NotesFilter label="Évaluation ciblée" value={selectedEvaluationId} onChange={setEvaluationId} options={visibleEvaluations.map((evaluation) => ({ value: String(evaluation.id), label: `Évaluation ${evaluation.numero} · ${evaluation.libelle}` }))} placeholder="Sélectionner une évaluation" />
        <NotesSearch value={search} onChange={setSearch} placeholder="Rechercher un paramètre global" />
        {canCreate && <button type="button" disabled={busy} onClick={() => openForm()} className="inline-flex items-center justify-center gap-2 bg-emerald-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"><Plus className="h-4 w-4" />Nouveau paramètre</button>}
      </section>

      {selectedEvaluation ? (
        <section className="border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="text-sm font-bold text-slate-900">{selectedEvaluation.libelle}</h3><p className="mt-1 text-xs text-slate-500">{sessions.find((session) => Number(session.id) === Number(selectedEvaluation.id_session))?.libelle} · {selectedEvaluation.date_evaluation} · {linked.length} paramètre(s) associé(s)</p></div>
            <span className="text-xs text-slate-600">Association propre à cette évaluation</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-white text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Paramètre global</th><th className="px-4 py-3">Barème partagé</th><th className="px-4 py-3">Évaluations liées</th><th className="px-4 py-3">État pour l’évaluation</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{visibleParameters.map((parameter) => {
                const attached = linkedIds.has(Number(parameter.id));
                return (
                  <tr key={parameter.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-800">{parameter.libelle}</td>
                    <td className="px-4 py-3 font-bold tabular-nums text-emerald-800">/{Number(parameter.bareme).toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{parameter.nombre_evaluations ?? '—'}</td>
                    <td className="px-4 py-3">{attached ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"><Check size={13} />Associé</span> : <span className="text-xs text-slate-500">Non associé</span>}</td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-1">
                      {canUpdate && <button type="button" disabled={busy} onClick={() => openForm(parameter)} aria-label="Modifier le paramètre partagé" title="Modifier le paramètre" className="p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-40"><SquarePen className="h-4 w-4" /></button>}
                                      {selectedEvaluationId && ((!attached && canUpdate) || (attached && canDelete)) && <button type="button" disabled={busy} onClick={() => toggle(parameter)} aria-label={attached ? 'Détacher le paramètre' : 'Associer le paramètre'} title={attached ? 'Détacher de cette évaluation' : 'Associer à cette évaluation'} className="p-2 text-slate-500 hover:bg-sky-50 hover:text-sky-800 disabled:opacity-40">{attached ? <Link2Off className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}</button>}
                      {canDelete && <button type="button" disabled={busy} onClick={() => remove(parameter)} aria-label="Supprimer le paramètre partagé" title="Supprimer" className="p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>}
                    </div></td>
                  </tr>
                );
              })}</tbody>
            </table>
            {!visibleParameters.length && <p className="px-5 py-12 text-center text-sm text-slate-500">Aucun paramètre partagé ne correspond à la recherche.</p>}
          </div>
        </section>
      ) : <div className="border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><p className="text-sm font-semibold text-slate-700">Sélectionnez une évaluation pour gérer ses paramètres.</p><p className="mt-1 text-xs text-slate-500">Les paramètres déjà créés restent globaux et réutilisables dans toutes les sessions.</p></div>}

      {dialogOpen && <ModalOverlay onClose={() => { if (!busy) setDialogOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="parameter-title" className="w-full max-w-lg border border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-200 p-5"><div><h2 id="parameter-title" className="text-base font-bold text-slate-900">{form.id ? 'Modifier un paramètre partagé' : 'Créer un paramètre partagé'}</h2><p className="mt-1 text-xs text-slate-500">Ce libellé et ce barème seront communs à chaque évaluation associée.</p></div><button type="button" disabled={busy} onClick={() => setDialogOpen(false)} aria-label="Fermer" className="p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"><X className="h-4 w-4" /></button></div><form onSubmit={submit} className="space-y-4 p-5">
        <label className="block text-xs font-semibold text-slate-700">Libellé<input required maxLength="100" value={form.libelle} onChange={(event) => setForm((current) => ({ ...current, libelle: event.target.value }))} placeholder="Ex. Compréhension orale" className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm" /></label>
        <label className="block text-xs font-semibold text-slate-700">Barème maximal<input required type="number" min="0.01" max="999.99" step="0.01" value={form.bareme} onChange={(event) => setForm((current) => ({ ...current, bareme: event.target.value }))} className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm" /></label>
        {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
        <p className="text-xs text-slate-500">Après création, associez ce paramètre à l’évaluation avec l’action de liaison dans la liste.</p>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={busy} onClick={() => setDialogOpen(false)} className="border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700">Annuler</button><button type="submit" disabled={busy || (!form.id && !canCreate) || (form.id && !canUpdate)} className="bg-emerald-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy ? 'Enregistrement…' : 'Enregistrer'}</button></div>
      </form></section></ModalOverlay>}
    </div>
  );
}
