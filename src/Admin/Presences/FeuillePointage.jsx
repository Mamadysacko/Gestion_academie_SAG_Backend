import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Clock, Download, GraduationCap, MapPin, RefreshCw, Search } from 'lucide-react';
import { presencesApi } from '../../config/apiService';
import { useLiveRefresh } from '../../composant/useLiveRefresh';
import { useConfirm } from '../../composant/confirmContext';
import { dateToInput, formatDate, STATUS_LABELS, STATUS_OPTIONS } from './presenceHelpers';
import { PresenceFilter, PresenceMetric } from './PresenceComponents';
import { useToastNotice } from '../../composant/toastContext';
import { exportTable } from '../../utils/exportExcel';
import LeaveDialog from './LeaveDialog';
import { PERIOD_STATUSES, leavePeriodLabel, observationText } from '../../utils/leave';

const shortTime = (value) => String(value || '').slice(0, 5);

/**
 * Feuille de pointage automatique : la liste des auditeurs attendus est calculée par le serveur
 * à partir de la date (jour de la semaine), de la session, du groupe, de la salle et du formateur.
 */
export default function FeuillePointage({ data, canEdit, onOpenProfile }) {
  const confirm = useConfirm();
  const [date, setDate] = useState(dateToInput(new Date()));
  const [filters, setFilters] = useState({ id_session: '', id_groupe: '', id_salle: '', id_formateur: '' });
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useToastNotice();
  const [leave, setLeave] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const response = await presencesApi.getFeuille({ date, ...filters });
      setSheet(response.data);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Impossible de charger la feuille de pointage.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [date, filters]);

  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);
  useLiveRefresh(() => load({ silent: true }), { intervalMs: 15000 });

  const today = sheet?.aujourdhui || dateToInput(new Date());
  const setFilter = (key, value) => setFilters((current) => ({
    ...current,
    [key]: value,
    ...(key === 'id_session' ? { id_groupe: '' } : {}),
  }));

  const rows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('fr');
    return (sheet?.auditeurs || []).filter((row) => !term
      || `${row.auditeur_prenom} ${row.auditeur_nom} ${row.auditeur_matricule}`.toLocaleLowerCase('fr').includes(term));
  }, [search, sheet]);

  const classes = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const key = row.id_emploi_du_temps;
      if (!map.has(key)) map.set(key, { key, info: row, rows: [] });
      map.get(key).rows.push(row);
    });
    return [...map.values()];
  }, [rows]);

  const counts = useMemo(() => {
    const marked = rows.filter((row) => row.statut);
    const present = marked.filter((row) => row.statut === 'present').length;
    return {
      expected: rows.length,
      marked: marked.length,
      present,
      absent: marked.filter((row) => row.statut === 'absent').length,
      pending: rows.length - marked.length,
      rate: marked.length ? Math.round((present / marked.length) * 100) : null,
    };
  }, [rows]);

  const sessions = data.sessions;
  const groups = data.groupes.filter((group) => !filters.id_session || String(group.id_session) === filters.id_session);

  const mark = async (row, statut, extra = {}) => {
    if (!canEdit) return;
    // Congé et permission demandent leur période : même fenêtre pour les deux statuts.
    if (PERIOD_STATUSES.includes(statut) && !extra.conge_date_debut) {
      setLeave({ row, kind: statut });
      return;
    }
    if (row.statut && row.statut !== statut && !(await confirm({
      title: 'Modifier ce pointage ?',
      message: `${row.auditeur_prenom} ${row.auditeur_nom} : « ${STATUS_LABELS[row.statut]} » → « ${STATUS_LABELS[statut]} » le ${formatDate(date)}.`,
      tone: 'warning',
    }))) return;
    setBusy(true);
    setError('');
    try {
      await presencesApi.mark({
        id_inscription: row.id_inscription,
        id_emploi_du_temps: row.id_emploi_du_temps,
        date_presence: date,
        statut,
        conge_date_debut: extra.conge_date_debut || null,
        conge_date_fin: extra.conge_date_fin || null,
        observation: row.observation || null,
      });
      setSheet((current) => ({
        ...current,
        auditeurs: current.auditeurs.map((item) => (item.id_inscription === row.id_inscription
          ? { ...item, statut, conge_date_debut: extra.conge_date_debut || null, conge_date_fin: extra.conge_date_fin || null }
          : item)),
      }));
    } catch (saveError) {
      setError(saveError.message || 'Impossible d’enregistrer ce pointage.');
    } finally {
      setBusy(false);
    }
  };

  const markPending = async (targetRows) => {
    const pending = targetRows.filter((row) => !row.statut);
    if (!canEdit || !pending.length) return;
    const onLeave = pending.filter((row) => row.conge_en_cours).length;
    if (!(await confirm({
      title: 'Pointer les auditeurs non pointés ?',
      message: `${pending.length} auditeur(s) seront marqués présents le ${formatDate(date)}.${onLeave ? `\n${onLeave} auditeur(s) en congé seront automatiquement marqués « Congé ».` : ''}`,
      tone: 'primary',
    }))) return;
    setBusy(true);
    setError('');
    try {
      const response = await presencesApi.markBulk({ date_presence: date, statut: 'present', ids: pending.map((row) => row.id_inscription) });
      const errors = response?.data?.errors || [];
      setNotice(response?.message || 'Pointage enregistré.');
      if (errors.length) setError(errors.map((item) => item.error).filter((value, index, all) => all.indexOf(value) === index).join(' '));
      await load({ silent: true });
    } catch (saveError) {
      setError(saveError.message || 'Le pointage groupé a échoué.');
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const headings = ['Date', 'Session', 'Groupe', 'Salle', 'Formateur', 'Matricule', 'Auditeur', 'Statut', 'Observation'];
    const lines = rows.map((row) => [date, row.session_code, row.groupe_code, row.salle_code, `${row.formateur_prenom} ${row.formateur_nom}`, row.auditeur_matricule, `${row.auditeur_prenom} ${row.auditeur_nom}`, row.statut ? STATUS_LABELS[row.statut] : 'Non pointé', observationText(row)]);
    exportTable({
      filename: `feuille-presence-${date}`,
      title: 'Feuille de présence',
      subtitle: `Date : ${date}`,
      headings,
      rows: lines,
    });
  };

  return (
    <div className="space-y-4">
      <section className="space-y-3 border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase text-slate-500">Date</span><input type="date" max={today} value={date} onChange={(event) => event.target.value && setDate(event.target.value)} className="border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-700" /></label>
          {date !== today && <button type="button" onClick={() => setDate(today)} className="border border-teal-300 bg-teal-50 px-3 py-2.5 text-xs font-semibold text-teal-900">Aujourd’hui</button>}
          <PresenceFilter label="Session" value={filters.id_session} onChange={(value) => setFilter('id_session', value)} placeholder="Toutes les sessions" options={sessions.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.libelle}` }))} />
          <PresenceFilter label="Groupe" value={filters.id_groupe} onChange={(value) => setFilter('id_groupe', value)} placeholder="Tous les groupes" options={groups.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.libelle}` }))} />
          <PresenceFilter label="Salle" value={filters.id_salle} onChange={(value) => setFilter('id_salle', value)} placeholder="Toutes les salles" options={data.salles.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.libelle}` }))} />
          <PresenceFilter label="Formateur" value={filters.id_formateur} onChange={(value) => setFilter('id_formateur', value)} placeholder="Tous les formateurs" options={data.formateurs.map((item) => ({ value: String(item.id), label: `${item.prenom} ${item.nom}` }))} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <label className="relative block w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un auditeur" className="w-full border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-700" /></label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => load()} disabled={loading} className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualiser</button>
            <button type="button" onClick={exportCsv} disabled={!rows.length} className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"><Download className="h-4 w-4" />Exporter</button>
            {canEdit && <button type="button" onClick={() => markPending(rows)} disabled={busy || !counts.pending} className="inline-flex items-center gap-2 bg-teal-800 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-900 disabled:opacity-40"><Check className="h-4 w-4" />Non pointés → présents ({counts.pending})</button>}
          </div>
        </div>
      </section>

      {error && <div role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      {notice && <div role="status" className="border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

      <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <PresenceMetric label="Attendus" value={counts.expected} detail={formatDate(date)} />
        <PresenceMetric label="Pointés" value={counts.marked} tone="slate" />
        <PresenceMetric label="Non pointés" value={counts.pending} tone={counts.pending ? 'amber' : 'green'} />
        <PresenceMetric label="Présents" value={counts.present} tone="green" />
        <PresenceMetric label="Absents" value={counts.absent} tone="red" />
        <PresenceMetric label="Taux de présence" value={counts.rate === null ? '—' : `${counts.rate} %`} tone="teal" />
      </section>

      {loading && !sheet ? <p role="status" className="border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Calcul de la feuille du jour…</p>
        : sheet && !sheet.jour_de_cours ? <EmptyState title="Pas de cours ce jour" text="Les cours ont lieu du lundi au vendredi." />
          : !classes.length ? <EmptyState title={filters.id_salle ? 'Aucune affectation pour cette salle à cette date' : 'Aucun auditeur attendu'} text={filters.id_salle
              ? (data.emplois_du_temps.some((emploi) => String(emploi.id_salle) === filters.id_salle && Number(emploi.statut) === 1)
                ? 'Cette salle est bien affectée, mais pas le jour choisi (ou aucun auditeur n’y est inscrit). Changez de date ou de salle.'
                : 'Aucun groupe n’est affecté à cette salle, donc aucun formateur n’y est rattaché : créez d’abord l’affectation (Salles › Affectations groupe-salle).')
              : 'Aucun groupe n’a cours à cette date avec ces filtres (jour du groupe, période de la session et de l’année).'} />
            : classes.map((item) => (
              <section key={item.key} className="border border-slate-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
                    <span><strong className="text-sm text-slate-900">{item.info.groupe_code} · {item.info.groupe_libelle}</strong> <span className="ml-1">{item.info.session_code}</span></span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-teal-700" />{item.info.salle_code} · {item.info.salle_libelle}</span>
                    <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5 text-teal-700" />{item.info.formateur_prenom} {item.info.formateur_nom}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-teal-700" />{shortTime(item.info.heure_debut)}–{shortTime(item.info.heure_fin)}</span>
                    <span>{item.rows.filter((row) => row.statut).length}/{item.rows.length} pointé(s)</span>
                  </div>
                  {canEdit && <button type="button" onClick={() => markPending(item.rows)} disabled={busy || item.rows.every((row) => row.statut)} className="inline-flex items-center gap-2 border border-teal-300 bg-white px-3 py-1.5 text-xs font-semibold text-teal-900 disabled:opacity-40"><Check className="h-3.5 w-3.5" />Non pointés présents</button>}
                </div>
                <ul className="divide-y divide-slate-100">
                  {item.rows.map((row) => (
                    <li key={row.id_inscription} className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <button type="button" onClick={() => onOpenProfile?.(row.id_auditeur)} className="text-left text-sm font-semibold text-slate-800 hover:text-teal-800">{row.auditeur_nom} {row.auditeur_prenom}</button>
                        <span className="ml-2 font-mono text-xs text-slate-500">{row.auditeur_matricule}</span>
                        {row.conge_en_cours && <span className="ml-2 border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">{leavePeriodLabel(row)}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1" role="group" aria-label={`Statut de ${row.auditeur_prenom} ${row.auditeur_nom}`}>
                        {STATUS_OPTIONS.map((status) => {
                          const active = row.statut === status.value;
                          return <button key={status.value} type="button" disabled={!canEdit || busy} aria-pressed={active} onClick={() => !active && mark(row, status.value)} className={`border px-2.5 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed ${active ? STATUS_ACTIVE[status.value] : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'} ${!canEdit ? 'opacity-60' : ''}`}>{status.label}</button>;
                        })}
                        {!row.statut && <span className="self-center px-1 text-[11px] font-semibold text-amber-700">À pointer</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

      {leave && (
        <LeaveDialog
          kind={leave.kind}
          person={`${leave.row.auditeur_prenom} ${leave.row.auditeur_nom}`}
          date={date}
          onClose={() => setLeave(null)}
          onConfirm={({ debut, fin }) => { const { row, kind } = leave; setLeave(null); mark(row, kind, { conge_date_debut: debut, conge_date_fin: fin }); }}
        />
      )}
    </div>
  );
}

const STATUS_ACTIVE = {
  present: 'border-emerald-600 bg-emerald-600 text-white',
  absent: 'border-rose-600 bg-rose-600 text-white',
  permissionnaire: 'border-amber-500 bg-amber-500 text-white',
  malade: 'border-violet-600 bg-violet-600 text-white',
  conge: 'border-sky-600 bg-sky-600 text-white',
};

function EmptyState({ title, text }) {
  return <div className="border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><CalendarDays className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-3 text-sm font-bold text-slate-800">{title}</h2><p className="mt-1 text-sm text-slate-500">{text}</p></div>;
}
