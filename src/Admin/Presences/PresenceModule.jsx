import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Building2, CalendarDays, Check, ClipboardCheck, GraduationCap, UserRound, Users } from 'lucide-react';
import {
  buildGroupRoster, dateToInput, exportPresenceCsv, latestScheduledDate,
  presenceViews, resolveAttendance, STATUS_LABELS, summarizePresence,
} from './presenceHelpers';
import {
  anneesScolairesApi,
  auditeursApi,
  departementsApi,
  formateursApi,
  groupesApi,
  emploisApi,
  inscriptionsApi,
  niveauxApi,
  presencesApi,
  sallesApi,
  sessionsApi,
  typesFormationsApi,
} from '../../config/apiService';
import { getCurrentSchoolYear } from '../../utils/schoolYear';
import { PeriodFilters } from './PresenceComponents';
import FeuillePointage from './FeuillePointage';
import { useLiveRefresh } from '../../composant/useLiveRefresh';
import ParAuditeur from './ParAuditeur';
import ParGroupe from './ParGroupe';
import ParFormateur from './ParFormateur';
import ParEmploiDuTemps from './ParEmploiDuTemps';
import ParSalle from './ParSalle';
import Statistiques from './Statistiques';
import DossierAuditeurComplet from '../AuditeursInscriptions/DossierAuditeurComplet';
import { useToastNotice } from '../../composant/toastContext';
import SubTabNav from '../../composant/SubTabNav';
import LeaveDialog from './LeaveDialog';
import { PERIOD_STATUSES } from '../../utils/leave';

const VIEW_ICONS = {
  date: CalendarDays,
  salle: Building2,
  auditeur: UserRound,
  groupe: Users,
  formateur: GraduationCap,
  emploi: ClipboardCheck,
  statistiques: BarChart3,
};

const EMPTY_DATA = {
  annees_scolaires: [], departements: [], types_formations: [], niveaux: [],
  sessions: [], salles: [], formateurs: [], auditeurs: [], groupes: [],
  emplois_du_temps: [], inscriptions: [], presences: [],
};
const dataRows = (response) => (Array.isArray(response?.data) ? response.data : []);
const numericFields = (items, fields) => dataRows(items).map((item) => Object.fromEntries(
  Object.entries(item).map(([key, value]) => [key, fields.includes(key) && value != null ? Number(value) : value])
));
const isAdmin = (user) => user?.role_code === 'admin' || user?.role === 'admin';

