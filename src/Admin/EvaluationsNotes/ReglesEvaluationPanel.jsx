import { useEffect, useState } from 'react';
import { CalendarPlus, Save, SquarePen, Trash2 } from 'lucide-react';
import { evaluationsApi, resultatsApi } from '../../config/apiService';
import { useConfirm } from '../../composant/confirmContext';
import { NotesFilter } from './NotesComponents';
import { formatShortDate } from '../AuditeursInscriptions/affectationHelpers';
import { useToastNotice } from '../../composant/toastContext';
import ModalOverlay from '../../composant/ModalOverlay';

/**
 * Règles de passage, barème d'appréciation (1 à 4) et évaluations numérotées des sessions.
 */
export default function ReglesEvaluationPanel({ regles, bareme, sessions, evaluations, criteria, canUpdate, canCreate, canDelete, onChanged }) {
  const confirm = useConfirm();
  const [rules, setRules] = useState(regles);
  const [scale, setScale] = useState(bareme);
  const [sessionId, setSessionId] = useState('');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useToastNotice();

  useEffect(() => { Promise.resolve().then(() => { setRules(regles); setScale(bareme); }); }, [regles, bareme]);

  const effectiveSessionId = sessionId || String(sessions[0]?.id || '');
  const sessionEvaluations = evaluations.filter((item) => String(item.id_session) === effectiveSessionId).sort((a, b) => a.numero - b.numero);
  const run = async (action, message) => {
    setBusy(true);
    setError('');
    try {
      const response = await action();
      setNotice(response?.message || message);
      await onChanged?.();
    } catch (actionError) {
      setError(actionError.message || 'L’opération a échoué.');
    } finally {
      setBusy(false);
    }
  };

  const saveRules = async (event) => {
    event.preventDefault();
    if (!(await confirm({ title: 'Enregistrer les règles ?', message: 'Les moyennes, appréciations et résultats de toutes les sessions seront recalculés avec ces règles. Les décisions déjà validées ne changent pas.', tone: 'warning' }))) return;
    run(() => resultatsApi.updateRegles({
      regles: { ...rules, moyenne_admission: Number(rules.moyenne_admission), taux_presence_min: Number(rules.taux_presence_min), nb_evaluations: Number(rules.nb_evaluations) },
      bareme: scale.map((row) => ({ ...row, seuil_min: Number(row.seuil_min) })),
    }), 'Règles enregistrées.');
  };

  const generate = async () => {
    if (!(await confirm({ title: 'Créer les évaluations manquantes ?', message: `Les évaluations 1 à ${regles.nb_evaluations} manquantes seront créées et réparties sur la période de la session.`, tone: 'primary' }))) return;
    run(() => evaluationsApi.generer(effectiveSessionId), 'Évaluations créées.');
  };

  const saveEvaluation = async (event) => {
    event.preventDefault();
    if (!(await confirm({ title: 'Modifier l’évaluation ?', message: `Évaluation ${editing.numero} : « ${editing.libelle} » le ${formatShortDate(editing.date_evaluation)}.`, tone: 'warning' }))) return;
    await run(() => evaluationsApi.update(editing.id, { libelle: editing.libelle, date_evaluation: editing.date_evaluation }), 'Évaluation modifiée.');
    setEditing(null);
  };

  const removeEvaluation = async (evaluation) => {
    if (!(await confirm({ title: `Supprimer l’évaluation ${evaluation.numero} ?`, message: `« ${evaluation.libelle} » et toutes ses notes seront supprimées définitivement.`, tone: 'danger' }))) return;
    run(() => evaluationsApi.delete(evaluation.id), 'Évaluation supprimée.');
  };

  const input = 'mt-1 w-full border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100';

  return (
    <div className="space-y-4">
      {error && <div role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      {notice && <div role="status" className="border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      <div className="grid gap-4 xl:grid-cols-2">
        <form onSubmit={saveRules} className="space-y-4 border border-slate-200 bg-white p-4">
          <div><h3 className="text-sm font-bold text-slate-900">Règles de passage</h3><p className="mt-1 text-xs text-slate-500">Moyenne générale = moyenne des évaluations de la session (notes ramenées sur 4).</p></div>
          {rules && <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">Évaluations par session<input type="number" min="1" max="9" required disabled={!canUpdate} value={rules.nb_evaluations} onChange={(event) => setRules((current) => ({ ...current, nb_evaluations: event.target.value }))} className={input} /></label>
            <label className="text-xs font-semibold text-slate-700">Moyenne d’admission (/4)<input type="number" min="0" max="4" step="0.01" required disabled={!canUpdate} value={rules.moyenne_admission} onChange={(event) => setRules((current) => ({ ...current, moyenne_admission: event.target.value }))} className={input} /></label>
            <label className="text-xs font-semibold text-slate-700">Présence minimale (%)<input type="number" min="0" max="100" step="1" required disabled={!canUpdate} value={rules.taux_presence_min} onChange={(event) => setRules((current) => ({ ...current, taux_presence_min: event.target.value }))} className={input} /></label>
            <label className="flex items-center gap-2 self-end pb-2 text-xs font-semibold text-slate-700"><input type="checkbox" disabled={!canUpdate} checked={Boolean(rules.passage_automatique)} onChange={(event) => setRules((current) => ({ ...current, passage_automatique: event.target.checked }))} />Passage automatique à la clôture de la session</label>
          </div>}
          <div>
            <h4 className="text-xs font-bold uppercase text-slate-500">Barème d’appréciation</h4>
            <table className="mt-2 w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-slate-500"><tr><th className="py-1">Note</th><th className="py-1">Libellé</th><th className="py-1">À partir de (/4)</th></tr></thead>
              <tbody>{scale.map((row, index) => <tr key={row.note}>
                <td className="py-1 pr-2 font-bold tabular-nums">{row.note}/4</td>
                <td className="py-1 pr-2"><input required maxLength="50" disabled={!canUpdate} value={row.libelle} onChange={(event) => setScale((current) => current.map((item, i) => i === index ? { ...item, libelle: event.target.value } : item))} className="w-full border border-slate-300 px-2 py-1.5 disabled:bg-slate-100" /></td>
                <td className="py-1"><input type="number" min="0" max="4" step="0.01" required disabled={!canUpdate || row.note === 1} value={row.seuil_min} onChange={(event) => setScale((current) => current.map((item, i) => i === index ? { ...item, seuil_min: event.target.value } : item))} className="w-24 border border-slate-300 px-2 py-1.5 disabled:bg-slate-100" /></td>
              </tr>)}</tbody>
            </table>
          </div>
          {canUpdate && <div className="flex justify-end"><button type="submit" disabled={busy} className="inline-flex items-center gap-2 bg-emerald-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"><Save className="h-4 w-4" />Enregistrer les règles</button></div>}
        </form>

        <section className="space-y-3 border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><h3 className="text-sm font-bold text-slate-900">Évaluations de la session</h3><p className="mt-1 text-xs text-slate-500">{regles?.nb_evaluations || 3} évaluations numérotées par session.</p></div>
            <NotesFilter label="Session" value={effectiveSessionId} onChange={setSessionId} placeholder="Sélectionner" options={sessions.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.libelle}` }))} />
          </div>
          <ul className="divide-y divide-slate-100 border border-slate-100">
            {sessionEvaluations.map((evaluation) => {
              const count = criteria.filter((item) => Number(item.id_evaluation) === Number(evaluation.id)).length;
              return <li key={evaluation.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div><p className="text-sm font-semibold text-slate-800">Évaluation {evaluation.numero} · {evaluation.libelle}</p><p className="text-[11px] text-slate-500">{formatShortDate(evaluation.date_evaluation)} · {count ? `${count} critère(s)` : <span className="font-semibold text-amber-700">aucun critère associé</span>}</p></div>
                <div className="flex gap-1">
                  {canUpdate && <button type="button" onClick={() => setEditing({ ...evaluation })} aria-label={`Modifier l’évaluation ${evaluation.numero}`} className="p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-800"><SquarePen className="h-4 w-4" /></button>}
                  {canDelete && <button type="button" onClick={() => removeEvaluation(evaluation)} aria-label={`Supprimer l’évaluation ${evaluation.numero}`} className="p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>}
                </div>
              </li>;
            })}
            {!sessionEvaluations.length && <li className="px-3 py-6 text-center text-xs text-slate-500">Aucune évaluation pour cette session.</li>}
          </ul>
          {canCreate && effectiveSessionId && sessionEvaluations.length < (regles?.nb_evaluations || 3) && <button type="button" onClick={generate} disabled={busy} className="inline-flex items-center gap-2 border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 disabled:opacity-40"><CalendarPlus className="h-4 w-4" />Créer les évaluations manquantes ({sessionEvaluations.length}/{regles?.nb_evaluations || 3})</button>}
        </section>
      </div>

      {editing && <ModalOverlay onClose={() => { setEditing(null); }}>
        <form onSubmit={saveEvaluation} className="w-full max-w-md space-y-4 border border-slate-200 bg-white p-5 shadow-2xl">
          <h2 className="text-base font-bold text-slate-900">Évaluation {editing.numero}</h2>
          <label className="block text-xs font-semibold text-slate-700">Libellé<input required maxLength="100" value={editing.libelle} onChange={(event) => setEditing((current) => ({ ...current, libelle: event.target.value }))} className={input} /></label>
          <label className="block text-xs font-semibold text-slate-700">Date<input required type="date" value={editing.date_evaluation} onChange={(event) => setEditing((current) => ({ ...current, date_evaluation: event.target.value }))} className={input} /></label>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Annuler</button><button type="submit" disabled={busy} className="bg-emerald-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">Enregistrer</button></div>
        </form>
      </ModalOverlay>}
    </div>
  );
}
