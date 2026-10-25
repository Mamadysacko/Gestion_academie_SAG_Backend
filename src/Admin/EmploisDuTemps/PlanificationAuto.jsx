import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, History, Loader2, Play, RefreshCw, Save, Sparkles, Wand2 } from 'lucide-react';
import TagSelect from '../../composant/TagSelect';
import { useConfirm } from '../../composant/confirmContext';
import { formationsApi, groupesApi, planificationApi } from '../../config/apiService';
import { JOURS, jourLabel, passageDays } from './emploisHelpers';

const ACTIVE = ['planifiee', 'ouverte', 'en_cours'];

/**
 * Planification automatique d'une session : la configuration de référence de sa formation
 * (passages par semaine, nombre de groupes, salles par groupe) est appliquée aux salles dédiées
 * disponibles. On simule d'abord (rien n'est écrit), on compare les propositions, puis on applique.
 */
export default function PlanificationAuto({ data, year, canCreate, canUpdate, onChanged, notify }) {
  const confirm = useConfirm();
  const sessions = useMemo(() => data.sessions
    .filter((item) => (!year || Number(item.id_annee) === Number(year.id)) && ACTIVE.includes(item.statut))
    .sort((a, b) => String(a.date_debut).localeCompare(String(b.date_debut))), [data.sessions, year]);
  const [sessionId, setSessionId] = useState('');
  const [mode, setMode] = useState('completer');
  const [createGroups, setCreateGroups] = useState(true);
  const [result, setResult] = useState(null);
  const [choice, setChoice] = useState(0);
  const [acceptPartial, setAcceptPartial] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [formations, setFormations] = useState([]);

  const session = sessions.find((item) => String(item.id) === sessionId);
  useEffect(() => { if (!sessionId && sessions[0]) setSessionId(String(sessions[0].id)); }, [sessionId, sessions]);
  useEffect(() => { formationsApi.getAll().then((response) => setFormations(response.data || [])).catch(() => {}); }, []);

  const loadHistory = useCallback(() => {
    if (!sessionId) return;
    planificationApi.generations(sessionId).then((response) => setHistory(response.data || [])).catch(() => setHistory([]));
  }, [sessionId]);
  useEffect(() => { setResult(null); setChoice(0); setError(''); loadHistory(); }, [loadHistory, sessionId]);

  const simulate = async () => {
    setBusy('simuler');
    setError('');
    try {
      const response = await planificationApi.simuler(sessionId, { mode, creer_groupes: createGroups });
      setResult(response.data);
      setChoice(0);
      setAcceptPartial(false);
    } catch (simError) {
      setError(simError.message);
    } finally {
      setBusy('');
    }
  };

  const apply = async () => {
    const proposal = result?.complete ? result.solutions[choice] : null;
    const created = (proposal?.affectations || result?.partielle || []).reduce((sum, item) => sum + item.a_creer, 0);
    if (!(await confirm({
      title: 'Appliquer ce planning ?',
      message: `${session?.code} · ${session?.libelle}\n${created} créneau(x) seront créés${result?.groupes_a_creer?.length ? `, ${result.groupes_a_creer.length} groupe(s) ajouté(s)` : ''}.\nLes créneaux qui ont un historique (inscriptions, présences) ne sont jamais déplacés.`,
      tone: 'primary',
    }))) return;
    setBusy('appliquer');
    setError('');
    try {
      const response = await planificationApi.appliquer(sessionId, { mode, creer_groupes: createGroups, solution: choice, accepter_partiel: acceptPartial });
      notify?.(response.message);
      setResult(null);
      loadHistory();
      await onChanged?.();
    } catch (applyError) {
      setError(applyError.message);
      if (applyError.body?.details) setResult((current) => ({ ...current, ...applyError.body.details }));
    } finally {
      setBusy('');
    }
  };

  const formation = formations.find((item) => Number(item.id) === Number(session?.id_type_formation));
  const outdated = formation && session?.config_version && Number(formation.config_version) > Number(session.config_version);
  const adopt = async () => {
    if (!(await confirm({ title: 'Adopter la nouvelle configuration ?', message: `La session ${session.code} appliquera la version ${formation.config_version} de la configuration « ${formation.libelle} ». Les autres sessions ne changent pas.`, tone: 'warning' }))) return;
    try {
      const response = await planificationApi.adopterConfiguration(session.id);
      notify?.(response.message);
      await onChanged?.();
    } catch (adoptError) {
      setError(adoptError.message);
    }
  };

  const proposal = result?.complete ? result.solutions[choice] : null;
  const assignments = proposal?.affectations || result?.partielle || [];

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Planification automatique</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">Générer l’emploi du temps d’une session</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">Le moteur combine trois paramètres distincts de la formation — <strong>passages par semaine</strong> (venues de chaque groupe), <strong>nombre de groupes</strong> et <strong>salles par groupe</strong> — avec les salles dédiées disponibles et les réservations des autres sessions de la même période. Rien n’est écrit tant que vous n’appliquez pas.</p>
      </header>

      <section className="grid gap-4 border border-slate-200 bg-white p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex flex-wrap items-end gap-3">
          <TagSelect label="Session" value={sessionId} onChange={setSessionId} clearable={false} options={sessions.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.libelle}`, hint: `${item.type_formation_libelle || ''} · ${item.date_debut} → ${item.date_fin}` }))} placeholder={sessions.length ? 'Choisir une session' : 'Aucune session active'} className="min-w-72" />
          <fieldset className="text-xs">
            <legend className="mb-1 font-semibold text-slate-700">Mode</legend>
            <div className="inline-flex border border-slate-300">
              {[['completer', 'Compléter', 'Garde tous les créneaux existants'], ['regenerer', 'Regénérer', 'Recalcule les groupes sans historique']].map(([id, label, hint]) => (
                <button key={id} type="button" title={hint} aria-pressed={mode === id} onClick={() => setMode(id)} className={`px-3 py-2 font-semibold ${mode === id ? 'bg-teal-800 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>{label}</button>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 pb-2 text-xs text-slate-700"><input type="checkbox" checked={createGroups} onChange={(event) => setCreateGroups(event.target.checked)} />Créer les groupes manquants</label>
        </div>
        <div className="flex items-end gap-2">
          <button type="button" onClick={simulate} disabled={!sessionId || Boolean(busy)} className="inline-flex items-center gap-2 border border-teal-800 bg-white px-4 py-2 text-sm font-semibold text-teal-900 hover:bg-teal-50 disabled:opacity-40">{busy === 'simuler' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Simuler</button>
          {canCreate && <button type="button" onClick={apply} disabled={!result || Boolean(busy) || (!result.complete && !(acceptPartial && result.partielle?.length))} className="inline-flex items-center gap-2 bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-40">{busy === 'appliquer' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Appliquer</button>}
        </div>
        {outdated && canUpdate && (
          <p className="flex flex-wrap items-center gap-2 border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 lg:col-span-2">
            <AlertTriangle className="h-4 w-4" />Cette session applique la version {session.config_version} de la configuration ; la formation est en version {formation.config_version}.
            <button type="button" onClick={adopt} className="border border-amber-400 bg-white px-2 py-1 font-semibold hover:bg-amber-100">Adopter la version {formation.config_version}</button>
          </p>
        )}
      </section>

      {error && <p role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      {result && (
        <section className="space-y-4">
          <div className={`flex items-start gap-3 border p-4 text-sm ${result.complete ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-rose-200 bg-rose-50 text-rose-950'}`}>
            {result.complete ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />}
            <div className="space-y-1">
              <p className="font-bold">{result.complete
                ? `${result.nb_solutions} répartition(s) sans conflit trouvée(s)${result.exploration_complete ? '' : ' (recherche limitée aux meilleures)'}.`
                : 'Aucune affectation complète n’est possible avec la configuration actuelle.'}</p>
              {result.diagnostic.bloquant.map((message, index) => <p key={index}>{message}</p>)}
              {result.diagnostic.avertissements.map((message, index) => <p key={`w${index}`} className="text-amber-900">⚠ {message}</p>)}
              {!result.complete && result.partielle?.length > 0 && canCreate && (
                <label className="mt-2 flex items-center gap-2 font-semibold"><input type="checkbox" checked={acceptPartial} onChange={(event) => setAcceptPartial(event.target.checked)} />Appliquer quand même la meilleure solution partielle ({result.partielle.length} groupe(s) placés sans conflit)</label>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Fact label="Passages par semaine" value={result.configuration.passages_semaine} hint="venues de chaque groupe" />
            <Fact label="Groupes" value={`${result.groupes_existants}${result.groupes_a_creer.length ? ` + ${result.groupes_a_creer.length}` : ''} / ${result.configuration.nb_groupes}`} hint="existants (+ à créer) / prévus" />
            <Fact label="Salles par groupe" value={result.configuration.salles_par_groupe} hint="occupées simultanément" />
            <Fact label="Capacité" value={`${result.capacite.requis} / ${result.capacite.disponible}`} hint="occupations salle-créneau requises / libres" tone={result.capacite.requis > result.capacite.disponible ? 'critical' : 'neutral'} />
          </div>

          <details className="border border-slate-200 bg-white p-3 text-xs text-slate-700">
            <summary className="cursor-pointer font-semibold text-slate-800">Salles utilisables : {result.salles_utilisables.length}{result.salles_exclues.length ? ` · ${result.salles_exclues.length} écartée(s)` : ''} · {result.reservations_externes} réservation(s) d’autres sessions sur la période</summary>
            {!result.salles_configurees && <p className="mt-2 text-amber-800">Aucune salle dédiée n’est configurée pour cette formation : les salles non dédiées sont utilisées. Configurez-les dans l’onglet « Formations & salles ».</p>}
            <p className="mt-2">{result.salles_utilisables.map((room) => `${room.code}${room.mode === 'partagee' ? ' (partagée)' : ''}`).join(', ') || '—'}</p>
            {result.salles_exclues.length > 0 && <p className="mt-1 text-slate-500">Écartées : {result.salles_exclues.map((room) => `${room.code} (${room.raison})`).join(', ')}</p>}
          </details>

          {result.complete && result.solutions.length > 1 && (
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Propositions">
              {result.solutions.map((solution, index) => (
                <button key={index} type="button" role="tab" aria-selected={choice === index} onClick={() => setChoice(index)} className={`border px-3 py-2 text-left text-xs ${choice === index ? 'border-teal-700 bg-teal-50' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>
                  <span className="block font-bold">Proposition {index + 1}{index === 0 ? ' · recommandée' : ''}</span>
                  <span className="text-slate-500">charge : {Object.entries(solution.charge_par_jour).map(([day, load]) => `${jourLabel(day).slice(0, 3)} ${load}`).join(' · ')}</span>
                </button>
              ))}
            </div>
          )}

          {assignments.length > 0 && <ProposalGrid assignments={assignments} unplaced={result.non_places || []} />}
        </section>
      )}

      {session && <PassagesEditor session={session} groups={data.groupes.filter((group) => Number(group.id_session) === Number(session.id))} canUpdate={canUpdate} onSaved={async (message) => { notify?.(message); await onChanged?.(); }} />}

      {session && canCreate && <Reprise session={session} sessions={data.sessions} onDone={async (message) => { notify?.(message); loadHistory(); await onChanged?.(); }} />}

      {history.length > 0 && (
        <section className="border border-slate-200 bg-white p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><History className="h-4 w-4" />Historique des générations</h3>
          <table className="mt-2 w-full text-left text-xs">
            <thead className="text-slate-500"><tr><th className="py-1">Date</th><th>Mode</th><th>Statut</th><th className="text-right">Créés</th><th className="text-right">Retirés</th><th>Par</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{history.map((item) => <tr key={item.id}><td className="py-1">{item.created_at}</td><td>{item.mode}</td><td>{item.statut === 'appliquee' ? 'Appliquée' : 'Échec'}</td><td className="text-right tabular-nums">{item.nb_crees}</td><td className="text-right tabular-nums">{item.nb_supprimes}</td><td>{item.auteur || '—'}</td></tr>)}</tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function Fact({ label, value, hint, tone }) {
  return (
    <div className="border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${tone === 'critical' ? 'text-rose-700' : 'text-slate-900'}`}>{value}</p>
      <p className="text-[11px] text-slate-500">{hint}</p>
    </div>
  );
}

/** Proposition : groupes en lignes, jours en colonnes, salles occupées dans chaque cellule. */
function ProposalGrid({ assignments, unplaced }) {
  return (
    <div className="overflow-x-auto border border-slate-200 bg-white">
      <table className="w-full min-w-[820px] border-collapse text-xs">
        <thead className="bg-slate-50 text-[11px] uppercase text-slate-600">
          <tr><th scope="col" className="w-44 px-3 py-2 text-left">Groupe</th>{JOURS.map((day) => <th key={day.id} scope="col" className="border-l border-slate-200 px-2 py-2 text-left">{day.label}</th>)}<th scope="col" className="border-l border-slate-200 px-2 py-2 text-right">Changements</th></tr>
        </thead>
        <tbody>
          {assignments.map((item) => (
            <tr key={item.cle} className="border-t border-slate-100 align-top">
              <th scope="row" className="px-3 py-2 text-left font-normal">
                <span className="font-bold text-slate-900">{item.code}</span> <span className="text-slate-500">{item.libelle}</span>
                <span className="block text-[11px] text-slate-500">{item.creneau.debut}–{item.creneau.fin}</span>
                {item.nouveau_groupe && <span className="mt-0.5 inline-flex items-center gap-1 border border-teal-300 px-1 text-[10px] text-teal-800"><Sparkles className="h-3 w-3" />nouveau groupe</span>}
                {item.fixe && <span className="mt-0.5 inline-block border border-slate-300 px-1 text-[10px] text-slate-600">conservé</span>}
              </th>
              {JOURS.map((day) => {
                const on = item.jours.includes(day.id);
                const added = item.nouveaux_jours?.includes(day.id) || (on && !item.fixe);
                return (
                  <td key={day.id} className={`border-l border-slate-100 px-2 py-2 ${on ? (added ? 'bg-teal-50' : 'bg-slate-50') : ''}`}>
                    {on ? <span className="flex flex-wrap gap-1">{item.salles_detail.map((room) => <span key={room.id} title={room.formateur || ''} className="border border-slate-300 bg-white px-1 font-semibold text-slate-800">{room.code}</span>)}</span> : <span className="text-slate-300">—</span>}
                  </td>
                );
              })}
              <td className="border-l border-slate-100 px-2 py-2 text-right tabular-nums text-slate-700">+{item.a_creer} / −{item.a_retirer}</td>
            </tr>
          ))}
          {unplaced.map((item) => (
            <tr key={item.cle} className="border-t border-rose-100 bg-rose-50/60">
              <th scope="row" className="px-3 py-2 text-left font-bold text-rose-900">{item.code}</th>
              <td colSpan={6} className="px-2 py-2 text-rose-900">Aucun créneau possible sans conflit : ce groupe reste à placer.</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Jours de passage de chaque groupe : modification manuelle avec vérification des salles. */
function PassagesEditor({ session, groups, canUpdate, onSaved }) {
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(null);
  const [errors, setErrors] = useState({});
  const expected = Number(session.passages_semaine) || null;
  if (!groups.length) return null;
  const daysOf = (group) => drafts[group.id] ?? passageDays(group);
  const toggle = (group, day) => setDrafts((current) => {
    const days = daysOf(group);
    return { ...current, [group.id]: days.includes(day) ? days.filter((item) => item !== day) : [...days, day].sort() };
  });
  const save = async (group) => {
    setSaving(group.id);
    setErrors((current) => ({ ...current, [group.id]: '' }));
    try {
      const response = await groupesApi.setPassages(group.id, { jours: daysOf(group) });
      setDrafts((current) => { const next = { ...current }; delete next[group.id]; return next; });
      await onSaved(`${group.code} : ${response.message}`);
    } catch (saveError) {
      setErrors((current) => ({ ...current, [group.id]: saveError.message }));
    } finally {
      setSaving(null);
    }
  };
  return (
    <section className="border border-slate-200 bg-white p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Wand2 className="h-4 w-4" />Jours de passage des groupes{expected ? ` · ${expected} par semaine` : ''}</h3>
      <p className="mt-1 text-xs text-slate-600">Ajouter un jour reproduit les salles du groupe ce jour-là (après vérification) ; retirer un jour supprime ses créneaux sans historique.</p>
      <ul className="mt-3 divide-y divide-slate-100">
        {groups.map((group) => {
          const days = daysOf(group);
          const dirty = Boolean(drafts[group.id]);
          return (
            <li key={group.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <span className="w-40 font-semibold text-slate-800">{group.code} <span className="text-xs font-normal text-slate-500">{Number(group.nb_salles) || 0} salle(s)</span></span>
              <span className="flex gap-1">{JOURS.map((day) => (
                <button key={day.id} type="button" disabled={!canUpdate} aria-pressed={days.includes(day.id)} onClick={() => toggle(group, day.id)} className={`border px-2 py-1 text-xs font-semibold ${days.includes(day.id) ? 'border-teal-700 bg-teal-800 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'} disabled:opacity-60`}>{day.label.slice(0, 3)}</button>
              ))}</span>
              {expected && days.length !== expected && <span className="text-xs text-amber-800">{days.length} / {expected} passage(s)</span>}
              {dirty && canUpdate && <button type="button" onClick={() => save(group)} disabled={saving === group.id || !days.length} className="inline-flex items-center gap-1 bg-teal-800 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40">{saving === group.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}Enregistrer</button>}
              {errors[group.id] && <p role="alert" className="w-full text-xs text-rose-800">{errors[group.id]}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Reprise de la configuration d'une session précédente de la même formation. */
function Reprise({ session, sessions, onDone }) {
  const confirm = useConfirm();
  const sources = sessions.filter((item) => Number(item.id_type_formation) === Number(session.id_type_formation) && Number(item.id) !== Number(session.id))
    .sort((a, b) => String(b.date_debut).localeCompare(String(a.date_debut)));
  const [source, setSource] = useState('');
  const [generate, setGenerate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!sources.length) return null;
  const run = async () => {
    const chosen = sources.find((item) => String(item.id) === source);
    if (!(await confirm({ title: 'Reprendre une configuration ?', message: `Groupes, horaires et jours de ${chosen ? chosen.code : 'la dernière session de la formation'} seront repris dans ${session.code}${generate ? ', puis le planning sera généré selon les disponibilités de la nouvelle période' : ''}. Les inscriptions ne sont pas copiées.`, tone: 'primary' }))) return;
    setBusy(true);
    setError('');
    try {
      const response = await planificationApi.reprendre(session.id, { id_session_source: source || null, generer: generate });
      await onDone(response.message);
    } catch (runError) {
      setError(runError.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="border border-slate-200 bg-white p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><RefreshCw className="h-4 w-4" />Reprendre la configuration d’une session précédente</h3>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <TagSelect label="Session source" value={source} onChange={setSource} options={sources.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.libelle}`, hint: `${item.date_debut} → ${item.date_fin}` }))} placeholder="Dernière session (automatique)" className="min-w-72" />
        <label className="flex items-center gap-2 pb-2 text-xs text-slate-700"><input type="checkbox" checked={generate} onChange={(event) => setGenerate(event.target.checked)} />Générer le planning</label>
        <button type="button" onClick={run} disabled={busy} className="inline-flex items-center gap-2 border border-teal-800 px-3 py-2 text-sm font-semibold text-teal-900 hover:bg-teal-50 disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Reprendre</button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-rose-800">{error}</p>}
    </section>
  );
}
