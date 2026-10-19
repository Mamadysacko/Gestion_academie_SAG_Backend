import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { NotesFilter, NotesMetric, NotesSearch } from './NotesComponents';
import { AppreciationBadge, ProgressBar, ResultBadge } from './ResultatsComponents';
import { appreciationFor, downloadCsv, formatAverage, RESULT_LABELS } from './resultatsHelpers';
import { useSessionResults } from './useSessionResults';
import { formatShortDate } from '../AuditeursInscriptions/affectationHelpers';
import { printPage } from '../../utils/print';

/** Rapport de situation des notes d'une session (calculé par le serveur, actualisé en direct). */
export default function RapportSituation({ sessions, data }) {
  const [sessionId, setSessionId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const effectiveSessionId = sessionId || String(sessions[0]?.id || '');
  const { results, loading, error } = useSessionResults(effectiveSessionId, { id_groupe: groupId, id_salle: roomId });

  const groups = data.groupes.filter((group) => String(group.id_session) === effectiveSessionId);
  const synthese = results?.synthese;
  const bareme = results?.bareme || [];
  const term = search.trim().toLocaleLowerCase('fr');
  const rows = (results?.auditeurs || []).filter((row) => (!status || row.resultat === status)
    && (!term || `${row.auditeur_nom} ${row.auditeur_prenom} ${row.auditeur_matricule}`.toLocaleLowerCase('fr').includes(term)));

  const exportCsv = () => downloadCsv(`situation-notes-${results.session.code}`,
    ['Matricule', 'Auditeur', 'Groupe', 'Salle', 'Formateur', ...results.evaluations.map((e) => `Évaluation ${e.numero}`), 'Moyenne générale', 'Appréciation', 'Présence %', 'Résultat', 'Motif', 'Décision validée'],
    rows.map((row) => [
      row.auditeur_matricule, `${row.auditeur_nom} ${row.auditeur_prenom}`, row.groupe_code, row.salle_code, `${row.formateur_prenom} ${row.formateur_nom}`,
      ...row.evaluations.map((e) => (e.moyenne === null ? `${e.notes_saisies}/${e.notes_attendues} notes` : e.moyenne.toFixed(2))),
      row.moyenne_generale ?? '', row.appreciation_generale ? `${row.appreciation_generale.note} · ${row.appreciation_generale.libelle}` : '',
      row.presences.taux ?? '', RESULT_LABELS[row.resultat], row.motif || '', row.passage ? row.passage.decision : '',
    ]));

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end gap-3 border border-slate-200 bg-white p-4 print:hidden">
        <NotesFilter label="Session" value={effectiveSessionId} onChange={(value) => { setSessionId(value); setGroupId(''); setRoomId(''); }} placeholder="Sélectionner" options={sessions.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.libelle}` }))} />
        <NotesFilter label="Groupe" value={groupId} onChange={setGroupId} placeholder="Tous les groupes" options={groups.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.libelle}` }))} />
        <NotesFilter label="Salle" value={roomId} onChange={setRoomId} placeholder="Toutes les salles" options={data.salles.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.libelle}` }))} />
        <NotesFilter label="Résultat" value={status} onChange={setStatus} placeholder="Tous" options={Object.entries(RESULT_LABELS).map(([value, label]) => ({ value, label }))} />
        <NotesSearch value={search} onChange={setSearch} />
        <div className="flex gap-2">
          <button type="button" onClick={exportCsv} disabled={!rows.length} className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 disabled:opacity-40"><Download className="h-4 w-4" />CSV</button>
          <button type="button" onClick={() => printPage('Situation des notes')} disabled={!results} className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 disabled:opacity-40"><Printer className="h-4 w-4" />Imprimer</button>
        </div>
      </section>

      {error && <div role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      {!effectiveSessionId && <p className="border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Aucune session pour cette année.</p>}
      {loading && !results && <p role="status" className="border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Calcul des résultats…</p>}

      {results && synthese && <>
        <header className="border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-bold uppercase text-emerald-800">Situation des notes</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">{results.session.code} · {results.session.libelle}</h2>
          <p className="mt-1 text-xs text-slate-500">{results.session.annee_libelle} · {results.session.niveau_libelle}{results.session.niveau_suivant ? ` → ${results.session.niveau_suivant.libelle}` : ' (niveau final)'} · admission à partir de {results.regles.moyenne_admission.toFixed(2)}/4{results.regles.taux_presence_min > 0 ? ` et ${results.regles.taux_presence_min} % de présence` : ''}</p>
          {results.evaluations_manquantes > 0 && <p className="mt-2 text-xs font-semibold text-amber-800">{results.evaluations_manquantes} évaluation(s) restent à planifier sur les {results.regles.nb_evaluations} prévues.</p>}
        </header>

        <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <NotesMetric label="Auditeurs" value={synthese.effectif} tone="slate" />
          <NotesMetric label="Notes saisies" value={`${synthese.notes_saisies} / ${synthese.notes_attendues}`} tone="blue" detail={`${synthese.notes_manquantes} manquante(s)`} />
          <NotesMetric label="Moyenne de la session" value={formatAverage(synthese.moyenne)} detail={appreciationFor(synthese.moyenne, bareme)?.libelle} />
          <NotesMetric label="Admis" value={synthese.admis} />
          <NotesMetric label="Non admis" value={synthese.non_admis} tone="rose" />
          <NotesMetric label="En attente" value={synthese.en_attente} tone="amber" detail={`${synthese.decisions_validees} décision(s) validée(s)`} />
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <SummaryTable title="Par évaluation" head={['Évaluation', 'Moyenne', 'Complets', 'Saisie']} rows={synthese.par_evaluation.map((item) => [
            <span key="l" className="font-semibold">Évaluation {item.numero}<span className="block text-[10px] font-normal text-slate-500">{item.libelle} · {formatShortDate(results.evaluations.find((e) => e.id === item.id_evaluation)?.date_evaluation)}</span></span>,
            <span key="m" className="tabular-nums">{formatAverage(item.moyenne)} <AppreciationBadge compact appreciation={appreciationFor(item.moyenne, bareme)} /></span>,
            `${item.complets} / ${synthese.effectif}`,
            <ProgressBar key="p" done={item.notes_saisies} total={item.notes_attendues} />,
          ])} />
          <SummaryTable title="Par groupe" head={['Groupe', 'Effectif', 'Moyenne', 'Admis / non admis / attente']} rows={synthese.par_groupe.map((item) => [`${item.code} · ${item.libelle}`, item.effectif, formatAverage(item.moyenne), `${item.admis} / ${item.non_admis} / ${item.en_attente}`])} />
          <SummaryTable title="Par salle" head={['Salle', 'Effectif', 'Moyenne', 'Admis / non admis / attente']} rows={synthese.par_salle.map((item) => [`${item.code} · ${item.libelle}`, item.effectif, formatAverage(item.moyenne), `${item.admis} / ${item.non_admis} / ${item.en_attente}`])} />
        </section>

        <section className="border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3"><h3 className="text-sm font-bold text-slate-900">Détail par auditeur <span className="font-normal text-slate-500">{rows.length}</span></h3></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Auditeur</th><th className="px-3 py-3">Groupe / salle</th>{results.evaluations.map((e) => <th key={e.id} className="px-3 py-3">Évaluation {e.numero}</th>)}<th className="px-3 py-3">Moyenne générale</th><th className="px-3 py-3">Présence</th><th className="px-3 py-3">Résultat</th><th className="px-3 py-3">Décision</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id_inscription} className="align-top">
                    <td className="px-4 py-2.5"><p className="font-semibold text-slate-800">{row.auditeur_nom} {row.auditeur_prenom}</p><p className="font-mono text-[10px] text-slate-500">{row.auditeur_matricule}</p></td>
                    <td className="px-3 py-2.5 text-xs text-slate-600">{row.groupe_code} · {row.salle_code}<span className="block text-[10px]">{row.formateur_prenom} {row.formateur_nom}</span></td>
                    {row.evaluations.map((e) => <td key={e.id_evaluation} className="px-3 py-2.5 text-xs">{e.complete ? <><span className="font-semibold tabular-nums">{e.moyenne.toFixed(2)}</span> <AppreciationBadge compact appreciation={e.appreciation} /></> : <span className="text-amber-700">{e.notes_saisies}/{e.notes_attendues} notes</span>}</td>)}
                    <td className="px-3 py-2.5"><span className="font-bold tabular-nums text-emerald-800">{formatAverage(row.moyenne_generale)}</span><div className="mt-1"><AppreciationBadge appreciation={row.appreciation_generale} /></div></td>
                    <td className="px-3 py-2.5 text-xs tabular-nums text-slate-600">{row.presences.taux === null ? '—' : `${row.presences.taux} %`}<span className="block text-[10px]">{row.presences.present}/{row.presences.total}</span></td>
                    <td className="px-3 py-2.5"><ResultBadge resultat={row.resultat} motif={row.motif} />{row.motif && <p className="mt-1 max-w-52 text-[10px] text-slate-500">{row.motif}</p>}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-600">{row.passage ? <>{row.passage.decision === 'admis' ? `Admis → ${row.passage.niveau_arrivee_libelle || 'fin de cursus'}` : row.passage.decision.replace('_', ' ')}<span className="block text-[10px] text-slate-400">{formatShortDate(row.passage.date_decision)} · {row.passage.mode_validation}</span></> : 'Non validée'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className="px-5 py-12 text-center text-sm text-slate-500">Aucun auditeur pour ces filtres.</p>}
          </div>
        </section>
      </>}
    </div>
  );
}

function SummaryTable({ title, head, rows }) {
  return (
    <div className="border border-slate-200 bg-white">
      <h3 className="border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-900">{title}</h3>
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr>{head.map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{rows.map((cells, index) => <tr key={index}>{cells.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2 text-slate-700">{cell}</td>)}</tr>)}</tbody>
      </table>
      {!rows.length && <p className="px-4 py-6 text-center text-xs text-slate-500">Aucune donnée.</p>}
    </div>
  );
}
