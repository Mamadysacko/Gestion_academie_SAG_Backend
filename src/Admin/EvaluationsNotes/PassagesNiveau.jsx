import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ClipboardList, GraduationCap, Lock, Repeat2, TrendingUp, Undo2, UserPlus, X } from 'lucide-react';
import { resultatsApi } from '../../config/apiService';
import { useConfirm } from '../../composant/confirmContext';
import { useAppNavigate } from '../../composant/navContext';
import { useToastNotice } from '../../composant/toastContext';
import { NotesFilter, NotesMetric, NotesSearch } from './NotesComponents';
import { AppreciationBadge } from './ResultatsComponents';
import { DECISION_LABELS, formatAverage } from './resultatsHelpers';
import { useSessionResults } from './useSessionResults';
import { formatShortDate } from '../AuditeursInscriptions/affectationHelpers';

const OPEN_SESSION = (session) => !['terminee', 'annulee'].includes(session.statut);

/** Décision enregistrée d'un auditeur, ou « en attente de décision ». */
function DecisionBadge({ passage }) {
  if (!passage) return <span className="inline-flex whitespace-nowrap border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">En attente de décision</span>;
  const tone = passage.decision === 'admis' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : passage.decision === 'redouble' ? 'border-amber-200 bg-amber-50 text-amber-800' : passage.decision === 'termine' ? 'border-sky-200 bg-sky-50 text-sky-800' : 'border-slate-300 bg-slate-100 text-slate-700';
  const text = passage.decision === 'admis' ? `Passe en ${passage.niveau_arrivee_libelle || 'classe supérieure'}` : passage.decision === 'redouble' ? `Redouble en ${passage.niveau_depart_libelle}` : DECISION_LABELS[passage.decision] || passage.decision;
  return <span className={`inline-flex whitespace-nowrap border px-2 py-0.5 text-[10px] font-bold ${tone}`}>{text}</span>;
}

/**
 * Passage de niveau — entièrement décidé par un utilisateur habilité (administrateur, ou rôle disposant du
 * droit « Passages de niveau »). Aucune décision n'est déduite des moyennes, qui restent indicatives
 * (chaque évaluation a sa moyenne et son appréciation, la moyenne générale aussi) : on sélectionne un ou
 * plusieurs auditeurs puis on clique « Passe en classe supérieure », « Redouble la classe » ou « Termine la formation ».
 * Après chaque décision, l'écran propose l'étape suivante (inscription dans une session du bon niveau).
 */
