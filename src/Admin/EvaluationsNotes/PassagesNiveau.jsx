import { useState } from 'react';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import { resultatsApi } from '../../config/apiService';
import { useConfirm } from '../../composant/confirmContext';
import { NotesFilter, NotesMetric } from './NotesComponents';
import { AppreciationBadge, ResultBadge } from './ResultatsComponents';
import { DECISION_LABELS, formatAverage } from './resultatsHelpers';
import { useSessionResults } from './useSessionResults';
import { formatShortDate } from '../AuditeursInscriptions/affectationHelpers';
import { useToastNotice } from '../../composant/toastContext';

/**
 * Passage automatique de niveau : la moyenne générale des évaluations de la session et le taux
 * de présence sont comparés aux règles ; la validation enregistre les décisions et met à jour
 * le niveau actuel des auditeurs (historique conservé dans passages_niveaux).
 */
export default function PassagesNiveau({ sessions, canValidate }) {
  const confirm = useConfirm();
  const [sessionId, setSessionId] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useToastNotice();
  const [actionError, setActionError] = useState('');
  const effectiveSessionId = sessionId || String(sessions[0]?.id || '');
  const { results, loading, error } = useSessionResults(effectiveSessionId);

  const rows = results?.auditeurs || [];
  const decidable = rows.filter((row) => row.resultat !== 'en_attente');
  const changed = decidable.filter((row) => !row.passage || row.passage.decision !== row.resultat);

  const validate = async () => {
    const next = results.session.niveau_suivant;
    if (!(await confirm({
      title: 'Valider les passages de niveau ?',
      message: `${decidable.length} décision(s) seront enregistrées pour ${results.session.libelle} :\n• ${results.synthese.admis} admis → ${next ? next.libelle : 'fin de cursus'}\n• ${results.synthese.non_admis} non admis (restent en ${results.session.niveau_libelle})\n${results.synthese.en_attente} résultat(s) en attente ne seront pas traités.\nLe niveau actuel des auditeurs sera mis à jour.`,
      tone: 'warning',
      confirmLabel: 'Valider les passages',
    }))) return;
    setBusy(true);
    setActionError('');
    try {
      const response = await resultatsApi.validerPassages(results.session.id);
      setNotice(response.message);
    } catch (validateError) {
      setActionError(validateError.message || 'La validation des passages a échoué.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end justify-between gap-3 border border-slate-200 bg-white p-4">
        <NotesFilter label="Session" value={effectiveSessionId} onChange={setSessionId} placeholder="Sélectionner" options={sessions.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.libelle}` }))} />
        {canValidate && results && <button type="button" onClick={validate} disabled={busy || !decidable.length} className="inline-flex items-center gap-2 bg-emerald-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-40"><BadgeCheck className="h-4 w-4" />{busy ? 'Validation…' : `Valider les passages (${changed.length} à mettre à jour)`}</button>}
      </section>
      {(error || actionError) && <div role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error || actionError}</div>}
      {notice && <div role="status" className="border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      {loading && !results && <p role="status" className="border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Calcul des résultats…</p>}

      {results && <>
        <section className="flex flex-wrap items-center gap-x-6 gap-y-2 border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          <span className="inline-flex items-center gap-2 font-semibold">{results.session.niveau_libelle}<ArrowRight className="h-4 w-4" />{results.session.niveau_suivant?.libelle || 'Fin de cursus'}</span>
          <span>Moyenne générale = moyenne des {results.regles.nb_evaluations} évaluations</span>
          <span>Admission : moyenne ≥ <strong>{results.regles.moyenne_admission.toFixed(2)}/4</strong>{results.regles.taux_presence_min > 0 && <> et présence ≥ <strong>{results.regles.taux_presence_min} %</strong></>}</span>
          <span>{results.regles.passage_automatique ? 'Validation automatique à la clôture de la session' : 'Validation manuelle uniquement'}</span>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <NotesMetric label="Auditeurs" value={results.synthese.effectif} tone="slate" />
          <NotesMetric label="Admis" value={results.synthese.admis} />
          <NotesMetric label="Non admis" value={results.synthese.non_admis} tone="rose" />
          <NotesMetric label="En attente" value={results.synthese.en_attente} tone="amber" />
          <NotesMetric label="Décisions validées" value={results.synthese.decisions_validees} tone="blue" />
        </section>

        <section className="border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Auditeur</th><th className="px-3 py-3">Groupe / salle</th><th className="px-3 py-3">Moyennes des évaluations</th><th className="px-3 py-3">Moyenne générale</th><th className="px-3 py-3">Présence</th><th className="px-3 py-3">Résultat calculé</th><th className="px-3 py-3">Décision enregistrée</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id_inscription} className="align-top">
                    <td className="px-4 py-2.5"><p className="font-semibold text-slate-800">{row.auditeur_nom} {row.auditeur_prenom}</p><p className="font-mono text-[10px] text-slate-500">{row.auditeur_matricule}</p></td>
                    <td className="px-3 py-2.5 text-xs text-slate-600">{row.groupe_code} · {row.salle_code}</td>
                    <td className="px-3 py-2.5 text-xs tabular-nums text-slate-700">{row.evaluations.map((e) => <span key={e.id_evaluation} className="mr-2 inline-block">E{e.numero} : {e.moyenne === null ? '—' : e.moyenne.toFixed(2)}</span>)}</td>
                    <td className="px-3 py-2.5"><span className="font-bold tabular-nums text-emerald-800">{formatAverage(row.moyenne_generale)}</span><div className="mt-1"><AppreciationBadge appreciation={row.appreciation_generale} /></div></td>
                    <td className="px-3 py-2.5 text-xs tabular-nums">{row.presences.taux === null ? '—' : `${row.presences.taux} %`}</td>
                    <td className="px-3 py-2.5"><ResultBadge resultat={row.resultat} motif={row.motif} />{row.niveau_propose && <p className="mt-1 text-[10px] text-emerald-700">→ {row.niveau_propose.libelle}</p>}{row.motif && <p className="mt-1 max-w-48 text-[10px] text-slate-500">{row.motif}</p>}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-700">{row.passage ? <><strong>{DECISION_LABELS[row.passage.decision]}</strong>{row.passage.decision === 'admis' && <> → {row.passage.niveau_arrivee_libelle || 'fin de cursus'}</>}<span className="block text-[10px] text-slate-500">{formatShortDate(row.passage.date_decision)} · {row.passage.mode_validation}{row.passage.moyenne !== null ? ` · ${row.passage.moyenne.toFixed(2)}/4` : ''}</span>{row.passage.decision !== row.resultat && row.resultat !== 'en_attente' && <span className="mt-1 block text-[10px] font-semibold text-amber-700">Diffère du résultat actuel</span>}</> : <span className="text-slate-400">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className="px-5 py-12 text-center text-sm text-slate-500">Aucun auditeur inscrit dans cette session.</p>}
          </div>
        </section>
      </>}
    </div>
  );
}
