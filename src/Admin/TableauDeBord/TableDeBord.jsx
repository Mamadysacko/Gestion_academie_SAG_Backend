import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, AlertTriangle, ArrowUpRight, Award, BookOpen, Building2,
  CalendarDays, CheckCircle2, ClipboardCheck, Clock3, GraduationCap, RefreshCw,
  TrendingUp, Users, UserCheck,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { dashboardApi } from '../../config/apiService';
import { getCurrentSchoolYear } from '../../utils/schoolYear';
import RapportsHub from './RapportsHub';
import AnalysesTableau from './AnalysesTableau';
import FicheJournaliere from './FicheJournaliere';
import { useLiveRefresh } from '../../composant/useLiveRefresh';

// ─── helpers ────────────────────────────────────────────────────────────────

function localDateString(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatNumber(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(
    new Date(`${value}T00:00:00`)
  );
}

// ─── sub-components ─────────────────────────────────────────────────────────

function MetricCard({ title, value, detail, icon: Icon, tone = 'blue' }) {
  const tones = {
    blue:   'bg-blue-50   text-blue-700   ring-blue-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
    emerald:'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber:  'bg-amber-50  text-amber-700  ring-amber-100',
    rose:   'bg-rose-50   text-rose-700   ring-rose-100',
    sky:    'bg-sky-50    text-sky-700    ring-sky-100',
    teal:   'bg-teal-50   text-teal-700   ring-teal-100',
  };
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
        </div>
        <span className={`shrink-0 rounded-xl p-3 ring-1 ${tones[tone] ?? tones.blue}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </motion.article>
  );
}

function Panel({ title, subtitle, children, action }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EnrollmentBreakdown({ title, subtitle, rows, emptyMessage }) {
  const maxAuditeurs = Math.max(...rows.map((row) => Number(row.auditeurs) || 0), 0);
  return (
    <Panel title={title} subtitle={subtitle}>
      {rows.length ? (
        <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
          {rows.map((row) => {
            const auditeurs    = Number(row.auditeurs)    || 0;
            const inscriptions = Number(row.inscriptions) || 0;
            const width        = maxAuditeurs > 0 ? (auditeurs / maxAuditeurs) * 100 : 0;
            return (
              <div key={row.id} className="space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {row.code ? `${row.code} · ` : ''}{row.libelle}
                    </p>
                    {row.detail && <p className="mt-0.5 truncate text-xs text-slate-500">{row.detail}</p>}
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-blue-800">
                    {formatNumber(auditeurs)}{' '}
                    <span className="font-medium text-slate-500">aud.</span>
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`${row.libelle} : ${formatNumber(auditeurs)} auditeurs`}
                  aria-valuemin={0} aria-valuemax={maxAuditeurs} aria-valuenow={auditeurs}
                  className="h-2 overflow-hidden rounded-full bg-slate-100"
                >
                  <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${width}%` }} />
                </div>
                <p className="text-right text-xs text-slate-500">
                  {formatNumber(inscriptions)} inscription(s) active(s)
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-slate-500">{emptyMessage}</p>
      )}
    </Panel>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function TableDeBord({ setActiveTab, currentUser }) {
  const canRead = currentUser?.role_code === 'admin'
    || currentUser?.role === 'admin'
    || (currentUser?.permissions?.['organisation-pedagogique'] || []).includes('read');

  const [view, setView]           = useState('overview');
  const [date, setDate]           = useState(localDateString());
  const [yearId, setYearId]       = useState('');
  const [sessionId, setSessionId] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading]     = useState(canRead);
  // silentRefreshing = true while a background poll is running (no spinner overlay)
  const [silentRefreshing, setSilentRefreshing] = useState(false);
  const [error, setError]         = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Stable ref so the interval closure always reads the latest filter values
  const filtersRef = useRef({ date, yearId, sessionId });
  useEffect(() => { filtersRef.current = { date, yearId, sessionId }; }, [date, yearId, sessionId]);

  const fetchDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!canRead) return;
    if (silent) setSilentRefreshing(true);
    else setLoading(true);

    const { date: d, yearId: y, sessionId: s } = filtersRef.current;
    try {
      const response = await dashboardApi.getOverview({
        date: d,
        id_annee:  y || undefined,
        id_session: s || undefined,
      });
      setDashboard(response.data);
      setError('');
      setLastUpdated(new Date());

      // Auto-select the active school year on first load
      if (!y) {
        const currentYear = getCurrentSchoolYear(response.data.filters.annees || []);
        const defaultId   = currentYear?.id || response.data.filters.id_annee;
        if (defaultId) setYearId(String(defaultId));
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue pendant le chargement du tableau de bord.');
    } finally {
      if (silent) setSilentRefreshing(false);
      else setLoading(false);
    }
  }, [canRead]);

  // Initial load + re-load when filters change
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard, date, yearId, sessionId]);

  // Rafraîchissement silencieux : après chaque opération dans l'application, au retour
  // sur l'onglet et toutes les 30 s.
  useLiveRefresh(() => fetchDashboard({ silent: true }), { enabled: canRead, intervalMs: 30_000 });

  // ── derived values ──
  const kpis           = dashboard?.kpis            || {};
  const activeSessions = dashboard?.filters?.sessions || [];
  const sessionLabel   = activeSessions.find((s) => String(s.id) === String(sessionId))?.libelle;
  const selectedYearLabel = dashboard?.filters?.annees
    ?.find((y) => String(y.id) === String(yearId))?.libelle;

  const presenceRate = kpis.taux_presence != null
    ? `${kpis.taux_presence} %`
    : '—';

  // ── access guard ──
  if (!canRead) {
    return (
      <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Vous n'avez pas la permission de consulter les indicateurs du tableau de bord.
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <main className="space-y-6 pb-8">

      {/* ── Hero header ── */}
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-6 text-white shadow-lg md:p-8">
        <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Pilotage académique</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Tableau de bord</h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-100">
              Indicateurs en temps réel sur les inscriptions, présences, ressources, évaluations et décisions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Sections du tableau de bord">
            {[['overview', "Vue d'ensemble"], ['reports', 'Rapports'], ['fiche', 'Fiche journalière']].map(([key, label]) => (
              <button
                key={key} type="button" role="tab" aria-selected={view === key}
                onClick={() => setView(key)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition
                  ${view === key ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {view === 'overview' ? (
        <>
          {/* ── Filter bar ── */}
          <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Périmètre des indicateurs
              </p>
              <div className="flex flex-wrap gap-3">
                <label className="grid gap-1 text-xs font-medium text-slate-600">
                  Année scolaire
                  <select
                    value={yearId}
                    onChange={(e) => { setYearId(e.target.value); setSessionId(''); }}
                    className="min-w-44 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800"
                  >
                    <option value="">Toutes les années</option>
                    {(dashboard?.filters?.annees || []).map((y) => (
                      <option key={y.id} value={y.id}>{y.libelle}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-medium text-slate-600">
                  Session
                  <select
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="min-w-52 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800"
                  >
                    <option value="">Toutes les sessions</option>
                    {activeSessions.map((s) => (
                      <option key={s.id} value={s.id}>{s.code} — {s.libelle}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-medium text-slate-600">
                  Date d'analyse
                  <input
                    type="date" value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                  />
                </label>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Live refresh indicator */}
              {silentRefreshing && (
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Actualisation…
                </span>
              )}
              {lastUpdated && !silentRefreshing && (
                <span className="text-xs text-slate-400">
                  Mis à jour {new Intl.DateTimeFormat('fr-FR', { timeStyle: 'medium' }).format(lastUpdated)}
                </span>
              )}
              <button
                type="button"
                onClick={() => fetchDashboard()}
                disabled={loading || silentRefreshing}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
            </div>
          </section>

          {error && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {error}
            </div>
          )}

          {/* Initial skeleton */}
          {loading && !dashboard ? (
            <div role="status" className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Chargement des indicateurs depuis la base de données…
            </div>
          ) : dashboard && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${yearId}-${sessionId}-${date}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Context line */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
                  <p>
                    {selectedYearLabel || 'Toutes les années'}
                    {sessionLabel ? ` · ${sessionLabel}` : ''}
                  </p>
                  <p>Analyse du {formatDate(date)} · actualisation automatique après chaque opération</p>
                </div>

                {/* ── KPI grid ── */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    title="Auditeurs actifs (périmètre)"
                    value={formatNumber(kpis.auditeurs_actifs)}
                    detail={`${formatNumber(kpis.inscriptions_actives)} inscriptions actives`}
                    icon={Users}
                    tone="blue"
                  />
                  <MetricCard
                    title="Auditeurs total (académie)"
                    value={formatNumber(kpis.auditeurs_total)}
                    detail="Tous auditeurs enregistrés"
                    icon={UserCheck}
                    tone="sky"
                  />
                  <MetricCard
                    title="Groupes actifs"
                    value={formatNumber(kpis.groupes_actifs)}
                    detail={`${formatNumber(kpis.sessions_en_cours)} session(s) en cours · ${formatNumber(kpis.sessions_total)} total`}
                    icon={BookOpen}
                    tone="violet"
                  />
                  <MetricCard
                    title="Taux de présence du jour"
                    value={presenceRate}
                    detail={`${formatNumber(kpis.pointes_du_jour)} / ${formatNumber(kpis.attendus_du_jour)} auditeur(s) attendu(s) pointé(s) · ${formatNumber(kpis.non_pointes_du_jour)} à pointer`}
                    icon={Activity}
                    tone="emerald"
                  />
                  <MetricCard
                    title="Formateurs actifs"
                    value={formatNumber(kpis.formateurs_actifs)}
                    detail="Effectif global actif"
                    icon={GraduationCap}
                    tone="teal"
                  />
                  <MetricCard
                    title="Salles disponibles"
                    value={`${formatNumber(kpis.salles_disponibles)} / ${formatNumber(kpis.salles_total)}`}
                    detail={`${formatNumber(kpis.salles_occupees)} salle(s) planifiée(s) dans le périmètre`}
                    icon={Building2}
                    tone="amber"
                  />
                  <MetricCard
                    title="Résultats des sessions"
                    value={`${formatNumber(kpis.resultats_admis)} admis`}
                    detail={`${formatNumber(kpis.resultats_non_admis)} non admis · ${formatNumber(kpis.resultats_en_attente)} en attente · ${formatNumber(kpis.decisions_total)} décision(s) validée(s)`}
                    icon={Award}
                    tone="violet"
                  />
                  <MetricCard
                    title="Moyenne générale"
                    value={kpis.moyenne_generale != null ? `${Number(kpis.moyenne_generale).toFixed(2)} /4` : '—'}
                    detail={`${formatNumber(kpis.notes_manquantes)} note(s) manquante(s) dans le périmètre`}
                    icon={TrendingUp}
                    tone="teal"
                  />
                  <MetricCard
                    title="Évaluations réalisées"
                    value={formatNumber(kpis.evaluations_realisees)}
                    detail="Évaluations dont la date est passée"
                    icon={ClipboardCheck}
                    tone="emerald"
                  />
                  <MetricCard
                    title="Évaluations à venir"
                    value={formatNumber(kpis.evaluations_a_venir)}
                    detail="Dans les 30 prochains jours"
                    icon={CalendarDays}
                    tone="rose"
                  />
                  <MetricCard
                    title="Places configurées"
                    value={formatNumber(kpis.capacite_totale_groupes)}
                    detail={`${formatNumber(dashboard.capacite?.depassements)} inscription(s) au-delà de la capacité`}
                    icon={TrendingUp}
                    tone="sky"
                  />
                </div>

                {/* ── Statuts du jour ── */}
                <Panel
                  title={`Statuts de présence du ${formatDate(date)}`}
                  subtitle={`${formatNumber(dashboard.presence_jour?.total)} pointage(s) enregistré(s) dans le périmètre sélectionné`}
                >
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                      { label: 'Présent',         value: dashboard.presence_jour?.present,         color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
                      { label: 'Absent',           value: dashboard.presence_jour?.absent,          color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200' },
                      { label: 'Permissionnaire',  value: dashboard.presence_jour?.permissionnaire, color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200' },
                      { label: 'Malade',           value: dashboard.presence_jour?.malade,          color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
                      { label: 'Congé',            value: dashboard.presence_jour?.conge,           color: 'text-sky-700',     bg: 'bg-sky-50 border-sky-200' },
                    ].map(({ label, value, color, bg }) => (
                      <div key={label} className={`rounded-xl border p-4 ${bg}`}>
                        <p className="text-xs font-medium text-current/70">{label}</p>
                        <p className={`mt-2 text-2xl font-bold tabular-nums ${color}`}>{formatNumber(value)}</p>
                      </div>
                    ))}
                  </div>
                  {Number(dashboard.presence_jour?.total) === 0 && (
                    <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Aucun pointage n’est enregistré pour cette date dans le périmètre sélectionné.
                    </p>
                  )}
                </Panel>

                {/* ── Charts ── */}
                <div className="grid gap-5 xl:grid-cols-2">
                  <Panel
                    title={`Pointages des 7 jours jusqu’au ${formatDate(date)}`}
                    subtitle="Répartition quotidienne par statut dans le périmètre sélectionné"
                  >
                    {dashboard.series?.presences?.some((point) => Number(point.total) > 0) ? (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={dashboard.series.presences}
                            margin={{ top: 8, right: 8, left: -18, bottom: 18 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                              dataKey="label"
                              interval={0}
                              angle={-35}
                              tickMargin={8}
                              height={58}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 11, textAnchor: 'end' }}
                            />
                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="present" name="Présent" stackId="s" fill="#10b981" />
                            <Bar dataKey="absent" name="Absent" stackId="s" fill="#f43f5e" />
                            <Bar dataKey="permissionnaire" name="Permissionnaire" stackId="s" fill="#8b5cf6" />
                            <Bar dataKey="malade" name="Malade" stackId="s" fill="#f59e0b" />
                            <Bar dataKey="conge" name="Congé" stackId="s" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="flex h-72 items-center justify-center text-center text-sm text-slate-500">
                        Aucun pointage enregistré sur les sept jours se terminant le {formatDate(date)}.
                      </p>
                    )}
                  </Panel>

                  <Panel
                    title="Évolution des inscriptions"
                    subtitle="Nouvelles inscriptions par mois dans le périmètre sélectionné"
                  >
                    <div className="h-72">
                      {(dashboard.series?.inscriptions || []).length ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={dashboard.series.inscriptions}
                            margin={{ top: 8, right: 12, left: -18, bottom: 2 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Line
                              type="monotone" dataKey="total" name="Inscriptions"
                              stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-slate-400">
                          Aucune inscription enregistrée sur cette période.
                        </div>
                      )}
                    </div>
                  </Panel>
                </div>

                {/* ── Répartitions ── */}
                <div className="grid gap-5 xl:grid-cols-3">
                  <EnrollmentBreakdown
                    title="Auditeurs par département"
                    subtitle="Effectif unique et inscriptions actives"
                    rows={dashboard.repartition_departements || []}
                    emptyMessage="Aucune inscription active par département."
                  />
                  <EnrollmentBreakdown
                    title="Auditeurs par niveau"
                    subtitle="Niveau pédagogique de la session"
                    rows={dashboard.repartition_niveaux || []}
                    emptyMessage="Aucune inscription active par niveau."
                  />
                  <EnrollmentBreakdown
                    title="Auditeurs par groupe"
                    subtitle="Groupes associés au périmètre sélectionné"
                    rows={(dashboard.repartition_groupes || []).map((g) => ({
                      ...g,
                      detail: `${g.niveau} · ${g.session}`,
                    }))}
                    emptyMessage="Aucune inscription active par groupe."
                  />
                </div>

                {/* ── Analyses interactives ── */}
                <AnalysesTableau dashboard={dashboard} />

                {/* ── Planning + Alertes ── */}
                <div className="grid gap-5 xl:grid-cols-2">
                  <Panel
                    title="Séances prévues ce jour"
                    subtitle={`Planning hebdomadaire · ${formatDate(date)}`}
                  >
                    {dashboard.planning_jour?.length ? (
                      <div className="max-h-80 space-y-3 overflow-auto pr-1">
                        {dashboard.planning_jour.map((item) => (
                          <article key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-slate-800">
                                  {item.groupe_code} · {item.groupe}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {item.formation} · {item.niveau}
                                </p>
                              </div>
                              <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                                {item.inscrits_actifs} inscrit(s)
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-slate-600">
                              {item.salle_code} — {item.salle} · {item.formateur}
                            </p>
                            {item.capacite != null && (
                              <p className={`mt-1 text-xs font-medium
                                ${Number(item.inscrits_actifs) > Number(item.capacite)
                                  ? 'text-rose-600' : 'text-slate-500'}`}>
                                Capacité : {item.capacite} places
                                {Number(item.inscrits_actifs) > Number(item.capacite) && ' ⚠ dépassée'}
                              </p>
                            )}
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="py-12 text-center text-sm text-slate-500">
                        Aucune séance active planifiée ce jour (ou jour non ouvré).
                      </p>
                    )}
                  </Panel>

                  <Panel
                    title="Alertes"
                    subtitle="Contrôles automatiques sur les données de la base"
                  >
                    {dashboard.alertes?.length ? (
                      <div className="space-y-3">
                        {dashboard.alertes.map((alert) => (
                          <div key={alert.type}
                            className={`flex gap-3 rounded-xl border p-3
                              ${alert.severite === 'attention'
                                ? 'border-rose-200 bg-rose-50'
                                : 'border-amber-100 bg-amber-50'}`}>
                            <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0
                              ${alert.severite === 'attention' ? 'text-rose-600' : 'text-amber-600'}`} />
                            <div>
                              <p className={`text-sm font-medium
                                ${alert.severite === 'attention' ? 'text-rose-900' : 'text-amber-950'}`}>
                                {alert.message}
                              </p>
                              <p className={`mt-1 text-xs
                                ${alert.severite === 'attention' ? 'text-rose-700' : 'text-amber-800'}`}>
                                {formatNumber(alert.total)} élément(s) concerné(s)
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex min-h-40 flex-col items-center justify-center text-center">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        <p className="mt-2 text-sm font-semibold text-slate-800">Aucune alerte détectée</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Les contrôles de capacité et de pointage ne détectent aucune anomalie.
                        </p>
                      </div>
                    )}
                  </Panel>
                </div>

                {/* ── Passages de niveau ── */}
                <Panel
                  title="Décisions de passage de niveau"
                  subtitle="Répartition des décisions enregistrées pour le périmètre"
                >
                  {dashboard.decisions?.length ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {dashboard.decisions.map((item) => {
                        const labels = {
                          admis:     { label: 'Admis',       color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
                          non_admis: { label: 'Non admis',   color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200' },
                          redouble:  { label: 'Redoublement',color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
                          abandonne: { label: 'Abandon',     color: 'text-slate-600',   bg: 'bg-slate-50 border-slate-200' },
                        };
                        const cfg = labels[item.decision] || { label: item.decision, color: 'text-slate-900', bg: 'bg-white border-slate-200' };
                        return (
                          <div key={item.decision} className={`rounded-xl border p-4 ${cfg.bg}`}>
                            <p className="text-sm font-medium text-slate-600">{cfg.label}</p>
                            <p className={`mt-2 text-2xl font-bold tabular-nums ${cfg.color}`}>
                              {formatNumber(item.total)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-slate-500">
                      Aucune décision de passage enregistrée dans ce périmètre.
                    </p>
                  )}
                </Panel>

                {/* ── Évaluations à venir ── */}
                <Panel
                  title="Prochaines évaluations"
                  subtitle="Évaluations programmées dans les 30 jours"
                  action={
                    <button
                      type="button"
                      onClick={() => setActiveTab?.('evaluations')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                    >
                      Gérer les évaluations <ArrowUpRight className="h-4 w-4" />
                    </button>
                  }
                >
                  {dashboard.evaluations_a_venir?.length ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {dashboard.evaluations_a_venir.map((ev) => (
                        <article key={ev.id} className="rounded-xl border border-slate-200 p-4">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
                            <Clock3 className="h-4 w-4" />{formatDate(ev.date_evaluation)}
                          </div>
                          <p className="mt-2 font-semibold text-slate-900">{ev.libelle}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {ev.session} · {ev.criteres} critère(s)
                          </p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-slate-500">
                      Aucune évaluation à venir dans les 30 jours.
                    </p>
                  )}
                </Panel>

              </motion.div>
            </AnimatePresence>
          )}
        </>
      ) : view === 'fiche' ? (
        <FicheJournaliere
          sessions={dashboard?.filters?.sessions || []}
          selectedSession={sessionId}
        />
      ) : (
        <RapportsHub
          annees={dashboard?.filters?.annees   || []}
          sessions={dashboard?.filters?.sessions || []}
          selectedAnnee={yearId}
          selectedSession={sessionId}
        />
      )}
    </main>
  );
}