export default function PassagesNiveau({ sessions, allSessions = [], canApprove = false, canOpen = () => true }) {
  const confirm = useConfirm();
  const navigate = useAppNavigate();
  const [sessionId, setSessionId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [observation, setObservation] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [, setNotice] = useToastNotice();
  const [actionError, setActionError] = useState('');
  const effectiveSessionId = sessionId || String(sessions[0]?.id || '');
  const { results, loading, error, reload } = useSessionResults(effectiveSessionId);

  const rows = useMemo(() => results?.auditeurs || [], [results]);
  const groups = useMemo(() => [...new Map(rows.map((row) => [String(row.id_groupe), `${row.groupe_code} · ${row.groupe_libelle}`])).entries()].map(([value, label]) => ({ value, label })), [rows]);
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => (!groupId || String(row.id_groupe) === groupId)
      && (!needle || `${row.auditeur_nom} ${row.auditeur_prenom} ${row.auditeur_matricule}`.toLowerCase().includes(needle)));
  }, [groupId, rows, search]);
  const selectedRows = rows.filter((row) => selected.has(row.id_inscription));
  const allVisibleSelected = visible.length > 0 && visible.every((row) => selected.has(row.id_inscription));
  const next = results?.session.niveau_suivant || null;
  const levelName = results?.session.niveau_libelle || '';
  const count = (decision) => rows.filter((row) => row.passage?.decision === decision).length;

  const changeSession = (value) => { setSessionId(value); setGroupId(''); setSelected(new Set()); setOutcome(null); setActionError(''); };
  const toggle = (id) => setSelected((current) => { const copy = new Set(current); if (copy.has(id)) copy.delete(id); else copy.add(id); return copy; });
  const toggleVisible = () => setSelected((current) => {
    const copy = new Set(current);
    visible.forEach((row) => { if (allVisibleSelected) copy.delete(row.id_inscription); else copy.add(row.id_inscription); });
    return copy;
  });

  const run = async (action, success) => {
    setBusy(true);
    setActionError('');
    try {
      const response = await action();
      setNotice(response.message);
      setSelected(new Set());
      setObservation('');
      success?.(response);
      await reload({ silent: true });
    } catch (runError) {
      setActionError(runError.message || 'L’opération a échoué.');
    } finally {
      setBusy(false);
    }
  };

  const decide = async (decision) => {
    const target = next?.libelle || '—';
    const replaced = selectedRows.filter((row) => row.passage && row.passage.decision !== decision).length;
    const noAverage = selectedRows.filter((row) => row.moyenne_generale === null).length;
    const lines = [
      decision === 'admis'
        ? `${selectedRows.length} auditeur(s) passeront de ${levelName} à ${target}.`
        : decision === 'termine'
          ? `${selectedRows.length} auditeur(s) termineront la formation (niveau final : ${levelName}).`
          : `${selectedRows.length} auditeur(s) redoubleront la classe : ils restent en ${levelName}.`,
      replaced ? `${replaced} décision(s) déjà enregistrée(s) seront remplacées.` : '',
      noAverage ? `${noAverage} auditeur(s) n’ont pas encore de moyenne générale complète (information seulement : la décision vous appartient).` : '',
      'Le niveau actuel des auditeurs sera mis à jour et leurs notes seront verrouillées.',
    ].filter(Boolean);
    if (!(await confirm({
      title: decision === 'admis' ? 'Passer en classe supérieure ?' : decision === 'termine' ? 'Terminer la formation ?' : 'Faire redoubler la classe ?',
      message: lines.join('\n'),
      tone: 'warning',
      confirmLabel: decision === 'admis' ? 'Confirmer le passage' : decision === 'termine' ? 'Confirmer la fin de formation' : 'Confirmer le redoublement',
    }))) return;
    await run(
      () => resultatsApi.deciderPassages(results.session.id, { inscriptions: selectedRows.map((row) => row.id_inscription), decision, observation: observation.trim() || null }),
      (response) => setOutcome({ decision, count: response.data.enregistrees, arrivee: response.data.niveau_arrivee, depart: response.data.niveau_depart }),
    );
  };

  const cancel = async () => {
    const withDecision = selectedRows.filter((row) => row.passage);
    if (!withDecision.length) return;
    if (!(await confirm({
      title: 'Annuler ces décisions ?',
      message: `${withDecision.length} décision(s) seront supprimées : les auditeurs retrouvent leur niveau de départ et leurs notes redeviennent modifiables.`,
      tone: 'danger',
      confirmLabel: 'Annuler les décisions',
    }))) return;
    await run(() => resultatsApi.annulerPassages(results.session.id, { inscriptions: withDecision.map((row) => row.id_inscription) }), () => setOutcome(null));
  };

  // Étape suivante : inscrire dans une session du niveau d'arrivée (admis) ou du même niveau (redoublement).
  const goInscriptions = (note) => navigate('auditeurs', 'inscriptions', { returnTo: { moduleId: 'evaluations', tabId: 'passages', label: 'Passage de niveau', note } });
  const goSessions = (note) => navigate('parametres', 'sessions', { returnTo: { moduleId: 'evaluations', tabId: 'passages', label: 'Passage de niveau', note } });
  const targetLevelId = outcome && outcome.decision !== 'termine' ? (outcome.decision === 'admis' ? outcome.arrivee?.id : results?.session.id_niveau) : null;
  const targetLevelName = outcome ? (outcome.decision === 'admis' ? outcome.arrivee?.libelle : outcome.depart) : '';
  const targetSessions = targetLevelId ? allSessions.filter((session) => Number(session.id_niveau) === Number(targetLevelId) && OPEN_SESSION(session) && String(session.id) !== String(results?.session.id)) : [];

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end gap-3 border border-slate-200 bg-white p-4">
        <NotesFilter label="Session" value={effectiveSessionId} onChange={changeSession} placeholder="Sélectionner" options={sessions.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.libelle}` }))} />
        {results && <NotesFilter label="Groupe" value={groupId} onChange={setGroupId} options={groups} />}
        {results && <NotesSearch value={search} onChange={setSearch} />}
      </section>

      {(error || actionError) && <div role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error || actionError}</div>}
      {loading && !results && <p role="status" className="border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Chargement de la session…</p>}

      {outcome && (
        <section role="status" className="border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">
          <div className="flex items-start justify-between gap-3">
            <p className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-4 w-4 shrink-0" />
              {outcome.decision === 'admis'
                ? `${outcome.count} auditeur(s) passent ${outcome.arrivee ? `en ${outcome.arrivee.libelle}` : 'en classe supérieure'}.`
                : outcome.decision === 'termine'
                  ? `${outcome.count} auditeur(s) terminent la formation.`
                  : `${outcome.count} auditeur(s) redoublent en ${outcome.depart}.`}
            </p>
            <button type="button" onClick={() => setOutcome(null)} aria-label="Masquer" className="p-1 text-emerald-800 hover:bg-emerald-100"><X className="h-4 w-4" /></button>
          </div>
          {targetLevelId ? (
            <div className="mt-3 space-y-2">
              <p className="font-semibold">Étape suivante : {outcome.decision === 'admis' ? 'les inscrire' : 'les réinscrire'} dans une session de {targetLevelName}.</p>
              {targetSessions.length ? (
                <p className="text-xs">Sessions disponibles : {targetSessions.map((session) => `${session.code} · ${session.libelle}`).join(' ; ')}.</p>
              ) : (
                <p className="border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">Aucune session ouverte pour le niveau {targetLevelName} : créez-en une avant d’inscrire ces auditeurs.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {targetSessions.length > 0 && canOpen('auditeurs') && <button type="button" onClick={() => goInscriptions(`Inscrivez les auditeurs concernés dans une session de ${targetLevelName}, puis revenez au passage de niveau.`)} className="inline-flex items-center gap-2 bg-emerald-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-900"><UserPlus className="h-4 w-4" />Inscrire en {targetLevelName}</button>}
                {!targetSessions.length && canOpen('organisation-pedagogique') && <button type="button" onClick={() => goSessions(`Créez une session de ${targetLevelName}, puis revenez au passage de niveau.`)} className="inline-flex items-center gap-2 bg-brand-charcoal px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-gold"><ArrowRight className="h-4 w-4" />Créer une session de {targetLevelName}</button>}
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold">Formation terminée : aucune réinscription à prévoir.</p>
              {canOpen('rapports') && <button type="button" onClick={() => navigate('rapports')} className="inline-flex items-center gap-2 border border-emerald-700 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"><ClipboardList className="h-4 w-4" />Voir les rapports de passage</button>}
            </div>
          )}
        </section>
      )}

      {results && <>
        <section className="flex flex-wrap items-center gap-x-6 gap-y-2 border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          <span className="inline-flex items-center gap-2 font-semibold">{levelName}<ArrowRight className="h-4 w-4" />{next?.libelle || 'Fin de cursus'}</span>
          <span>Chaque évaluation a sa moyenne et son appréciation, la moyenne générale (des {results.regles.nb_evaluations} évaluations) aussi. Ces résultats sont <strong>indicatifs</strong> : le passage est décidé par l’approbateur, jamais calculé.</span>
        </section>
        {!canApprove && <div role="note" className="flex items-start gap-2 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><Lock className="mt-0.5 h-4 w-4 shrink-0" />L’approbation des passages est réservée à l’administrateur et aux utilisateurs à qui ce droit a été accordé (Utilisateurs & sécurité › Matrice des droits › « Passages de niveau »). Vous pouvez consulter les décisions.</div>}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <NotesMetric label="Auditeurs" value={results.synthese.effectif} tone="slate" />
          <NotesMetric label="Passent en classe supérieure" value={count('admis')} />
          <NotesMetric label="Redoublent" value={count('redouble')} tone="amber" />
          <NotesMetric label="Terminent la formation" value={count('termine')} tone="blue" />
          <NotesMetric label="En attente de décision" value={rows.filter((row) => !row.passage).length} tone="blue" />
        </section>

        {canApprove && (
          <section aria-label="Actions sur la sélection" className="sticky top-2 z-10 flex flex-col gap-3 border border-brand-gold bg-white p-3 shadow-md lg:flex-row lg:items-center">
            <p className="text-sm font-semibold text-slate-800">{selectedRows.length ? `${selectedRows.length} auditeur(s) sélectionné(s)` : 'Sélectionnez des auditeurs dans la liste'}</p>
            <input value={observation} onChange={(event) => setObservation(event.target.value)} maxLength={255} placeholder="Observation (facultative)" aria-label="Observation" disabled={busy || !selectedRows.length} className="min-w-0 flex-1 border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50" />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => decide('admis')} disabled={busy || !selectedRows.length || !next} title={next ? undefined : 'Il n’existe pas de niveau supérieur : utilisez « Termine la formation ».'} className="inline-flex items-center gap-2 bg-emerald-800 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-40"><TrendingUp className="h-4 w-4" />{next ? `Passe en classe supérieure (${next.libelle})` : 'Passe en classe supérieure'}</button>
              <button type="button" onClick={() => decide('redouble')} disabled={busy || !selectedRows.length} className="inline-flex items-center gap-2 bg-amber-600 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-40"><Repeat2 className="h-4 w-4" />Redouble la classe</button>
              <button type="button" onClick={() => decide('termine')} disabled={busy || !selectedRows.length} className="inline-flex items-center gap-2 bg-sky-700 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-40"><GraduationCap className="h-4 w-4" />Termine la formation</button>
              <button type="button" onClick={cancel} disabled={busy || !selectedRows.some((row) => row.passage)} className="inline-flex items-center gap-2 border border-slate-300 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Undo2 className="h-4 w-4" />Annuler la décision</button>
            </div>
          </section>
        )}

        <section className="border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr>
                {canApprove && <th className="w-10 px-4 py-3"><input type="checkbox" aria-label="Sélectionner tous les auditeurs affichés" checked={allVisibleSelected} onChange={toggleVisible} disabled={!visible.length} className="h-4 w-4" /></th>}
                <th className="px-4 py-3">Auditeur</th><th className="px-3 py-3">Groupe / salle</th><th className="px-3 py-3">Évaluations (moyenne · appréciation)</th><th className="px-3 py-3">Moyenne générale · appréciation</th><th className="px-3 py-3">Présence</th><th className="px-3 py-3">Décision</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((row) => (
                  <tr key={row.id_inscription} className={`align-top ${selected.has(row.id_inscription) ? 'bg-brand-gold-light/20' : ''}`}>
                    {canApprove && <td className="px-4 py-2.5"><input type="checkbox" aria-label={`Sélectionner ${row.auditeur_nom} ${row.auditeur_prenom}`} checked={selected.has(row.id_inscription)} onChange={() => toggle(row.id_inscription)} className="h-4 w-4" /></td>}
                    <td className="px-4 py-2.5"><p className="font-semibold text-slate-800">{row.auditeur_nom} {row.auditeur_prenom}</p><p className="font-mono text-[10px] text-slate-500">{row.auditeur_matricule}</p></td>
                    <td className="px-3 py-2.5 text-xs text-slate-600">{row.groupe_code} · {row.salle_code}</td>
                    <td className="px-3 py-2.5">
                      <ul className="space-y-1">{row.evaluations.map((evaluation) => (
                        <li key={evaluation.id_evaluation} className="flex items-center gap-2 text-xs tabular-nums text-slate-700"><span className="w-6 font-semibold text-slate-500">E{evaluation.numero}</span><span className="w-16">{evaluation.moyenne === null ? '—' : `${evaluation.moyenne.toFixed(2)} /4`}</span><AppreciationBadge appreciation={evaluation.appreciation} compact /></li>
                      ))}</ul>
                    </td>
                    <td className="px-3 py-2.5"><span className="font-bold tabular-nums text-slate-800">{formatAverage(row.moyenne_generale)}</span><div className="mt-1"><AppreciationBadge appreciation={row.appreciation_generale} /></div></td>
                    <td className="px-3 py-2.5 text-xs tabular-nums">{row.presences.taux === null ? '—' : `${row.presences.taux} %`}</td>
                    <td className="px-3 py-2.5"><DecisionBadge passage={row.passage} />{row.passage && <span className="mt-1 block text-[10px] text-slate-500">{formatShortDate(row.passage.date_decision)}{row.passage.observation ? ` · ${row.passage.observation}` : ''}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && <p className="px-5 py-12 text-center text-sm text-slate-500">{rows.length ? 'Aucun auditeur ne correspond à ce filtre.' : 'Aucun auditeur inscrit dans cette session.'}</p>}
          </div>
        </section>
      </>}
    </div>
  );
}
