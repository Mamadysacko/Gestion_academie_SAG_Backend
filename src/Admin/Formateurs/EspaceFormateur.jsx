import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Award, BookOpenCheck, CalendarDays, ClipboardCheck, GraduationCap, Search, Users } from 'lucide-react';
import { authApi } from '../../config/apiService';
import { useLanguage } from '../../i18n/useLanguage';
import SearchableSelect from '../../composant/SearchableSelect';
import { getCurrentSchoolYear } from '../../utils/schoolYear';
import { calculateAverageOnFour } from '../EvaluationsNotes/notesHelpers';
import { useSessionResults } from '../EvaluationsNotes/useSessionResults';
import { AppreciationBadge } from '../EvaluationsNotes/ResultatsComponents';
import { appreciationFor } from '../EvaluationsNotes/resultatsHelpers';
import MesResultats from './MesResultats';
import { useToastNotice } from '../../composant/toastContext';
import SubTabNav from '../../composant/SubTabNav';
import LeaveDialog from '../Presences/LeaveDialog';
import { PERIOD_STATUSES, observationText } from '../../utils/leave';

const rows = (value) => Array.isArray(value) ? value : [];
const isActive = (value) => Number(value) === 1;
const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const currentDate = () => toDateInputValue(new Date());
const firstDayOfCurrentMonth = () => `${currentDate().slice(0, 7)}-01`;
const getIsoWeekday = (dateValue) => {
  const date = new Date(`${dateValue}T00:00:00`);
  return ((date.getDay() + 6) % 7) + 1;
};
const withinPeriod = (value, start, end) => value >= start && value <= end;
const trainerStatuses = [
  { value: 'present', label: 'present' },
  { value: 'absent', label: 'absent' },
  { value: 'permissionnaire', label: 'permissionnaire' },
  { value: 'malade', label: 'sick' },
  { value: 'conge', label: 'leave' },
];

function readPortalData(response, t) {
  if (!response?.data) throw new Error(response?.error || t('trainerPortalLoadError'));
  return {
    schedules: rows(response.data.schedules),
    learners: rows(response.data.learners),
    attendance: rows(response.data.attendance),
    grades: rows(response.data.grades),
    evaluations: rows(response.data.evaluations),
    criteria: rows(response.data.criteria),
    trainer: response.data.trainer || null,
  };
}

function scheduleOccurrences(schedule, start, end) {
  const rangeStart = schedule.annee_date_debut > start ? schedule.annee_date_debut : start;
  const rangeEnd = schedule.annee_date_fin < end ? schedule.annee_date_fin : end;
  if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) return [];

  const occurrences = [];
  const date = new Date(`${rangeStart}T00:00:00`);
  const lastDate = new Date(`${rangeEnd}T00:00:00`);
  while (date <= lastDate) {
    const value = toDateInputValue(date);
    if (getIsoWeekday(value) === Number(schedule.jour_semaine)) {
      occurrences.push({ ...schedule, date: value });
    }
    date.setDate(date.getDate() + 1);
  }
  return occurrences;
}

