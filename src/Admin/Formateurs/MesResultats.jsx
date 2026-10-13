import { useState } from 'react';
import { useSessionResults } from '../EvaluationsNotes/useSessionResults';
import { AppreciationBadge, ResultBadge } from '../EvaluationsNotes/ResultatsComponents';
import { formatAverage } from '../EvaluationsNotes/resultatsHelpers';

/**
 * Résultats des auditeurs du formateur (ses salles et groupes uniquement) :
 * moyennes des évaluations, moyenne générale, appréciations 1 à 4 et statut de passage.
 */
export default function MesResultats({ schedules }) {
  const sessions = [...new Map(schedules.map((slot) => [String(slot.id_session), {
    id: slot.id_session, code: slot.session_code, libelle: slot.session_libelle,
  }])).values()];
  const [sessionId, setSessionId] = useState('');
  const effectiveSessionId = sessionId || String(sessions[0]?.id || '');
  const { results, loading, error } = useSessionResults(effectiveSessionId, { trainer: true });

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-lg font-bold text-slate-900">Résultats de mes classes</h2><p className="mt-1 text-sm text-slate-500">Moyennes et appréciations calculées automatiquement à partir des notes saisies.</p></div>
        <label className="grid gap-1 text-xs font-semibold text-slate-700">Session<select value={effectiveSessionId} onChange={(event) => setSessionId(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{sessions.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.libelle}</option>)}</select></label>
      </header>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {loading && !results && <p role="status" className="text-sm text-slate-500">Calcul des résultats…</p>}
      {results && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Auditeur</th><th className="px-3 py-3">Salle</th>{results.evaluations.map((e) => <th key={e.id} className="px-3 py-3">Évaluation {e.numero}</th>)}<th className="px-3 py-3">Moyenne générale</th><th className="px-3 py-3">Présence</th><th className="px-3 py-3">Résultat</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {results.auditeurs.map((row) => (
                <tr key={row.id_inscription}>
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{row.auditeur_nom} {row.auditeur_prenom}<span className="block font-mono font-normal text-slate-500">{row.auditeur_matricule}</span></td>
                  <td className="px-3 py-2.5 text-slate-600">{row.groupe_code} · {row.salle_code}</td>
                  {row.evaluations.map((e) => <td key={e.id_evaluation} className="px-3 py-2.5">{e.complete ? <><span className="font-semibold tabular-nums">{e.moyenne.toFixed(2)}</span> <AppreciationBadge compact appreciation={e.appreciation} /></> : <span className="text-amber-700">{e.notes_saisies}/{e.notes_attendues}</span>}</td>)}
                  <td className="px-3 py-2.5"><span className="font-bold tabular-nums text-teal-800">{formatAverage(row.moyenne_generale)}</span><div className="mt-1"><AppreciationBadge appreciation={row.appreciation_generale} /></div></td>
                  <td className="px-3 py-2.5 tabular-nums">{row.presences.taux === null ? '—' : `${row.presences.taux} %`}</td>
                  <td className="px-3 py-2.5"><ResultBadge resultat={row.resultat} motif={row.motif} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!results.auditeurs.length && <p className="p-8 text-center text-sm text-slate-500">Aucun auditeur dans vos classes pour cette session.</p>}
        </div>
      )}
    </section>
  );
}
