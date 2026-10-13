import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarPlus, Save } from 'lucide-react';
import { NotesFilter, NotesMetric, NotesSearch } from './NotesComponents';
import { AppreciationBadge, ProgressBar } from './ResultatsComponents';
import { appreciationFor, averageOnFour, formatAverage } from './resultatsHelpers';
import { formatShortDate } from '../AuditeursInscriptions/affectationHelpers';

const hasValue = (value) => value !== null && value !== undefined && value !== '';

/**
 * Saisie des notes organisée par session → groupe → salle → évaluation (1, 2, 3…).
 * La moyenne /4 et l'appréciation 1 à 4 sont recalculées en direct avec les règles du serveur.
 */
export default function SaisieNotes({ data, sessions, regles, bareme, canWrite, canGenerate, onSave, onGenerate, saving }) {
  const [sessionId, setSessionId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [evaluationId, setEvaluationId] = useState('');
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState({});

  const session = sessions.find((item) => String(item.id) === sessionId) || null;
  const evaluations = useMemo(() => data.evaluations
    .filter((item) => session && Number(item.id_session) === Number(session.id))
    .sort((a, b) => a.numero - b.numero), [data.evaluations, session]);
  const evaluation = evaluations.find((item) => String(item.id) === evaluationId) || evaluations[0] || null;
  const criteria = useMemo(() => evaluation
    ? data.parametres_evaluations.filter((item) => Number(item.id_evaluation) === Number(evaluation.id))
    : [], [data.parametres_evaluations, evaluation]);

  const groups = data.groupes.filter((group) => session && Number(group.id_session) === Number(session.id));
  const rooms = data.salles.filter((room) => data.emplois_du_temps.some((slot) => (
    Number(slot.id_salle) === Number(room.id)
    && groups.some((group) => Number(group.id) === Number(slot.id_groupe))
    && (!groupId || String(slot.id_groupe) === groupId)
  )));

  const rows = useMemo(() => {
    if (!session) return [];
    const term = search.trim().toLocaleLowerCase('fr');
    return data.inscriptions
      .filter((item) => Number(item.id_session) === Number(session.id) && ['active', 'terminee'].includes(item.statut))
      .filter((item) => (!groupId || String(item.id_groupe) === groupId) && (!roomId || String(item.id_salle) === roomId))
      .map((enrollment) => ({ enrollment, attendee: data.auditeurs.find((item) => Number(item.id) === Number(enrollment.id_auditeur)) }))
      .filter((row) => row.attendee && (!term || `${row.attendee.prenom} ${row.attendee.nom} ${row.attendee.matricule}`.toLocaleLowerCase('fr').includes(term)))
      .sort((a, b) => `${a.enrollment.groupe_code} ${a.enrollment.salle_code} ${a.attendee.nom}`.localeCompare(`${b.enrollment.groupe_code} ${b.enrollment.salle_code} ${b.attendee.nom}`, 'fr'));
  }, [data.auditeurs, data.inscriptions, groupId, roomId, search, session]);

  const gradeOf = (enrollmentId, criterionId) => {
    const key = `${evaluation?.id}:${enrollmentId}:${criterionId}`;
    if (pending[key]) return pending[key];
    return data.notes.find((item) => Number(item.id_evaluation) === Number(evaluation?.id)
      && Number(item.id_inscription) === Number(enrollmentId) && Number(item.id_parametre) === Number(criterionId)) || {};
  };

  const computed = rows.map((row) => {
    let points = 0;
    let maximum = 0;
    let count = 0;
    criteria.forEach((criterion) => {
      const grade = gradeOf(row.enrollment.id, criterion.id);
      if (hasValue(grade.note) && Number.isFinite(Number(grade.note))) {
        points += Number(grade.note);
        maximum += Number(criterion.bareme);
        count += 1;
      }
    });
    const complete = criteria.length > 0 && count === criteria.length;
    const average = complete ? averageOnFour(points, maximum) : null;
    return { ...row, count, complete, average, appreciation: appreciationFor(average, bareme), partial: complete ? null : averageOnFour(points, maximum) };
  });

  const pendingList = Object.values(pending);
  const invalid = pendingList.some((grade) => hasValue(grade.note) && (!Number.isFinite(Number(grade.note)) || Number(grade.note) < 0 || Number(grade.note) > Number(grade.bareme)));
  const completeRows = computed.filter((row) => row.complete);
  const classAverage = completeRows.length ? Math.round((completeRows.reduce((sum, row) => sum + row.average, 0) / completeRows.length) * 100) / 100 : null;

  const change = (enrollmentId, criterion, field, value) => {
    const key = `${evaluation.id}:${enrollmentId}:${criterion.id}`;
    const current = gradeOf(enrollmentId, criterion.id);
    setPending((items) => ({
      ...items,
      [key]: {
        id_evaluation: Number(evaluation.id),
        id_inscription: Number(enrollmentId),
        id_parametre: Number(criterion.id),
        bareme: Number(criterion.bareme),
        note: field === 'note' ? value : (current.note ?? ''),
        observation: field === 'observation' ? value : (current.observation || ''),
      },
    }));
  };

  const save = async () => {
    const grades = pendingList.map((grade) => ({
      id_evaluation: grade.id_evaluation,
      id_inscription: grade.id_inscription,
      id_parametre: grade.id_parametre,
      note: hasValue(grade.note) ? Number(grade.note) : null,
      observation: grade.observation,
    }));
    if (await onSave(grades)) setPending({});
  };

  const selectSession = (value) => {
    setSessionId(value);
    setGroupId('');
    setRoomId('');
    setEvaluationId('');
    setPending({});
  };

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end gap-3 border border-slate-200 bg-white p-4">
        <NotesFilter label="Session" value={sessionId} onChange={selectSession} placeholder="Sélectionner une session" options={sessions.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.libelle}` }))} />
        <NotesFilter label="Groupe" value={groupId} onChange={(value) => { setGroupId(value); setRoomId(''); }} placeholder="Tous les groupes" options={groups.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.libelle}` }))} />
        <NotesFilter label="Salle" value={roomId} onChange={setRoomId} placeholder="Toutes les salles" options={rooms.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.libelle}` }))} />
        <NotesSearch value={search} onChange={setSearch} />
      </section>

      {!session ? (
        <div className="border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><Save className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">Choisissez une session pour afficher ses évaluations et ses auditeurs.</p></div>
      ) : (
        <>
          <nav aria-label="Évaluations de la session" className="flex flex-wrap items-stretch gap-2">
            {evaluations.map((item) => {
              const active = Number(item.id) === Number(evaluation?.id);
              return <button key={item.id} type="button" onClick={() => { setEvaluationId(String(item.id)); }} aria-pressed={active} className={`border px-4 py-2.5 text-left ${active ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-200' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <span className="block text-sm font-bold text-slate-900">Évaluation {item.numero}</span>
                <span className="block text-[11px] text-slate-500">{item.libelle} · {formatShortDate(item.date_evaluation)}</span>
              </button>;
            })}
            {evaluations.length < (regles?.nb_evaluations || 3) && (
              <div className="flex items-center gap-3 border border-dashed border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900">
                <span>{evaluations.length}/{regles?.nb_evaluations || 3} évaluations prévues pour cette session.</span>
                {canGenerate && <button type="button" disabled={saving} onClick={() => onGenerate(session.id)} className="inline-flex items-center gap-1.5 bg-amber-600 px-2.5 py-1.5 font-semibold text-white disabled:opacity-40"><CalendarPlus className="h-3.5 w-3.5" />Créer les évaluations manquantes</button>}
              </div>
            )}
          </nav>

          {evaluation && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <NotesMetric label="Auditeurs" value={rows.length} tone="slate" />
            <NotesMetric label="Résultats complets" value={`${completeRows.length} / ${rows.length}`} tone="blue" />
            <NotesMetric label={`Moyenne de l’évaluation ${evaluation.numero}`} value={formatAverage(classAverage)} detail={appreciationFor(classAverage, bareme)?.libelle} />
            <NotesMetric label="Modifications non enregistrées" value={pendingList.length} tone={pendingList.length ? 'amber' : 'emerald'} />
          </section>}

          {!evaluation ? null : !criteria.length ? (
            <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><p>Aucun critère n’est associé à l’évaluation {evaluation.numero}. Associez-lui des critères dans « Paramètres, évaluations & règles ».</p></div>
          ) : (
            <section className="border border-slate-200 bg-white">
              {!canWrite && <p className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">Consultation seule : votre rôle ne permet pas de saisir les notes.</p>}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Auditeur</th>
                      <th className="px-3 py-3">Groupe / salle</th>
                      {criteria.map((criterion) => <th key={criterion.id} className="min-w-32 px-2 py-3 text-center">{criterion.libelle}<span className="block text-emerald-700">/{Number(criterion.bareme)}</span></th>)}
                      <th className="px-3 py-3 text-center">Moyenne</th>
                      <th className="px-3 py-3">Appréciation</th>
                      <th className="px-3 py-3">Saisie</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {computed.map((row) => (
                      <tr key={row.enrollment.id} className="hover:bg-emerald-50/30">
                        <td className="px-4 py-2.5"><p className="font-semibold text-slate-800">{row.attendee.nom} {row.attendee.prenom}</p><p className="font-mono text-[10px] text-slate-500">{row.attendee.matricule}</p></td>
                        <td className="px-3 py-2.5 text-xs text-slate-600">{row.enrollment.groupe_code} · {row.enrollment.salle_code}</td>
                        {criteria.map((criterion) => {
                          const grade = gradeOf(row.enrollment.id, criterion.id);
                          const over = hasValue(grade.note) && (Number(grade.note) > Number(criterion.bareme) || Number(grade.note) < 0);
                          const isPending = Boolean(pending[`${evaluation.id}:${row.enrollment.id}:${criterion.id}`]);
                          return <td key={criterion.id} className="px-2 py-2.5 text-center">
                            <input type="number" min="0" max={criterion.bareme} step="0.25" inputMode="decimal" disabled={!canWrite || saving} value={grade.note ?? ''} onChange={(event) => change(row.enrollment.id, criterion, 'note', event.target.value)} aria-label={`${criterion.libelle} — ${row.attendee.prenom} ${row.attendee.nom}`} className={`w-20 border px-2 py-1.5 text-center text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 ${over ? 'border-rose-400 bg-rose-50' : isPending ? 'border-amber-400 bg-amber-50' : 'border-slate-300'}`} />
                          </td>;
                        })}
                        <td className="px-3 py-2.5 text-center font-bold tabular-nums text-emerald-800">{row.complete ? formatAverage(row.average) : <span className="text-xs font-normal text-slate-400">{row.partial === null ? '—' : `≈ ${row.partial.toFixed(2)}`}</span>}</td>
                        <td className="px-3 py-2.5"><AppreciationBadge appreciation={row.appreciation} /></td>
                        <td className="px-3 py-2.5"><ProgressBar done={row.count} total={criteria.length} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!computed.length && <p className="px-5 py-12 text-center text-sm text-slate-500">Aucun auditeur inscrit avec ces filtres.</p>}
              </div>
            </section>
          )}

          {canWrite && pendingList.length > 0 && (
            <div className="sticky bottom-3 z-10 flex flex-col gap-2 border border-amber-300 bg-white p-3 shadow-lg sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-700">{invalid ? <span className="font-semibold text-rose-700">Une note sort de son barème : corrigez-la avant l’enregistrement.</span> : `${pendingList.length} note(s) modifiée(s) non enregistrée(s).`}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPending({})} disabled={saving} className="border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Annuler les modifications</button>
                <button type="button" onClick={save} disabled={saving || invalid} className="inline-flex items-center gap-2 bg-emerald-800 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-40"><Save className="h-4 w-4" />{saving ? 'Enregistrement…' : 'Enregistrer les notes'}</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
