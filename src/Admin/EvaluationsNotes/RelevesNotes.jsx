import { useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import { NotesFilter, NotesMetric } from './NotesComponents';
import { useSessionResults } from './useSessionResults';
import ReleveDocument from './ReleveDocument';
import { printElements } from '../../utils/print';

/**
 * Relevés de notes organisés par niveau → session → groupe → évaluation,
 * avec impression individuelle ou groupée (une page par auditeur, export PDF via l'impression).
 */
export default function RelevesNotes({ sessions, data }) {
  const [levelId, setLevelId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [evaluationId, setEvaluationId] = useState('');
  const [personId, setPersonId] = useState('');
  const documents = useRef({});

  const levelSessions = sessions.filter((item) => !levelId || String(item.id_niveau) === levelId);
  const effectiveSessionId = sessionId || String(levelSessions[0]?.id || '');
  const { results, loading, error } = useSessionResults(effectiveSessionId, { id_groupe: groupId });
  const levels = data.niveaux.filter((level) => sessions.some((session) => Number(session.id_niveau) === Number(level.id)));
  const groups = data.groupes.filter((group) => String(group.id_session) === effectiveSessionId);
  const rows = (results?.auditeurs || []).filter((row) => !personId || String(row.id_auditeur) === personId);

  const printRows = (targetRows) => printElements(
    targetRows.map((row) => documents.current[row.id_inscription]),
    targetRows.length === 1 ? `Relevé ${targetRows[0].auditeur_matricule}` : `Relevés ${results.session.code}`,
  );

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end gap-3 border border-slate-200 bg-white p-4">
        <NotesFilter label="Niveau" value={levelId} onChange={(value) => { setLevelId(value); setSessionId(''); setGroupId(''); setPersonId(''); }} placeholder="Tous les niveaux" options={levels.map((item) => ({ value: String(item.id), label: item.libelle }))} />
        <NotesFilter label="Session" value={effectiveSessionId} onChange={(value) => { setSessionId(value); setGroupId(''); setEvaluationId(''); setPersonId(''); }} placeholder="Sélectionner" options={levelSessions.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.libelle}` }))} />
        <NotesFilter label="Groupe" value={groupId} onChange={(value) => { setGroupId(value); setPersonId(''); }} placeholder="Tous les groupes" options={groups.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.libelle}` }))} />
        <NotesFilter label="Évaluation détaillée" value={evaluationId} onChange={setEvaluationId} placeholder="Toutes les évaluations" options={(results?.evaluations || []).map((item) => ({ value: String(item.id), label: `Évaluation ${item.numero} · ${item.libelle}` }))} />
        <NotesFilter label="Auditeur" value={personId} onChange={setPersonId} placeholder="Tous les auditeurs" options={(results?.auditeurs || []).map((row) => ({ value: String(row.id_auditeur), label: `${row.auditeur_matricule} · ${row.auditeur_nom} ${row.auditeur_prenom}` }))} />
        <button type="button" onClick={() => printRows(rows)} disabled={!rows.length} className="inline-flex items-center gap-2 bg-emerald-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-40"><Printer className="h-4 w-4" />Imprimer les {rows.length} relevé(s)</button>
      </section>

      {error && <div role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      {loading && !results && <p role="status" className="border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Préparation des relevés…</p>}
      {!effectiveSessionId && <p className="border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Aucune session pour ce niveau.</p>}

      {results && <>
        <section className="grid gap-3 sm:grid-cols-4">
          <NotesMetric label="Relevés" value={rows.length} tone="slate" />
          <NotesMetric label="Résultats complets" value={rows.filter((row) => row.moyenne_generale !== null).length} />
          <NotesMetric label="Décisions validées" value={rows.filter((row) => row.passage).length} tone="blue" />
          <NotesMetric label="Niveau" value={results.session.niveau_libelle} tone="slate" detail={results.session.niveau_suivant ? `vers ${results.session.niveau_suivant.libelle}` : 'niveau final'} />
        </section>
        <div className="space-y-6 bg-slate-100 p-4">
          {rows.map((row) => (
            <div key={row.id_inscription} className="space-y-2">
              <div className="mx-auto flex max-w-[210mm] justify-end"><button type="button" onClick={() => printRows([row])} className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Printer className="h-3.5 w-3.5" />Imprimer ce relevé</button></div>
              <ReleveDocument
                ref={(node) => { documents.current[row.id_inscription] = node; }}
                session={results.session}
                evaluations={results.evaluations}
                resultat={row}
                notes={data.notes}
                focusEvaluationId={evaluationId}
              />
            </div>
          ))}
          {!rows.length && <p className="bg-white p-10 text-center text-sm text-slate-500">Aucun auditeur pour ces filtres.</p>}
        </div>
      </>}
    </div>
  );
}