export default function EspaceFormateur({ currentUser, onBack, initialTab }) {
  const { language, t } = useLanguage();
  const role = String(currentUser?.role_code || currentUser?.role || '').toLocaleLowerCase('fr');
  const permissionKey = JSON.stringify(
    Object.entries(currentUser?.permissions || {})
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([module, actions]) => [module, [...actions].sort()])
  );
  const isTrainer = role === 'formateur';
  const can = (module, action = 'read') => (
    currentUser?.permissions?.[module] || []
  ).includes(action);
  // For trainer portal, allow trainers to access their own schedules, learners,
  // attendance and grades even if some permission flags are not present in the
  // user payload. Authorization server/controllers still enforce proper write
  // rules — these flags only control frontend visibility.
  const canReadSchedules = isTrainer || can('emplois-temps');
  const canReadStudents = isTrainer || can('auditeurs');
  const canReadAttendance = isTrainer || can('presences');
  const canCreateAttendance = isTrainer || can('presences', 'create');
  const canUpdateAttendance = isTrainer || can('presences', 'update');
  const canReadAttendanceRoster = canReadStudents || canCreateAttendance || canUpdateAttendance;
  const canReadGrades = isTrainer || can('evaluations');
  const [data, setData] = useState({
    schedules: [], learners: [], attendance: [], grades: [], evaluations: [], criteria: [], trainer: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [section, setSection] = useState(initialTab || 'schedule');
  const [scheduleDate, setScheduleDate] = useState(currentDate);
  const [historyStart, setHistoryStart] = useState('');
  const [historyEnd, setHistoryEnd] = useState('');
  const [historySchedule, setHistorySchedule] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [attendanceSavingId, setAttendanceSavingId] = useState(null);
  const [leaveRequest, setLeaveRequest] = useState(null);
  const [attendanceNotice, setAttendanceNotice] = useToastNotice();
  const [gradeScheduleId, setGradeScheduleId] = useState('');
  const [gradeEvaluationId, setGradeEvaluationId] = useState('');
  const [gradeDrafts, setGradeDrafts] = useState({});
  const [gradeSavingId, setGradeSavingId] = useState(null);

  useEffect(() => {
    let active = true;
    let requestInProgress = false;
    const loadPortal = async (showLoading = false) => {
      if (requestInProgress) return;
      requestInProgress = true;
      if (showLoading) setLoading(true);
      try {
        const response = await authApi.getTrainerPortal(scheduleDate);
        if (active) {
          const nextData = readPortalData(response, t);
          setData(nextData);
          setError('');
          // La date de pointage est toujours celle du jour : elle bascule seule à minuit.
          if (currentDate() !== scheduleDate) setScheduleDate(currentDate());
        }
      } catch (loadError) {
        if (active) setError(loadError.message || t('trainerPortalLoadError'));
      } finally {
        requestInProgress = false;
        if (active && showLoading) setLoading(false);
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') loadPortal();
    };

    loadPortal(true);
    const intervalId = window.setInterval(() => loadPortal(), 10000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [currentUser?.id, permissionKey, scheduleDate, t]);

  const currentSchoolYear = useMemo(() => getCurrentSchoolYear(
    data.schedules.map((schedule) => ({
      id: schedule.id_annee,
      date_debut: schedule.annee_date_debut,
      date_fin: schedule.annee_date_fin,
      statut: schedule.annee_active,
    }))
  ), [data.schedules]);
  const currentYearId = currentSchoolYear?.id;
  const activeAssignments = useMemo(() => data.schedules.filter((schedule) => (
    isActive(schedule.statut)
    && isActive(schedule.groupe_actif)
    && Number(schedule.jour_semaine) === Number(schedule.groupe_jour_semaine)
    && (!currentSchoolYear || String(schedule.id_annee) === String(currentYearId))
  )), [currentSchoolYear, currentYearId, data.schedules]);
  const visibleSchedules = useMemo(() => activeAssignments
      .filter((schedule) => Number(schedule.jour_semaine) === Number(schedule.groupe_jour_semaine))
      .flatMap((schedule) => scheduleOccurrences(schedule, scheduleDate, scheduleDate)),
  [activeAssignments, scheduleDate]);
  const historyDates = [
    ...data.schedules.map((schedule) => schedule.annee_date_debut),
    ...data.attendance.map((record) => record.date_presence),
    ...data.grades.map((grade) => grade.date_evaluation),
  ].filter(Boolean).sort();
  const effectiveHistoryStart = historyStart
    || historyDates[0]
    || firstDayOfCurrentMonth();
  const effectiveHistoryEnd = historyEnd
    || [currentDate(), ...historyDates].sort().at(-1);
  const historyRangeValid = effectiveHistoryStart <= effectiveHistoryEnd;
  const filteredAttendance = useMemo(() => data.attendance.filter((row) => (
    historyRangeValid
    && withinPeriod(row.date_presence, effectiveHistoryStart, effectiveHistoryEnd)
    && (!historySchedule || String(row.id_emploi_du_temps) === historySchedule)
  )), [data.attendance, effectiveHistoryStart, effectiveHistoryEnd, historyRangeValid, historySchedule]);
  const filteredGrades = useMemo(() => data.grades.filter((row) => (
    historyRangeValid
    && withinPeriod(row.date_evaluation, effectiveHistoryStart, effectiveHistoryEnd)
    && (!historySchedule || String(row.id_emploi_du_temps) === historySchedule)
  )), [data.grades, effectiveHistoryStart, effectiveHistoryEnd, historyRangeValid, historySchedule]);
  const renderHistoryFilters = (resultCount) => (
    <section aria-label={t('historyFilters')} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-600">{t('historyResultsCount')
          .replace('{count}', String(resultCount))}</p>
        <button
          type="button"
          onClick={() => { setHistoryStart(''); setHistoryEnd(''); setHistorySchedule(''); }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t('resetFilters')}
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs font-semibold text-slate-700">
          {t('fromDate')}
          <input type="date" value={effectiveHistoryStart} max={effectiveHistoryEnd} onChange={(event) => setHistoryStart(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-700">
          {t('toDate')}
          <input type="date" value={effectiveHistoryEnd} min={effectiveHistoryStart} onChange={(event) => setHistoryEnd(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="grid min-w-56 flex-1 gap-1 text-xs font-semibold text-slate-700">
          {t('group')}
          <SearchableSelect
            value={historySchedule}
            onChange={setHistorySchedule}
            options={data.schedules.map((schedule) => ({
              value: String(schedule.id),
              label: `${schedule.groupe_libelle} · ${schedule.annee_libelle}`,
            }))}
            placeholder={t('allClasses')}
            emptyMessage={t('noSearchResult')}
          />
        </label>
      </div>
    </section>
  );

  // Tous les élèves actifs du formateur pour l'année en cours (indépendant de la date sélectionnée)
  const learnerRoster = useMemo(() => {
    const activeIds = new Set(activeAssignments.map((schedule) => String(schedule.id)));
    return canReadAttendanceRoster ? data.learners.filter((learner) => (
      activeIds.has(String(learner.id_emploi_du_temps))
      && learner.inscription_statut === 'active'
    )) : [];
  }, [canReadAttendanceRoster, data.learners, activeAssignments]);
  const gradeSchedule = activeAssignments.find((schedule) => String(schedule.id) === gradeScheduleId);
  const gradeEvaluations = gradeSchedule
    ? data.evaluations.filter((evaluation) => String(evaluation.id_session) === String(gradeSchedule.id_session))
    : [];
  const selectedGradeEvaluation = gradeEvaluations.find(
    (evaluation) => String(evaluation.id) === gradeEvaluationId
  );
  const gradeCriteria = selectedGradeEvaluation
    ? data.criteria.filter((criterion) => String(criterion.id_evaluation) === String(selectedGradeEvaluation.id))
    : [];
  const { results: gradeResults } = useSessionResults(gradeSchedule?.id_session || '', { trainer: true });
  const gradeLearners = gradeSchedule
    ? learnerRoster.filter((learner) => String(learner.id_emploi_du_temps) === gradeScheduleId)
    : [];

  const roomSchedules = useMemo(() => visibleSchedules.filter((schedule) => (
    !selectedRoom || String(schedule.id_salle) === selectedRoom
  )), [selectedRoom, visibleSchedules]);
  const roomOptions = useMemo(() => [...new Map(visibleSchedules.map((schedule) => [
    String(schedule.id_salle),
    {
      value: String(schedule.id_salle),
      label: `${schedule.salle_code || ''} ${schedule.salle_libelle || ''}`.trim(),
    },
  ])).values()], [visibleSchedules]);
  // Élèves pour le pointage : limités aux emplois du temps visibles ce jour-là
  const attendanceLearnerRoster = useMemo(() => {
    const visibleIds = new Set(roomSchedules.map((schedule) => String(schedule.id)));
    return canReadAttendanceRoster ? data.learners.filter((learner) => (
      visibleIds.has(String(learner.id_emploi_du_temps))
      && learner.inscription_statut === 'active'
    )) : [];
  }, [canReadAttendanceRoster, data.learners, roomSchedules]);
  const scheduleLearners = useMemo(() => selectedSchedule
    ? attendanceLearnerRoster.filter((learner) => String(learner.id_emploi_du_temps) === selectedSchedule)
    : attendanceLearnerRoster, [attendanceLearnerRoster, selectedSchedule]);
  const studentSectionLearners = useMemo(() => selectedSchedule
    ? learnerRoster.filter((learner) => String(learner.id_emploi_du_temps) === selectedSchedule)
    : learnerRoster, [learnerRoster, selectedSchedule]);
  const dateAttendance = useMemo(() => new Map(
    data.attendance.filter((record) => record.date_presence === scheduleDate)
      .map((record) => [String(record.id_inscription), record])
  ), [data.attendance, scheduleDate]);
  const scheduleAttendanceStats = useMemo(() => {
    const stats = {
      total: scheduleLearners.length,
      present: 0,
      absent: 0,
      permissionnaire: 0,
      malade: 0,
      conge: 0,
      notMarked: 0,
    };
    scheduleLearners.forEach((learner) => {
      const status = dateAttendance.get(String(learner.id_inscription))?.statut;
      if (status && Object.hasOwn(stats, status)) stats[status] += 1;
      else stats.notMarked += 1;
    });
    return stats;
  }, [dateAttendance, scheduleLearners]);
  const filteredScheduleLearners = useMemo(() => {
    const term = studentSearch.trim().toLocaleLowerCase(language === 'en' ? 'en' : 'fr');
    return scheduleLearners.filter((learner) => (
      `${learner.auditeur_prenom} ${learner.auditeur_nom} ${learner.auditeur_matricule}`
        .toLocaleLowerCase(language === 'en' ? 'en' : 'fr')
        .includes(term)
    ));
  }, [language, scheduleLearners, studentSearch]);
  const filteredStudentLearners = useMemo(() => {
    const term = studentSearch.trim().toLocaleLowerCase(language === 'en' ? 'en' : 'fr');
    return studentSectionLearners.filter((learner) => (
      `${learner.auditeur_prenom} ${learner.auditeur_nom} ${learner.auditeur_matricule}`
        .toLocaleLowerCase(language === 'en' ? 'en' : 'fr')
        .includes(term)
    ));
  }, [language, studentSearch, studentSectionLearners]);

  const todayScheduleCount = canReadSchedules
    ? activeAssignments.flatMap((schedule) => scheduleOccurrences(schedule, currentDate(), currentDate())).length
    : 0;
  const activeLearnerCount = canReadStudents ? new Set(learnerRoster.map((l) => l.id_auditeur)).size : 0;

  const scheduleLabel = (id) => {
    const schedule = data.schedules.find((item) => String(item.id) === String(id));
    if (!schedule) return '—';
    const parts = [
      schedule.groupe_libelle,
      schedule.niveau_libelle || schedule.formation_libelle,
      schedule.annee_libelle,
    ].filter(Boolean);
    return parts.join(' · ');
  };

  const sections = useMemo(() => [
    { id: 'schedule', label: t('mySchedule'), icon: CalendarDays, allowed: canReadSchedules },
    { id: 'students', label: t('myStudents'), icon: Users, allowed: canReadStudents },
    {
      id: 'attendance-entry',
      label: t('attendanceEntry'),
      icon: ClipboardCheck,
      allowed: canReadAttendanceRoster && (canCreateAttendance || canUpdateAttendance),
    },
    { id: 'attendance', label: t('attendanceHistory'), icon: ClipboardCheck, allowed: isTrainer || canReadAttendance },
    { id: 'grade-entry', label: t('gradeEntry'), icon: Award, allowed: isTrainer },
    { id: 'results', label: 'Résultats', icon: GraduationCap, allowed: isTrainer || canReadGrades },
    { id: 'grades', label: t('gradeHistory'), icon: Award, allowed: isTrainer || canReadGrades },
  ].filter((item) => item.allowed), [
    canReadAttendance,
    canReadGrades,
    canReadSchedules,
    canReadStudents,
    canReadAttendanceRoster,
    canCreateAttendance,
    canUpdateAttendance,
    isTrainer,
    t,
  ]);
  const activeSection = sections.some((item) => item.id === section)
    ? section
    : sections[0]?.id || '';

  const statusLabel = (status) => status === 'active' || isActive(status) ? t('active') : t('inactive');
  const markStudentAttendance = async (learner, status, extra = {}) => {
    if (!status || attendanceSavingId !== null || (!canCreateAttendance && !canUpdateAttendance)) return;
    // Congé et permission : la même fenêtre demande la période avant d'enregistrer.
    if (PERIOD_STATUSES.includes(status) && !extra.conge_date_debut) {
      setLeaveRequest({ learner, status });
      return;
    }
    setAttendanceSavingId(learner.id_inscription);
    setError('');
    setAttendanceNotice('');
    try {
      await authApi.markTrainerPresence({
        id_inscription: learner.id_inscription,
        id_emploi_du_temps: learner.id_emploi_du_temps,
        date_presence: scheduleDate,
        id_annee: learner.id_annee,
        statut: status,
        conge_date_debut: PERIOD_STATUSES.includes(status) ? extra.conge_date_debut : null,
        conge_date_fin: PERIOD_STATUSES.includes(status) ? extra.conge_date_fin : null,
      });
      const learnerSchedule = data.schedules.find(
        (schedule) => String(schedule.id) === String(learner.id_emploi_du_temps)
      );
      setData((current) => ({
        ...current,
        attendance: [
          ...current.attendance.filter((record) => (
            String(record.id_inscription) !== String(learner.id_inscription)
            || record.date_presence !== scheduleDate
          )),
          {
            id_inscription: learner.id_inscription,
            id_emploi_du_temps: learner.id_emploi_du_temps,
            date_presence: scheduleDate,
            statut: status,
            observation: null,
            conge_date_debut: PERIOD_STATUSES.includes(status) ? extra.conge_date_debut : null,
            conge_date_fin: PERIOD_STATUSES.includes(status) ? extra.conge_date_fin : null,
            auditeur_nom: learner.auditeur_nom,
            auditeur_prenom: learner.auditeur_prenom,
            groupe_libelle: learnerSchedule?.groupe_libelle || learner.groupe_libelle,
          },
        ],
      }));
      setAttendanceNotice(t('attendanceSaved'));
    } catch (saveError) {
      setError(saveError.message || t('attendanceSaveError'));
    } finally {
      setAttendanceSavingId(null);
    }
  };
  const markUnmarkedStudentsPresent = async () => {
    const pendingLearners = scheduleLearners.filter(
      (learner) => !dateAttendance.has(String(learner.id_inscription))
    );
    if (!canCreateAttendance || attendanceSavingId !== null || pendingLearners.length === 0) return;

    setAttendanceSavingId('bulk');
    setError('');
    setAttendanceNotice('');
    try {
      // Pointage groupé côté serveur : un auditeur en congé ce jour reste « congé » automatiquement.
      const result = await authApi.markTrainerPresenceBulk({
        date_presence: scheduleDate,
        statut: 'present',
        ids: pendingLearners.map((learner) => learner.id_inscription),
      });
      const response = await authApi.getTrainerPortal(scheduleDate);
      setData(readPortalData(response, t));
      const refused = result?.data?.errors || [];
      setAttendanceNotice(t('attendanceBulkSaved').replace('{count}', String(result?.data?.saved ?? pendingLearners.length)));
      if (refused.length) setError(refused.map((item) => item.error).filter((value, index, all) => all.indexOf(value) === index).join(' '));
    } catch (saveError) {
      setError(saveError.message || t('attendanceSaveError'));
      try {
        const response = await authApi.getTrainerPortal(scheduleDate);
        setData(readPortalData(response, t));
      } catch (refreshError) {
        setError(`${saveError.message || t('attendanceSaveError')} ${refreshError.message || t('trainerPortalLoadError')}`);
      }
    } finally {
      setAttendanceSavingId(null);
    }
  };
  const saveLearnerGrades = async (learner) => {
    const pending = gradeCriteria.flatMap((criterion) => {
      const key = `${learner.id_inscription}:${selectedGradeEvaluation.id}:${criterion.id}`;
      return Object.hasOwn(gradeDrafts, key)
        ? [{ key, criterion, note: gradeDrafts[key] }]
        : [];
    });
    if (!pending.length || gradeSavingId !== null) return;

    const invalid = pending.find(({ criterion, note }) => (
      note !== '' && (!Number.isFinite(Number(note)) || Number(note) < 0 || Number(note) > Number(criterion.bareme))
    ));
    if (invalid) {
      setError(t('gradeOutOfRange').replace('{scale}', String(invalid.criterion.bareme)));
      return;
    }

    setGradeSavingId(String(learner.id_inscription));
    setError('');
    setAttendanceNotice('');
    try {
      for (const item of pending) {
        await authApi.saveTrainerGrade({
          id_evaluation: Number(selectedGradeEvaluation.id),
          id_parametre: Number(item.criterion.id),
          id_inscription: Number(learner.id_inscription),
          note: item.note === '' ? null : Number(item.note),
        });
      }
      setGradeDrafts((current) => {
        const next = { ...current };
        pending.forEach(({ key }) => delete next[key]);
        return next;
      });
      const response = await authApi.getTrainerPortal(scheduleDate);
      setData(readPortalData(response, t));
      setAttendanceNotice(t('gradeSaved'));
    } catch (saveError) {
      setError(saveError.message || t('gradeSaveError'));
    } finally {
      setGradeSavingId(null);
    }
  };
  const dateLabel = (value) => {
    if (!value) return '—';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(date);
  };
  const weekdayLabel = (value) => new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'long' })
    .format(new Date(`${value}T00:00:00`));

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {onBack && <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:text-teal-950">
            <ArrowLeft className="h-3.5 w-3.5" /> {t('backToDashboard')}
          </button>}
          <p className="text-xs font-bold uppercase text-teal-800">{t('trainerSpace')}</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {data.trainer ? `${data.trainer.prenom} ${data.trainer.nom}` : `${currentUser?.prenom || ''} ${currentUser?.nom || ''}`}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{data.trainer?.matricule || currentUser?.formateur_matricule || '—'}</p>
        </div>
        {(activeSection === 'schedule' || activeSection === 'attendance-entry') && (
          <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-900">
            <CalendarDays className="h-4 w-4" />
            <span>{t('today')} : <span className="capitalize">{weekdayLabel(scheduleDate)}</span> {dateLabel(scheduleDate)}</span>
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" title="Actualisation automatique" />
          </div>
        )}
      </header>

      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-950">
        {t('recurringScheduleNotice')}
      </div>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      {attendanceNotice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{attendanceNotice}</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: t('assignedClasses'), value: canReadSchedules ? activeAssignments.length : 0, icon: CalendarDays },
          { label: t('today'), value: todayScheduleCount, icon: BookOpenCheck },
          { label: t('activeStudents'), value: activeLearnerCount, icon: GraduationCap },
          { label: t('attendanceInPeriod'), value: canReadAttendance ? filteredAttendance.length : 0, icon: ClipboardCheck },
          { label: t('gradesInPeriod'), value: canReadGrades ? filteredGrades.length : 0, icon: Award },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></div>
            <span className="rounded-lg bg-teal-50 p-2.5 text-teal-700"><Icon className="h-4 w-4" /></span>
          </div>
        ))}
      </section>

      {leaveRequest && (
        <LeaveDialog
          kind={leaveRequest.status}
          person={`${leaveRequest.learner.auditeur_prenom} ${leaveRequest.learner.auditeur_nom}`}
          date={scheduleDate}
          onClose={() => setLeaveRequest(null)}
          onConfirm={({ debut, fin }) => { const { learner, status } = leaveRequest; setLeaveRequest(null); markStudentAttendance(learner, status, { conge_date_debut: debut, conge_date_fin: fin }); }}
        />
      )}
      <SubTabNav label={t('trainerSpace')} items={sections} active={activeSection} onChange={setSection} />

      {loading ? (
        <div role="status" className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">{t('loading')}</div>
      ) : !sections.length ? (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center text-sm text-amber-900">{t('noTrainerPermissions')}</div>
      ) : (
        <>
          {activeSection === 'schedule' && (
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900">{t('mySchedule')} · {dateLabel(scheduleDate)}</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {visibleSchedules.map((schedule) => (
                  <article key={`${schedule.id}-${schedule.date}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-teal-700">{dateLabel(schedule.date)}</p>
                        <h2 className="mt-1 text-base font-bold text-slate-900">{schedule.groupe_libelle || schedule.groupe_code}</h2>
                        <p className="mt-1 text-xs text-slate-500">{schedule.formation_libelle || schedule.session_libelle} · {schedule.niveau_libelle || '—'}</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">{schedule.annee_libelle}</span>
                    </div>
                    <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                      <p><span className="font-semibold">{t('room')} :</span> {schedule.salle_code || ''} {schedule.salle_libelle || '—'}</p>
                      <p><span className="font-semibold">{t('activeStudents')} :</span> {learnerRoster.filter((learner) => String(learner.id_emploi_du_temps) === String(schedule.id)).length}</p>
                    </div>
                    <button type="button" onClick={() => { setSelectedSchedule(String(schedule.id)); setSection('students'); }} className="mt-4 rounded-lg border border-teal-200 px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50">
                      {t('viewStudents')}
                    </button>
                  </article>
                ))}
              </div>
              {!visibleSchedules.length && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{t('noScheduleOnDate')}</p>}
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-900">{t('classHistory')}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">{t('academicYear')}</th><th className="px-4 py-3">{t('academicPeriod')}</th><th className="px-4 py-3">{t('group')}</th><th className="px-4 py-3">{t('room')}</th><th className="px-4 py-3">{t('status')}</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.schedules.map((schedule) => <tr key={`history-${schedule.id}`}><td className="px-4 py-3">{schedule.annee_libelle}</td><td className="px-4 py-3">{dateLabel(schedule.annee_date_debut)} – {dateLabel(schedule.annee_date_fin)}</td><td className="px-4 py-3 font-semibold">{schedule.groupe_libelle}</td><td className="px-4 py-3">{schedule.salle_libelle || '—'}</td><td className="px-4 py-3">{statusLabel(schedule.statut)}</td></tr>)}
                    </tbody>
                  </table>
                  {!data.schedules.length && <p className="p-6 text-center text-xs text-slate-500">{t('noAssignedClasses')}</p>}
                </div>
              </section>
            </section>
          )}

          {activeSection === 'students' && (
            <section className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <SearchableSelect
                  label={t('group')}
                  value={selectedSchedule}
                  onChange={setSelectedSchedule}
                  options={activeAssignments.map((schedule) => ({
                    value: String(schedule.id),
                    label: [schedule.groupe_libelle, schedule.niveau_libelle || schedule.formation_libelle, schedule.annee_libelle].filter(Boolean).join(' · '),
                  }))}
                  placeholder={t('allClasses')}
                  emptyMessage={t('noSearchResult')}
                />
                <label className="relative block self-end">
                  <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder={t('searchStudents')} className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm" />
                </label>
              </div>
              <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[800px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                    <tr><th className="px-4 py-3">{t('student')}</th><th className="px-4 py-3">{t('group')}</th><th className="px-4 py-3">{t('room')}</th><th className="px-4 py-3">{t('registrationStatus')}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudentLearners.map((learner) => {
                      return (
                        <tr key={learner.id_inscription}>
                          <td className="px-4 py-3"><p className="font-semibold text-slate-900">{learner.auditeur_prenom} {learner.auditeur_nom}</p><p className="mt-1 text-slate-500">{learner.auditeur_matricule || '—'}</p></td>
                          <td className="px-4 py-3 text-slate-700">{scheduleLabel(learner.id_emploi_du_temps)}</td>
                          <td className="px-4 py-3 text-slate-700">{learner.salle_code || ''} {learner.salle_libelle || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{statusLabel(learner.inscription_statut)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!filteredStudentLearners.length && <p className="p-8 text-center text-sm text-slate-500">{studentSectionLearners.length ? t('noLearnerMatches') : t('noStudents')}</p>}
              </section>
            </section>
          )}

          {activeSection === 'attendance-entry' && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{t('attendanceEntry')} · {dateLabel(scheduleDate)}</h2>
                  <p className="mt-1 text-xs text-slate-500">{t('attendanceEntryHint')}</p>
                </div>
                <div className="flex w-full flex-col gap-3 md:max-w-md">
                  <SearchableSelect
                    label={t('room')}
                    value={selectedRoom}
                    onChange={(roomId) => { setSelectedRoom(roomId); setSelectedSchedule(''); }}
                    options={roomOptions}
                    placeholder={t('allAssignedRooms')}
                    emptyMessage={t('noAssignedRoomOnDate')}
                  />
                  <SearchableSelect
                    label={t('group')}
                    value={selectedSchedule}
                    onChange={setSelectedSchedule}
                    options={roomSchedules.map((schedule) => ({
                      value: String(schedule.id),
                      label: `${schedule.groupe_libelle} · ${schedule.salle_code || schedule.salle_libelle}`,
                    }))}
                    placeholder={t('allClasses')}
                    emptyMessage={t('noSearchResult')}
                  />
                  {canCreateAttendance && scheduleAttendanceStats.notMarked > 0 && (
                    <button
                      type="button"
                      onClick={markUnmarkedStudentsPresent}
                      disabled={attendanceSavingId !== null}
                      className="self-start rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60"
                    >
                      {attendanceSavingId === 'bulk' ? t('savingAttendance') : t('markUnmarkedPresent')}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: t('attendanceRosterSize'), value: scheduleAttendanceStats.total, className: 'border-slate-200 bg-white text-slate-700' },
                  { label: t('present'), value: scheduleAttendanceStats.present, className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
                  { label: t('absent'), value: scheduleAttendanceStats.absent, className: 'border-rose-200 bg-rose-50 text-rose-800' },
                  { label: t('attendanceNotMarked'), value: scheduleAttendanceStats.notMarked, className: 'border-amber-200 bg-amber-50 text-amber-800' },
                ].map(({ label, value, className }) => (
                  <div key={label} className={`rounded-xl border p-4 ${className}`}>
                    <p className="text-xs font-semibold">{label}</p>
                    <p className="mt-1 text-2xl font-bold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['permissionnaire', scheduleAttendanceStats.permissionnaire],
                  ['sick', scheduleAttendanceStats.malade],
                  ['leave', scheduleAttendanceStats.conge],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                    {t(label)} : <strong className="text-slate-900">{value}</strong>
                  </div>
                ))}
              </div>

              <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">{t('student')}</th>
                      <th className="px-4 py-3">{t('group')}</th>
                      <th className="px-4 py-3">{t('room')}</th>
                      <th className="px-4 py-3">{t('attendanceStatus')}</th>
                      <th className="px-4 py-3">{t('observation')}</th>
                      <th className="px-4 py-3">{t('markAttendance')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredScheduleLearners.map((learner) => {
                      const attendance = dateAttendance.get(String(learner.id_inscription));
                      return (
                        <tr key={learner.id_inscription} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{learner.auditeur_prenom} {learner.auditeur_nom}</p>
                            <p className="mt-1 text-slate-500">{learner.auditeur_matricule || '—'}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{scheduleLabel(learner.id_emploi_du_temps)}</td>
                          <td className="px-4 py-3 text-slate-700">{learner.salle_code || ''} {learner.salle_libelle || '—'}</td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{attendance ? t(attendance.statut) : t('attendanceNotMarked')}</td>
                          <td className="px-4 py-3 text-slate-600">{observationText(attendance) || '—'}</td>
                          <td className="px-4 py-3">
                            <select
                              aria-label={`${t('markAttendance')}: ${learner.auditeur_prenom} ${learner.auditeur_nom}`}
                              value={attendance?.statut || ''}
                              disabled={attendanceSavingId !== null || (attendance ? !canUpdateAttendance : !canCreateAttendance)}
                              onChange={(event) => markStudentAttendance(learner, event.target.value)}
                              className="min-w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold disabled:bg-slate-100"
                            >
                              <option value="">{t('attendanceNotMarked')}</option>
                              {trainerStatuses.map((option) => <option key={option.value} value={option.value}>{t(option.label)}</option>)}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!filteredScheduleLearners.length && (
                  <p className="p-8 text-center text-sm text-slate-500">
                    {visibleSchedules.length
                      ? t('noLearnersForRoom')
                      : t('noScheduleForAttendanceDate')}
                  </p>
                )}
              </section>
            </section>
          )}

          {activeSection === 'attendance' && (
            <section className="space-y-5">
              <header>
                <h2 className="text-lg font-bold text-slate-900">{t('attendanceHistory')}</h2>
                <p className="mt-1 text-sm text-slate-500">{t('attendanceHistoryDescription')}</p>
              </header>
              {renderHistoryFilters(filteredAttendance.length)}
              {!historyRangeValid && <p role="alert" className="text-sm text-rose-700">{t('dateRangeError')}</p>}

              {/* KPIs de la période */}
              {filteredAttendance.length > 0 && (() => {
                const present = filteredAttendance.filter((r) => r.statut === 'present').length;
                const absent = filteredAttendance.filter((r) => r.statut === 'absent').length;
                const permissionnaire = filteredAttendance.filter((r) => r.statut === 'permissionnaire').length;
                const malade = filteredAttendance.filter((r) => r.statut === 'malade').length;
                const conge = filteredAttendance.filter((r) => r.statut === 'conge').length;
                const total = filteredAttendance.length;
                const rate = total ? Math.round((present / total) * 100) : 0;
                return (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
                      {[
                        { label: t('present'), count: present, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-500' },
                        { label: t('absent'), count: absent, bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', dot: 'bg-rose-500' },
                        { label: t('permissionnaire'), count: permissionnaire, bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-800', dot: 'bg-sky-500' },
                        { label: t('sick'), count: malade, bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', dot: 'bg-orange-500' },
                        { label: t('leave'), count: conge, bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', dot: 'bg-purple-500' },
                      ].map(({ label, count, bg, border, text, dot }) => (
                        <div key={label} className={`rounded-xl border p-4 ${bg} ${border}`}>
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${dot}`} />
                            <p className={`text-[10px] font-bold uppercase ${text}`}>{label}</p>
                          </div>
                          <p className={`mt-2 text-2xl font-bold tabular-nums ${text}`}>{count}</p>
                          <p className={`mt-1 text-xs ${text} opacity-70`}>{total ? Math.round((count / total) * 100) : 0} %</p>
                        </div>
                      ))}
                    </div>
                    {/* Barre de taux de présence */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">Taux de présence global</p>
                        <span className={`rounded-full px-3 py-1 text-sm font-bold ${
                          rate >= 75 ? 'bg-emerald-100 text-emerald-800' : rate >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>{rate} %</span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            rate >= 75 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{present} présences sur {total} pointages enregistrés</p>
                    </div>
                  </>
                );
              })()}

              {/* Tableau enrichi */}
              <AttendanceHistoryTable
                rows={filteredAttendance}
                emptyMessage={t('noAttendanceHistory')}
                dateLabel={dateLabel}
                t={t}
                schedules={data.schedules}
              />
            </section>
          )}

          {activeSection === 'grade-entry' && (
            <section className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  {t('group')}
                  <select
                    value={gradeScheduleId}
                    onChange={(event) => { setGradeScheduleId(event.target.value); setGradeEvaluationId(''); }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                  >
                    <option value="">{t('selectClass')}</option>
                    {activeAssignments.map((schedule) => (
                      <option key={schedule.id} value={String(schedule.id)}>
                        {[schedule.groupe_libelle, schedule.annee_libelle].filter(Boolean).join(' · ')}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  {t('assessment')}
                  <select
                    value={gradeEvaluationId}
                    onChange={(event) => setGradeEvaluationId(event.target.value)}
                    disabled={!gradeSchedule}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-100"
                  >
                    <option value="">{t('selectAssessment')}</option>
                    {gradeEvaluations.map((evaluation) => (
                      <option key={evaluation.id} value={String(evaluation.id)}>
                        Évaluation {evaluation.numero} · {evaluation.libelle} · {dateLabel(evaluation.date_evaluation)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {gradeSchedule && !gradeEvaluations.length && (
                <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  {t('noAssessmentsForClass')}
                </p>
              )}
              {selectedGradeEvaluation && gradeCriteria.length > 0 && (
                <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">{t('student')}</th>
                        {gradeCriteria.map((criterion) => (
                          <th key={criterion.id} className="px-4 py-3">
                            {criterion.libelle} / {criterion.bareme}
                          </th>
                        ))}
                        <th className="px-4 py-3">Moyenne /4</th>
                        <th className="px-4 py-3">Appréciation</th>
                        <th className="px-4 py-3">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gradeLearners.map((learner) => {
                        const pending = gradeCriteria.some((criterion) => Object.hasOwn(
                          gradeDrafts,
                          `${learner.id_inscription}:${selectedGradeEvaluation.id}:${criterion.id}`
                        ));
                        return (
                          <tr key={learner.id_inscription}>
                            <td className="px-4 py-3 font-semibold text-slate-800">
                              {learner.auditeur_prenom} {learner.auditeur_nom}
                              <span className="mt-1 block font-normal text-slate-500">{learner.auditeur_matricule || '—'}</span>
                            </td>
                            {gradeCriteria.map((criterion) => {
                              const key = `${learner.id_inscription}:${selectedGradeEvaluation.id}:${criterion.id}`;
                              const saved = data.grades.find((grade) => (
                                String(grade.id_inscription) === String(learner.id_inscription)
                                && String(grade.id_evaluation) === String(selectedGradeEvaluation.id)
                                && String(grade.id_parametre) === String(criterion.id)
                              ));
                              const value = Object.hasOwn(gradeDrafts, key) ? gradeDrafts[key] : (saved?.note ?? '');
                              return (
                                <td key={criterion.id} className="px-4 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    max={criterion.bareme}
                                    step="0.01"
                                    aria-label={`${criterion.libelle} · ${learner.auditeur_prenom} ${learner.auditeur_nom}`}
                                    value={value}
                                    onChange={(event) => setGradeDrafts((current) => ({
                                      ...current,
                                      [key]: event.target.value,
                                    }))}
                                    className="w-24 rounded-lg border border-slate-300 px-2.5 py-2"
                                  />
                                </td>
                              );
                            })}
                            {(() => {
                              // Moyenne en direct (brouillons compris) — même formule et barème que le serveur.
                              const values = gradeCriteria.map((criterion) => {
                                const key = `${learner.id_inscription}:${selectedGradeEvaluation.id}:${criterion.id}`;
                                const saved = data.grades.find((grade) => String(grade.id_inscription) === String(learner.id_inscription)
                                  && String(grade.id_evaluation) === String(selectedGradeEvaluation.id)
                                  && String(grade.id_parametre) === String(criterion.id));
                                const raw = Object.hasOwn(gradeDrafts, key) ? gradeDrafts[key] : saved?.note;
                                return { value: raw === '' || raw === null || raw === undefined ? null : Number(raw), max: Number(criterion.bareme) };
                              });
                              const complete = values.every((item) => item.value !== null && Number.isFinite(item.value));
                              const average = complete
                                ? calculateAverageOnFour(values.reduce((sum, item) => sum + item.value, 0), values.reduce((sum, item) => sum + item.max, 0))
                                : null;
                              return <>
                                <td className="px-4 py-3 font-bold tabular-nums text-teal-800">{average === null ? '—' : average.toFixed(2)}</td>
                                <td className="px-4 py-3"><AppreciationBadge appreciation={appreciationFor(average, gradeResults?.bareme)} /></td>
                              </>;
                            })()}
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => saveLearnerGrades(learner)}
                                disabled={!pending || gradeSavingId !== null}
                                className="rounded-lg bg-teal-700 px-3 py-2 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {gradeSavingId === String(learner.id_inscription) ? t('savingGrade') : t('save')}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!gradeLearners.length && (
                    <p className="p-8 text-center text-sm text-slate-500">{t('noStudents')}</p>
                  )}
                </section>
              )}
              {selectedGradeEvaluation && !gradeCriteria.length && (
                <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  {t('noCriteriaForAssessment')}
                </p>
              )}
            </section>
          )}

          {activeSection === 'results' && <MesResultats schedules={activeAssignments} />}

          {activeSection === 'grades' && (
            <section className="space-y-5">
              <header>
                <h2 className="text-lg font-bold text-slate-900">{t('gradeHistory')}</h2>
                <p className="mt-1 text-sm text-slate-500">{t('gradeHistoryDescription')}</p>
              </header>
              {renderHistoryFilters(filteredGrades.length)}
              {!historyRangeValid && <p role="alert" className="text-sm text-rose-700">{t('dateRangeError')}</p>}

              {/* KPIs notes */}
              {filteredGrades.length > 0 && (() => {
                const evaluations = [...new Set(filteredGrades.map((r) => r.evaluation_libelle).filter(Boolean))];
                const students = [...new Set(filteredGrades.map((r) => `${r.auditeur_prenom} ${r.auditeur_nom}`).filter(Boolean))];
                return (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                      <p className="text-[10px] font-bold uppercase text-teal-700">Notes enregistrées</p>
                      <p className="mt-2 text-2xl font-bold tabular-nums text-teal-900">{filteredGrades.length}</p>
                    </div>
                    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                      <p className="text-[10px] font-bold uppercase text-violet-700">Évaluations</p>
                      <p className="mt-2 text-2xl font-bold tabular-nums text-violet-900">{evaluations.length}</p>
                      {evaluations.length <= 3 && <p className="mt-1 text-xs text-violet-600 truncate">{evaluations.join(', ')}</p>}
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-[10px] font-bold uppercase text-amber-700">Auditeurs évalués</p>
                      <p className="mt-2 text-2xl font-bold tabular-nums text-amber-900">{students.length}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Tableau enrichi des notes */}
              <GradesHistoryTable
                rows={filteredGrades}
                emptyMessage={t('noGradeHistory')}
                dateLabel={dateLabel}
                t={t}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}

const ATTENDANCE_STATUS_STYLES = {
  present: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Présent' },
  absent: { bg: 'bg-rose-100', text: 'text-rose-800', label: 'Absent' },
  permissionnaire: { bg: 'bg-sky-100', text: 'text-sky-800', label: 'Permissionnaire' },
  malade: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Malade' },
  conge: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Congé' },
};

function StatusBadge({ statut }) {
  const style = ATTENDANCE_STATUS_STYLES[statut];
  if (!style) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function AttendanceHistoryTable({ rows, emptyMessage, dateLabel }) {
  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-700">{emptyMessage}</p>
        <p className="mt-1 text-xs text-slate-500">Ajustez la période ou les filtres pour voir les données.</p>
      </div>
    );
  }

  // Grouper par groupe
  const byGroup = rows.reduce((acc, row) => {
    const key = row.groupe_libelle || '—';
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(byGroup).map(([groupName, groupRows]) => {
        const presentCount = groupRows.filter((r) => r.statut === 'present').length;
        const rate = groupRows.length ? Math.round((presentCount / groupRows.length) * 100) : 0;
        return (
          <section key={groupName} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{groupName}</h3>
                <p className="mt-0.5 text-xs text-slate-500">{groupRows.length} pointage{groupRows.length > 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden w-24 sm:block">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${
                        rate >= 75 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  rate >= 75 ? 'bg-emerald-100 text-emerald-800' : rate >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                }`}>{rate} %</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-slate-50/60 text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Auditeur</th>
                    <th className="px-4 py-3 font-semibold">Statut</th>
                    <th className="px-4 py-3 font-semibold">Observation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {groupRows
                    .slice()
                    .sort((a, b) => b.date_presence?.localeCompare(a.date_presence || '') || 0)
                    .map((row, index) => (
                      <tr
                        key={row.id || `${row.id_inscription}-${row.date_presence}-${index}`}
                        className="hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{dateLabel(row.date_presence)}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">
                            {row.auditeur_prenom} {row.auditeur_nom}
                          </p>
                          {row.auditeur_matricule && (
                            <p className="mt-0.5 font-mono text-slate-400">{row.auditeur_matricule}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge statut={row.statut} />
                        </td>
                        <td className="max-w-56 px-4 py-3 text-slate-500">
                          {observationText(row) || <span className="italic text-slate-300">Aucune</span>}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function GradesHistoryTable({ rows, emptyMessage, dateLabel }) {
  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-700">{emptyMessage}</p>
        <p className="mt-1 text-xs text-slate-500">Aucune note enregistrée sur cette période. Ajustez les filtres.</p>
      </div>
    );
  }

  // Grouper par évaluation
  const byEvaluation = rows.reduce((acc, row) => {
    const key = row.evaluation_libelle || 'Évaluation';
    if (!acc[key]) acc[key] = { rows: [], date: row.date_evaluation, groupe: row.groupe_libelle };
    acc[key].rows.push(row);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(byEvaluation).map(([evalName, evalData]) => {
        const gradedRows = evalData.rows.filter((row) => row.note !== null && row.note !== undefined && row.note !== '');
        const totalBareme = gradedRows.reduce((sum, row) => sum + (Number(row.bareme) || 4), 0);
        const avg = calculateAverageOnFour(
          gradedRows.reduce((sum, row) => sum + Number(row.note), 0),
          totalBareme,
        );
        return (
          <section key={evalName} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{evalName}</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {evalData.groupe || '—'} · {dateLabel(evalData.date)} · {evalData.rows.length} note{evalData.rows.length > 1 ? 's' : ''}
                </p>
              </div>
              {avg !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Moy.</span>
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${
                    avg >= 3 ? 'bg-emerald-100 text-emerald-800'
                    : avg >= 2 ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                  }`}>{avg.toFixed(2)} /4</span>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-xs">
                <thead className="bg-slate-50/60 text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Auditeur</th>
                    <th className="px-4 py-3 font-semibold">Critère</th>
                    <th className="px-4 py-3 font-semibold">Note</th>
                    <th className="px-4 py-3 font-semibold">Barème</th>
                    <th className="px-4 py-3 font-semibold">Résultat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {evalData.rows.map((row, index) => {
                    const note = Number(row.note);
                    const bareme = Number(row.bareme) || 4;
                    const pct = !Number.isNaN(note) ? Math.round((note / bareme) * 100) : null;
                    return (
                      <tr
                        key={row.id_note || `${row.id_inscription}-${row.critere_libelle}-${index}`}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{row.auditeur_prenom} {row.auditeur_nom}</p>
                          {row.auditeur_matricule && <p className="mt-0.5 font-mono text-slate-400">{row.auditeur_matricule}</p>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{row.critere_libelle || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-lg font-bold text-slate-900">{row.note ?? <span className="text-slate-300">—</span>}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{row.bareme ?? '—'}</td>
                        <td className="px-4 py-3">
                          {pct !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className={`h-full rounded-full ${
                                    pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className={`font-semibold ${
                                pct >= 75 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-700' : 'text-rose-700'
                              }`}>{pct} %</span>
                            </div>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
