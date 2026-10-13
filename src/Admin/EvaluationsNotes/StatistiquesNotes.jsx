import { useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { getEvaluationRoster } from './notesHelpers';
import { NotesFilter, NotesMetric } from './NotesComponents';
import { getCurrentSchoolYear } from '../../utils/schoolYear';

export default function StatistiquesNotes({ data, years, sessions, evaluations, groups, threshold = 2 }) {
  const [yearId, setYearId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [month, setMonth] = useState('');
  const currentYear = getCurrentSchoolYear(years);
  const effectiveYearId = yearId && years.some((year) => String(year.id) === yearId)
    ? yearId
    : String(currentYear?.id || '');

  const filteredEvaluations = evaluations.filter((evaluation) => {
    const session = data.sessions.find((item) => item.id === evaluation.id_session);
    const dateMonth = evaluation.date_evaluation.slice(0, 7);
    return (!effectiveYearId || String(session?.id_annee) === effectiveYearId)
      && (!sessionId || String(session?.id) === sessionId)
      && (!month || dateMonth === month);
  });

  const results = useMemo(() => filteredEvaluations.flatMap((evaluation) => (
    getEvaluationRoster(data, evaluation.id).map((row) => ({ ...row, evaluation }))
  )).filter((row) => row.average4 !== null && row.average4 !== undefined), [data, filteredEvaluations]);

  const average = results.length
    ? results.reduce((sum, row) => sum + row.average4, 0) / results.length
    : 0;
  const successful = results.filter((row) => row.average4 >= threshold).length;
  const successRate = results.length ? Math.round((successful / results.length) * 100) : 0;

  const ranking = useMemo(() => {
    const totals = new Map();
    results.forEach((row) => {
      const current = totals.get(row.attendee.id) || { attendee: row.attendee, group: row.group, sum: 0, count: 0 };
      current.sum += row.average4;
      current.count += 1;
      totals.set(row.attendee.id, current);
    });
    return [...totals.values()]
      .map((row) => ({ ...row, average: row.sum / row.count }))
      .sort((a, b) => b.average - a.average || `${a.attendee.nom} ${a.attendee.prenom}`.localeCompare(`${b.attendee.nom} ${b.attendee.prenom}`, 'fr'));
  }, [results]);

  const groupStats = groups.map((group) => {
    const groupResults = results.filter((row) => row.group?.id === group.id);
    const passed = groupResults.filter((row) => row.average4 >= threshold).length;
    const groupAverage = groupResults.length ? groupResults.reduce((sum, row) => sum + row.average4, 0) / groupResults.length : 0;
    return { group, count: groupResults.length, passed, average: groupAverage, rate: groupResults.length ? Math.round((passed / groupResults.length) * 100) : 0 };
  }).filter((row) => row.count);

  const monthOptions = [...new Set(evaluations.map((evaluation) => evaluation.date_evaluation.slice(0, 7)))].sort().map((value) => ({ value, label: new Date(`${value}-15T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) }));

  return <div className="space-y-4">
    <section className="flex flex-wrap items-end gap-3 border border-slate-200 bg-white p-4"><NotesFilter label="Année scolaire" value={effectiveYearId} onChange={(value) => { setYearId(value); setSessionId(''); }} options={years.map((year) => ({ value: String(year.id), label: year.libelle }))} /><NotesFilter label="Session" value={sessionId} onChange={setSessionId} options={sessions.filter((session) => !effectiveYearId || String(session.id_annee) === effectiveYearId).map((session) => ({ value: String(session.id), label: `${session.code} · ${session.libelle}` }))} /><NotesFilter label="Mois" value={month} onChange={setMonth} options={monthOptions} /></section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><NotesMetric label="Moyenne générale /4" value={results.length ? `${average.toFixed(2)} /4` : '—'} /><NotesMetric label={`Taux de réussite ≥ ${threshold}/4`} value={`${successRate} %`} tone={successRate >= 50 ? 'emerald' : 'amber'} /><NotesMetric label="Résultats complets" value={results.length} tone="slate" /><NotesMetric label="Auditeurs classés" value={ranking.length} tone="blue" /></section>
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="border border-slate-200 bg-white"><div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3"><Trophy className="h-4 w-4 text-amber-600" /><div><h2 className="text-sm font-bold text-slate-900">Classement des auditeurs</h2><p className="mt-1 text-xs text-slate-500">Moyenne des évaluations complètes sélectionnées.</p></div></div><div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Rang</th><th className="px-4 py-3">Auditeur</th><th className="px-4 py-3">Groupe</th><th className="px-4 py-3 text-right">Moyenne</th></tr></thead><tbody className="divide-y divide-slate-100">{ranking.map((row, index) => <tr key={row.attendee.id}><td className="px-4 py-3 font-bold text-slate-500">{index + 1}</td><td className="px-4 py-3"><p className="font-semibold text-slate-800">{row.attendee.prenom} {row.attendee.nom}</p><p className="mt-1 font-mono text-[10px] text-slate-500">{row.attendee.matricule}</p></td><td className="px-4 py-3 text-xs text-slate-600">{row.group?.libelle || '—'}</td><td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-800">{row.average.toFixed(2)} /4</td></tr>)}</tbody></table>{!ranking.length && <p className="px-4 py-10 text-center text-sm text-slate-500">Aucun résultat complet sur cette période.</p>}</div></div>
      <div className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-bold text-slate-900">Résultats par groupe</h2><p className="mt-1 text-xs text-slate-500">Réussite calculée à partir du seuil d’admission ({threshold}/4).</p></div><div className="divide-y divide-slate-100">{groupStats.map((item) => <div key={item.group.id} className="space-y-2 px-4 py-3"><div className="flex justify-between gap-4 text-xs"><span className="font-semibold text-slate-800">{item.group.libelle}</span><span className="text-slate-500">Moy. {item.average.toFixed(2)} · {item.rate}% réussite</span></div><div className="h-2 bg-slate-100"><div className="h-full bg-emerald-700" style={{ width: `${item.rate}%` }} /></div><p className="text-[10px] text-slate-500">{item.passed}/{item.count} résultats complets au-dessus du seuil</p></div>)}{!groupStats.length && <p className="px-4 py-10 text-center text-sm text-slate-500">Aucun groupe à afficher.</p>}</div></div>
    </section>
    <section className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-bold text-slate-900">Évaluations incluses</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Évaluation</th><th className="px-4 py-3">Session</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Critères</th><th className="px-4 py-3">Résultats complets</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredEvaluations.map((evaluation) => { const session = data.sessions.find((item) => item.id === evaluation.id_session); const criterionCount = data.parametres_evaluations.filter((item) => item.id_evaluation === evaluation.id).length; const completedCount = getEvaluationRoster(data, evaluation.id).filter((row) => row.average4 !== null).length; return <tr key={evaluation.id}><td className="px-4 py-3 font-semibold text-slate-800">{evaluation.libelle}</td><td className="px-4 py-3 text-xs text-slate-600">{session?.code} · {session?.libelle}</td><td className="px-4 py-3 text-xs text-slate-600">{evaluation.date_evaluation}</td><td className="px-4 py-3 tabular-nums">{criterionCount}</td><td className="px-4 py-3 tabular-nums">{completedCount}</td></tr>; })}</tbody></table></div></section>
  </div>;
}