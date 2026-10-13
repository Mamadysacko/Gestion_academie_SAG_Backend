import { forwardRef } from 'react';
import { DECISION_LABELS, RESULT_LABELS } from './resultatsHelpers';
import { formatShortDate } from '../AuditeursInscriptions/affectationHelpers';

const fmt = (value) => (value === null || value === undefined ? '—' : Number(value).toFixed(2));
const appreciationText = (item) => (item ? `${item.note}/4 · ${item.libelle}` : '—');

/**
 * Relevé de notes officiel d'un auditeur pour une session (format A4, prêt à imprimer / PDF).
 * `focusEvaluationId` : n'affiche le détail que de cette évaluation (la synthèse reste complète).
 */
const ReleveDocument = forwardRef(function ReleveDocument({ session, evaluations, resultat, notes = [], focusEvaluationId = '' }, ref) {
  const noteOf = (evaluationId, criterionId) => notes.find((note) => Number(note.id_inscription) === Number(resultat.id_inscription)
    && Number(note.id_evaluation) === Number(evaluationId) && Number(note.id_parametre) === Number(criterionId));
  const detailed = evaluations.filter((evaluation) => !focusEvaluationId || String(evaluation.id) === String(focusEvaluationId));
  const passage = resultat.passage;
  const decision = passage
    ? `${DECISION_LABELS[passage.decision]}${passage.decision === 'admis' ? ` — passage en ${passage.niveau_arrivee_libelle || 'fin de cursus'}` : ''} (validé le ${formatShortDate(passage.date_decision)})`
    : `${RESULT_LABELS[resultat.resultat]} — en attente de validation${resultat.motif ? ` : ${resultat.motif}` : ''}`;

  return (
    <article ref={ref} className="print-page mx-auto w-full max-w-[210mm] bg-white p-8 text-[12px] leading-5 text-slate-900 shadow-sm ring-1 ring-slate-200">
      <header className="flex items-start justify-between border-b-2 border-emerald-800 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800">Académie de Langues — AGES</p>
          <h1 className="mt-1 text-xl font-bold tracking-wide">RELEVÉ DE NOTES</h1>
          <p className="text-slate-600">{session.formation_libelle || 'Formation'} · Année {session.annee_libelle}</p>
        </div>
        <div className="text-right text-[11px] text-slate-600">
          <p className="font-semibold text-slate-800">Session {session.code}</p>
          <p>{session.libelle}</p>
          <p>{formatShortDate(session.date_debut)} – {formatShortDate(session.date_fin)}</p>
        </div>
      </header>

      <table className="mt-4 w-full border border-slate-300 text-[11px]">
        <tbody>
          <tr className="border-b border-slate-200"><Th>Nom et prénom</Th><Td strong>{resultat.auditeur_nom} {resultat.auditeur_prenom}</Td><Th>Matricule</Th><Td mono>{resultat.auditeur_matricule}</Td></tr>
          <tr className="border-b border-slate-200"><Th>Position</Th><Td>{resultat.auditeur_position || '—'}</Td><Th>Type d’employé</Th><Td>{resultat.type_employe_libelle || '—'}</Td></tr>
          <tr className="border-b border-slate-200"><Th>Département</Th><Td>{resultat.departement_libelle || '—'}</Td><Th>Niveau</Th><Td>{session.niveau_libelle}</Td></tr>
          <tr><Th>Groupe / salle</Th><Td>{resultat.groupe_code} · {resultat.groupe_libelle} — {resultat.salle_code}</Td><Th>Formateur</Th><Td>{resultat.formateur_prenom} {resultat.formateur_nom}</Td></tr>
        </tbody>
      </table>

      {detailed.map((evaluation) => {
        const index = evaluations.findIndex((item) => item.id === evaluation.id);
        const result = resultat.evaluations[index];
        return (
          <section key={evaluation.id} className="mt-4 break-inside-avoid">
            <h2 className="bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide">Évaluation {evaluation.numero} — {evaluation.libelle} <span className="font-normal normal-case text-slate-600">({formatShortDate(evaluation.date_evaluation)})</span></h2>
            <table className="w-full border-collapse text-[11px]">
              <thead><tr className="border-b border-slate-300 text-left text-[10px] uppercase text-slate-500"><th className="py-1 pr-2">Critère</th><th className="w-20 py-1 text-right">Note</th><th className="w-20 py-1 text-right">Barème</th><th className="py-1 pl-4">Observation</th></tr></thead>
              <tbody>
                {evaluation.criteres.map((criterion) => {
                  const note = noteOf(evaluation.id, criterion.id);
                  return <tr key={criterion.id} className="border-b border-slate-100"><td className="py-1 pr-2">{criterion.libelle}</td><td className="py-1 text-right font-semibold tabular-nums">{note?.note == null ? '—' : Number(note.note).toFixed(2)}</td><td className="py-1 text-right tabular-nums text-slate-500">/{Number(criterion.bareme).toFixed(2)}</td><td className="py-1 pl-4 text-slate-600">{note?.observation || ''}</td></tr>;
                })}
                {!evaluation.criteres.length && <tr><td colSpan="4" className="py-1 text-slate-500">Aucun critère défini.</td></tr>}
              </tbody>
              <tfoot><tr className="border-t border-slate-300 font-semibold"><td className="py-1">Moyenne de l’évaluation (/4)</td><td className="py-1 text-right tabular-nums">{result.complete ? fmt(result.moyenne) : 'Incomplète'}</td><td /><td className="py-1 pl-4">Appréciation : {appreciationText(result.appreciation)}</td></tr></tfoot>
            </table>
          </section>
        );
      })}

      <section className="mt-5 break-inside-avoid">
        <h2 className="bg-emerald-800 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white">Synthèse de la session</h2>
        <table className="w-full border border-slate-300 text-[11px]">
          <thead><tr className="bg-slate-50 text-[10px] uppercase text-slate-500">{evaluations.map((evaluation) => <th key={evaluation.id} className="border border-slate-200 px-2 py-1">Évaluation {evaluation.numero}</th>)}<th className="border border-slate-200 px-2 py-1">Moyenne générale</th><th className="border border-slate-200 px-2 py-1">Appréciation générale</th><th className="border border-slate-200 px-2 py-1">Assiduité</th></tr></thead>
          <tbody><tr className="text-center">
            {resultat.evaluations.map((result) => <td key={result.id_evaluation} className="border border-slate-200 px-2 py-1.5"><span className="font-semibold tabular-nums">{result.complete ? fmt(result.moyenne) : '—'}</span><span className="block text-[10px] text-slate-500">{appreciationText(result.appreciation)}</span></td>)}
            <td className="border border-slate-200 px-2 py-1.5 text-base font-bold tabular-nums text-emerald-800">{fmt(resultat.moyenne_generale)}<span className="text-[10px] font-normal text-slate-500"> /4</span></td>
            <td className="border border-slate-200 px-2 py-1.5 font-semibold">{appreciationText(resultat.appreciation_generale)}</td>
            <td className="border border-slate-200 px-2 py-1.5 tabular-nums">{resultat.presences.taux === null ? '—' : `${resultat.presences.taux} %`}<span className="block text-[10px] text-slate-500">{resultat.presences.present}/{resultat.presences.total} séances</span></td>
          </tr></tbody>
        </table>
        <p className="mt-2 border border-slate-300 px-2 py-1.5"><span className="font-bold">Décision : </span>{decision}</p>
      </section>

      <footer className="mt-8 grid grid-cols-2 gap-8 text-[11px] text-slate-600">
        <div><p>Le formateur</p><div className="mt-10 border-t border-slate-400" /></div>
        <div><p>La direction des études</p><div className="mt-10 border-t border-slate-400" /></div>
        <p className="col-span-2 text-[10px] text-slate-400">Édité le {new Date().toLocaleDateString('fr-FR')} — moyennes ramenées sur 4, appréciation de 1 (insuffisant) à 4 (très bien).</p>
      </footer>
    </article>
  );
});

function Th({ children }) {
  return <th className="w-32 bg-slate-50 px-2 py-1 text-left text-[10px] font-semibold uppercase text-slate-500">{children}</th>;
}

function Td({ children, strong = false, mono = false }) {
  return <td className={`px-2 py-1 ${strong ? 'font-bold' : ''} ${mono ? 'font-mono' : ''}`}>{children}</td>;
}

export default ReleveDocument;