export default function PresenceModule({ onBack, currentUser, initialTab }) {
  const today = dateToInput(new Date());
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState(initialTab || 'date');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedYearId, setSelectedYearId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedAuditeur, setSelectedAuditeur] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [search, setSearch] = useState('');
  const [profileId, setProfileId] = useState(null);
  const [leaveRequest, setLeaveRequest] = useState(null);
  const [notice, setNotice] = useToastNotice();
  const canRead = isAdmin(currentUser) || (currentUser?.permissions?.presences || []).includes('read');
  const canUpdate = isAdmin(currentUser)
    || (currentUser?.permissions?.presences || []).some((action) => ['create', 'update'].includes(action));

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [
        annees, departements, types, niveaux, sessions, salles, formateurs,
        auditeurs, groupes, emplois, inscriptions, presences,
      ] = await Promise.all([
        anneesScolairesApi.getAll(),
        departementsApi.getAll(),
        typesFormationsApi.getAll(),
        niveauxApi.getAll(),
        sessionsApi.getAll(),
        sallesApi.getAll(),
        formateursApi.getAll(),
        auditeursApi.getAll(),
        groupesApi.getAll(),
        emploisApi.getAll(),
        inscriptionsApi.getAll(),
        presencesApi.getAll(),
      ]);
      setData({
        annees_scolaires: numericFields(annees, ['id', 'statut']),
        departements: numericFields(departements, ['id']),
        types_formations: numericFields(types, ['id']),
        niveaux: numericFields(niveaux, ['id']),
        sessions: numericFields(sessions, ['id', 'id_annee', 'id_type_formation', 'id_niveau']),
        salles: numericFields(salles, ['id']),
        formateurs: numericFields(formateurs, ['id', 'actif']),
        auditeurs: numericFields(auditeurs, ['id']),
        groupes: numericFields(groupes, ['id', 'id_session', 'jour_semaine', 'capacite', 'statut']),
        emplois_du_temps: numericFields(emplois, ['id', 'id_annee', 'id_groupe', 'id_salle', 'id_formateur', 'jour_semaine', 'statut']),
        inscriptions: numericFields(inscriptions, ['id', 'id_auditeur', 'id_emploi_du_temps', 'id_departement', 'id_annee', 'id_groupe', 'id_formateur', 'id_salle']),
        presences: numericFields(presences, ['id', 'id_inscription', 'id_emploi_du_temps', 'id_formateur']),
      });
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Impossible de charger les présences depuis la base de données.');
      throw loadError;
    } finally {
      setLoading(false);
    }
  }, [setError, setData]);

  useEffect(() => {
    if (canRead) Promise.resolve().then(() => loadData()).catch(() => {});
  }, [canRead, loadData]);
  // Historiques et statistiques suivent chaque pointage sans rechargement visible.
  useLiveRefresh(() => loadData({ silent: true }).catch(() => {}), { enabled: canRead, intervalMs: 60000 });

  const defaultYear = getCurrentSchoolYear(data.annees_scolaires, today);
  const selectedYear = data.annees_scolaires.find((year) => String(year.id) === selectedYearId) || defaultYear;
  const effectiveYearId = String(selectedYear?.id || '');
  const effectiveDate = selectedDate || (
    effectiveYearId ? latestScheduledDate(data, effectiveYearId, today) : null
  ) || today;
  const effectivePeriodStart = periodStart || selectedYear?.date_debut || `${today.slice(0, 7)}-01`;
  const effectivePeriodEnd = periodEnd || (
    selectedYear?.date_fin && selectedYear.date_fin < today ? selectedYear.date_fin : today
  );
  const yearSchedules = useMemo(() => data.emplois_du_temps.filter(
    (emploi) => !effectiveYearId || String(emploi.id_annee) === effectiveYearId
  ), [data.emplois_du_temps, effectiveYearId]);
  const currentEnrollmentIds = useMemo(() => new Set(data.inscriptions
    .filter((item) => item.statut === 'active'
      && (!effectiveYearId || String(item.id_annee) === effectiveYearId))
    .map((item) => item.id_auditeur)), [data.inscriptions, effectiveYearId]);
  const people = useMemo(() => data.auditeurs
    .filter((auditeur) => currentEnrollmentIds.has(auditeur.id))
    .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr')),
  [currentEnrollmentIds, data.auditeurs]);
  const currentGroupIds = useMemo(() => new Set(yearSchedules.map((item) => item.id_groupe)), [yearSchedules]);
  const groups = useMemo(() => data.groupes
    .filter((group) => currentGroupIds.has(group.id))
    .sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr')),
  [currentGroupIds, data.groupes]);
  const currentTrainerIds = useMemo(() => new Set(yearSchedules.map((item) => item.id_formateur)), [yearSchedules]);
  const trainers = useMemo(() => data.formateurs
    .filter((trainer) => currentTrainerIds.has(trainer.id))
    .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr')),
  [currentTrainerIds, data.formateurs]);

  const schedules = useMemo(() => yearSchedules.map((emploi) => {
    const enrollment = data.inscriptions.find((item) => item.id_emploi_du_temps === emploi.id);
    return {
      ...resolveAttendance(data, { id_inscription: enrollment?.id, id_emploi_du_temps: emploi.id }),
      emploi,
      inscriptionsCount: data.inscriptions.filter((item) => item.id_emploi_du_temps === emploi.id && item.statut === 'active').length,
    };
  }), [data, yearSchedules]);

  const attendanceRows = useMemo(() => data.presences
    .map((presence) => resolveAttendance(data, presence))
    .filter((row) => row.auditeur
      && (!effectiveYearId || String(row.emploi?.id_annee) === effectiveYearId)), [data, effectiveYearId]);
  const rangeRows = useMemo(() => attendanceRows.filter((row) => (
    row.date_presence >= effectivePeriodStart && row.date_presence <= effectivePeriodEnd
  )), [attendanceRows, effectivePeriodEnd, effectivePeriodStart]);

  const auditeurRows = selectedAuditeur
    ? rangeRows.filter((row) => String(row.auditeur?.id) === selectedAuditeur)
    : [];
  const groupRows = useMemo(() => selectedGroup
    ? rangeRows.filter((row) => String(row.groupe?.id) === selectedGroup)
    : [], [rangeRows, selectedGroup]);
  const groupRoster = useMemo(() => buildGroupRoster(data, selectedGroup, groupRows, search), [data, groupRows, search, selectedGroup]);
  const trainerRows = selectedTrainer
    ? rangeRows.filter((row) => String(row.formateur?.id) === selectedTrainer)
    : [];
  const scheduleRows = selectedSchedule
    ? rangeRows.filter((row) => String(row.emploi?.id) === selectedSchedule)
    : [];
  const statistics = useMemo(() => summarizePresence(rangeRows), [rangeRows]);
  const groupStatistics = groups.map((group) => {
    const rows = rangeRows.filter((row) => row.groupe?.id === group.id);
    const present = rows.filter((row) => row.statut === 'present').length;
    return { groupe: group, rows: rows.length, present, rate: rows.length ? Math.round((present / rows.length) * 100) : 0 };
  }).filter((item) => item.rows);

  const recordPresence = async (row, status, extra = {}) => {
    if (!canUpdate) return;
    // Congé et permission : la même fenêtre demande la période avant d'enregistrer.
    if (PERIOD_STATUSES.includes(status) && !extra.conge_date_debut) {
      setLeaveRequest({ row, status });
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        id_inscription: row.id_inscription,
        id_emploi_du_temps: row.id_emploi_du_temps || row.emploi?.id,
        id_formateur: row.id_formateur || row.formateur?.id || row.emploi?.id_formateur,
        date_presence: row.date_presence,
        statut: status,
        conge_date_debut: PERIOD_STATUSES.includes(status) ? extra.conge_date_debut : null,
        conge_date_fin: PERIOD_STATUSES.includes(status) ? extra.conge_date_fin : null,
        observation: row.observation || null,
      };
      await presencesApi.mark(payload);
      // Mise à jour immédiate de l'écran : le pointage apparaît sans attendre le rechargement.
      setData((current) => {
        const sameRecord = (item) => item.id_inscription === payload.id_inscription && String(item.date_presence).slice(0, 10) === String(payload.date_presence).slice(0, 10);
        const exists = current.presences.some(sameRecord);
        const presences = exists
          ? current.presences.map((item) => (sameRecord(item) ? { ...item, ...payload } : item))
          : [...current.presences, { id: `local-${payload.id_inscription}-${payload.date_presence}`, ...payload }];
        return { ...current, presences };
      });
      // Les données serveur (identifiants, statistiques) se resynchronisent en arrière-plan.
      loadData({ silent: true }).catch(() => {});
      setNotice(`Pointage enregistré : ${STATUS_LABELS[status].toLocaleLowerCase('fr')}.`);
      window.setTimeout(() => setNotice(''), 3000);
    } catch (saveError) {
      setError(saveError.message || 'Impossible d’enregistrer ce pointage.');
    } finally {
      setSaving(false);
    }
  };

  const periodControls = (rows, name) => (
    <PeriodFilters
      start={effectivePeriodStart}
      end={effectivePeriodEnd}
      onStartChange={setPeriodStart}
      onEndChange={setPeriodEnd}
      rows={rows}
      onExport={() => exportPresenceCsv(rows, name)}
    />
  );

  const setYearAndDates = (yearId, preferredDate = null) => {
    setSelectedYearId(yearId);
    const year = data.annees_scolaires.find((item) => String(item.id) === yearId);
    if (!year) return;
    setSelectedDate(preferredDate || latestScheduledDate(data, yearId, today) || today);
    setPeriodStart(year.date_debut);
    setPeriodEnd(year.date_fin < today ? year.date_fin : today);
    setSelectedRoom('');
    setSelectedGroup('');
    setSelectedTrainer('');
    setSelectedSchedule('');
  };

  const handleYearChange = (yearId) => {
    setYearAndDates(yearId);
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    const year = data.annees_scolaires.find((item) => (
      item.date_debut <= date && date <= item.date_fin
    ));
    if (year && String(year.id) !== effectiveYearId) setYearAndDates(String(year.id), date);
  };

  const viewProps = {
    date: {
      data: { ...data, sessions: data.sessions.filter((session) => !effectiveYearId || String(session.id_annee) === effectiveYearId) },
      canEdit: canUpdate, onOpenProfile: setProfileId,
    },
    salle: {
      data, selectedRoom, onRoomChange: setSelectedRoom,
      selectedDate: effectiveDate, onDateChange: handleDateChange,
      periodStart: effectivePeriodStart, periodEnd: effectivePeriodEnd,
      onPeriodStartChange: setPeriodStart, onPeriodEndChange: setPeriodEnd,
      rows: attendanceRows, search, onSearch: setSearch,
      onStatusChange: recordPresence, onOpenProfile: setProfileId,
      onExport: exportPresenceCsv, canEdit: canUpdate,
    },
    auditeur: {
      people, selectedAuditeur, onSelectAuditeur: setSelectedAuditeur, periodStart: effectivePeriodStart, periodEnd: effectivePeriodEnd,
      onPeriodStartChange: setPeriodStart, onPeriodEndChange: setPeriodEnd, rows: auditeurRows, data,
      onExport: exportPresenceCsv, onOpenProfile: setProfileId, onStatusChange: recordPresence, canEdit: canUpdate,
    },
    groupe: {
      groups, selectedGroup, onSelectGroup: setSelectedGroup,
      periodControls: periodControls(groupRows, `presences-groupe-${selectedGroup || 'groupe'}`),
      search, onSearch: setSearch, roster: groupRoster, rows: groupRows,
      onStatusChange: recordPresence, onOpenProfile: setProfileId,
      onOpenAuditeur: (auditeurId) => { setSelectedAuditeur(String(auditeurId)); setView('auditeur'); },
      canEdit: canUpdate,
    },
    formateur: {
      trainers, selectedTrainer, onSelectTrainer: setSelectedTrainer, periodStart: effectivePeriodStart, periodEnd: effectivePeriodEnd,
      onPeriodStartChange: setPeriodStart, onPeriodEndChange: setPeriodEnd, rows: trainerRows,
      onExport: exportPresenceCsv, onStatusChange: recordPresence, onOpenProfile: setProfileId, canEdit: canUpdate,
    },
    emploi: {
      schedules, selectedSchedule, onSelectSchedule: setSelectedSchedule, periodStart: effectivePeriodStart, periodEnd: effectivePeriodEnd,
      onPeriodStartChange: setPeriodStart, onPeriodEndChange: setPeriodEnd, rows: scheduleRows,
      onExport: exportPresenceCsv, onStatusChange: recordPresence, onOpenProfile: setProfileId, canEdit: canUpdate,
    },
    statistiques: {
      periodStart: effectivePeriodStart, periodEnd: effectivePeriodEnd, onPeriodStartChange: setPeriodStart, onPeriodEndChange: setPeriodEnd,
      rows: rangeRows, summary: statistics, groupStatistics, onExport: exportPresenceCsv,
      onStatusChange: recordPresence, onOpenProfile: setProfileId, canEdit: canUpdate,
    },
  };
  const viewComponents = {
    date: FeuillePointage,
    salle: ParSalle,
    auditeur: ParAuditeur,
    groupe: ParGroupe,
    formateur: ParFormateur,
    emploi: ParEmploiDuTemps,
    statistiques: Statistiques,
  };
  const ActiveView = viewComponents[view];

  if (!canRead) return <p role="alert" className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Vous n’avez pas la permission de consulter les présences.</p>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <button type="button" onClick={onBack} className="mb-3 text-xs font-semibold text-teal-800 hover:text-teal-950">← Tableau de bord</button>
          <p className="text-xs font-bold uppercase text-teal-800">Suivi pédagogique quotidien</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Présences</h1>
          <p className="mt-1 text-sm text-slate-500">Pointage par date et salle, historique des auditeurs et indicateurs d’assiduité.</p>
        </div>
        <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900"><ClipboardCheck className="h-4 w-4" /> Données synchronisées avec la base</div>
      </header>
      <SubTabNav label="Vues des présences" items={presenceViews.map((item) => ({ ...item, icon: VIEW_ICONS[item.id] }))} active={view} onChange={setView} />
      {error && <div role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      {notice && <div role="status" className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check className="h-4 w-4" />{notice}</div>}
      <label className="flex max-w-md flex-col gap-1 text-xs font-semibold text-slate-700">
        Année scolaire
        <select
          value={effectiveYearId}
          onChange={(event) => handleYearChange(event.target.value)}
          className="border border-slate-300 bg-white px-3 py-2.5 text-sm"
        >
          {data.annees_scolaires.map((year) => (
            <option key={year.id} value={String(year.id)}>
              {year.libelle}{Number(year.statut) === 1 ? ' · Active' : ''}
            </option>
          ))}
        </select>
      </label>
      {!loading && !data.annees_scolaires.length && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>
            Aucune année scolaire n’est enregistrée dans la base. La gestion des années est manuelle : créez une année avec ses dates, puis associez-y une session et un emploi du temps avant de saisir des présences.
          </p>
          {onBack && (
            <button type="button" onClick={onBack} className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-amber-100">
              Retour au menu
            </button>
          )}
        </div>
      )}
      {loading ? <p role="status" className="border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Chargement des données de présence…</p> : <>
        {leaveRequest && (
          <LeaveDialog
            kind={leaveRequest.status}
            person={`${leaveRequest.row.auditeur?.prenom || ''} ${leaveRequest.row.auditeur?.nom || ''}`.trim()}
            date={leaveRequest.row.date_presence}
            initial={{ debut: leaveRequest.row.conge_date_debut || leaveRequest.row.date_presence, fin: leaveRequest.row.conge_date_fin || leaveRequest.row.date_presence }}
            onClose={() => setLeaveRequest(null)}
            onConfirm={({ debut, fin }) => { const { row, status } = leaveRequest; setLeaveRequest(null); recordPresence(row, status, { conge_date_debut: debut, conge_date_fin: fin }); }}
          />
        )}
        {saving && <p role="status" className="text-xs text-teal-800">Enregistrement en cours…</p>}
        <ActiveView {...viewProps[view]} />
        {profileId && <DossierAuditeurComplet auditeurId={profileId} onClose={() => setProfileId(null)} />}
      </>}
    </div>
  );
}