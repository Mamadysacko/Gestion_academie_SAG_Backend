import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, BarChart3, CalendarDays, CalendarRange, Plus, RefreshCw, Users, X } from 'lucide-react';
import { emploisApi } from '../../config/apiService';
import { getCurrentSchoolYear } from '../../utils/schoolYear';
import { loadPlanningData } from '../planningData';
import { jourLabel, normalizeRows } from './emploisHelpers';
import { useConfirm } from '../../composant/confirmContext';
import { useLiveRefresh } from '../../composant/useLiveRefresh';
import PlanningGeneral from './PlanningGeneral';
import PlanningGroupe from './PlanningGroupe';
import Calendrier from './Calendrier';
import NouvelleAffectation from './NouvelleAffectation';
import Statistiques from './Statistiques';
import { useToastNotice } from '../../composant/toastContext';

const emptyData = {
  annees_scolaires: [], sessions: [], groupes: [], niveaux: [], types_formations: [],
  formateurs: [], salles: [], emplois_du_temps: [], inscriptions: [],
};

export default function EmploisDuTemps({ onBack, currentUser }) {
  const isAdmin = currentUser?.role_code === 'admin' || currentUser?.role === 'admin';
  const isTrainer = (currentUser?.role_code || currentUser?.role) === 'formateur';
  const can = (action) => isAdmin || (currentUser?.permissions?.['emplois-temps'] || []).includes(action);
  const canRead = can('read');
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('calendrier');
  const [data, setData] = useState(emptyData);
  const [selectedYear, setSelectedYear] = useState('');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(canRead);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useToastNotice();

  const fetchData = useCallback(async () => {
    const planning = await loadPlanningData(currentUser);
    const normalized = Object.fromEntries(
      Object.entries(planning).map(([key, response]) => [key, normalizeRows({ data: response })])
    );
    const normalizedYears = normalized.annees_scolaires || [];
    const active = getCurrentSchoolYear(normalizedYears);
    return {
      data: { ...emptyData, ...normalized, annees_scolaires: normalizedYears },
      initialYear: String(active?.id || normalizedYears[0]?.id || ''),
    };
  }, [currentUser]);

  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    if (!silent) setError('');
    try {
      const result = await fetchData();
      setData(result.data);
      setSelectedYear((current) => current || result.initialYear);
    } catch (loadError) {
      if (!silent) setError(loadError.message || 'Impossible de charger les emplois du temps et leurs référentiels.');
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  useEffect(() => {
    if (!canRead) return undefined;
    let isMounted = true;
    fetchData()
      .then((result) => {
        if (!isMounted) return;
        setData(result.data);
        setSelectedYear((current) => current || result.initialYear);
      })
      .catch((loadError) => {
        if (isMounted) setError(loadError.message || 'Impossible de charger les emplois du temps et leurs référentiels.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [canRead, fetchData]);
  useLiveRefresh(() => fetchData().then((result) => setData(result.data)).catch(() => {}), { enabled: canRead, intervalMs: 60000 });

  const yearSchedules = useMemo(
    () => data.emplois_du_temps.filter((item) => !selectedYear || Number(item.id_annee) === Number(selectedYear)),
    [data.emplois_du_temps, selectedYear]
  );
  const year = data.annees_scolaires.find((item) => String(item.id) === selectedYear);

  const handleSave = async (payload, editingId) => {
    const group = data.groupes.find((item) => Number(item.id) === Number(payload.id_groupe));
    const room = data.salles.find((item) => Number(item.id) === Number(payload.id_salle));
    const trainer = data.formateurs.find((item) => Number(item.id) === Number(payload.id_formateur));
    if (!(await confirm({
      title: editingId ? 'Modifier cette affectation ?' : 'Créer cette affectation ?',
      message: `Groupe ${group?.code || ''} · ${group?.libelle || ''}\nSalle ${room?.code || ''} · formateur ${trainer?.prenom || ''} ${trainer?.nom || ''}\nChaque ${jourLabel(payload.jour_semaine).toLocaleLowerCase('fr')}`,
      tone: editingId ? 'warning' : 'primary',
    }))) return;
    setSaving(true);
    setError('');
    try {
      if (editingId) await emploisApi.update(editingId, payload);
      else await emploisApi.create(payload);
      await reload({ silent: true });
      setEditing(null);
      setActiveTab('planning_general');
      setNotice(editingId ? 'L’affectation a été mise à jour.' : 'L’affectation a été enregistrée.');
      window.setTimeout(() => setNotice(''), 3500);
    } catch (saveError) {
      setError(saveError.message || 'Impossible d’enregistrer cette affectation.');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (schedule) => {
    const nextStatus = Number(schedule.statut) === 1 ? 0 : 1;
    const promptText = nextStatus
      ? 'Réactiver cette affectation ? Les conflits de salle, formateur et groupe seront vérifiés.'
      : 'Désactiver cette affectation ? Les inscriptions et présences historiques seront conservées.';
    if (!(await confirm({ title: nextStatus ? 'Réactiver le créneau ?' : 'Désactiver le créneau ?', message: promptText, tone: 'warning' }))) return;
    setError('');
    try {
      await emploisApi.update(schedule.id, {
        id_annee: schedule.id_annee,
        id_groupe: schedule.id_groupe,
        id_salle: schedule.id_salle,
        id_formateur: schedule.id_formateur,
        jour_semaine: schedule.jour_semaine,
        statut: nextStatus,
      });
      await reload({ silent: true });
      setNotice(nextStatus ? 'Affectation réactivée.' : 'Affectation désactivée.');
      window.setTimeout(() => setNotice(''), 3500);
    } catch (statusError) {
      setError(statusError.message || 'Impossible de modifier le statut de cette affectation.');
    }
  };

  const deleteSchedule = async (schedule) => {
    if (!(await confirm({ title: 'Supprimer cette affectation ?', message: `${schedule.groupe_code || ''} · ${schedule.salle_code || ''} · ${jourLabel(schedule.jour_semaine)}
Si des inscriptions ou présences y sont liées, la base refusera la suppression.`, tone: 'danger' }))) return;
    setError('');
    try {
      await emploisApi.delete(schedule.id);
      await reload({ silent: true });
      setNotice('Affectation supprimée.');
      window.setTimeout(() => setNotice(''), 3500);
    } catch (deleteError) {
      setError(deleteError.message || 'Impossible de supprimer cette affectation. Désactivez-la pour conserver son historique.');
    }
  };

  const tabs = [
    { id: 'planning_general', label: 'Vue générale', icon: CalendarDays },
    { id: 'groupe', label: 'Par groupe', icon: Users },
    { id: 'calendrier', label: 'Calendrier', icon: CalendarRange },
    { id: 'statistiques', label: 'Indicateurs', icon: BarChart3 },
  ];

  const viewProps = {
    data: { ...data, emplois_du_temps: yearSchedules },
    year,
    canUpdate: can('update'),
    canDelete: can('delete'),
    onEdit: (schedule) => {
      setEditing(schedule);
      setActiveTab('affectation');
      setError('');
    },
    onToggleStatus: changeStatus,
    onDelete: deleteSchedule,
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <header className="mb-6 border-b border-slate-200 pb-5">
        {onBack && <button type="button" onClick={onBack} className="mb-3 text-sm font-semibold text-teal-800 hover:underline">← Retour au tableau de bord</button>}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Pilotage académique</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Emplois du temps</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">Planification hebdomadaire par année, groupe, formateur et salle, conforme aux créneaux enregistrés en base.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold text-slate-600" htmlFor="edt-year">Année scolaire</label>
            <select id="edt-year" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} disabled={loading || !data.annees_scolaires.length} className="min-w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800">
              {!data.annees_scolaires.length && <option value="">Aucune année disponible</option>}
              {data.annees_scolaires.map((item) => <option key={item.id} value={item.id}>{item.libelle}{Number(item.statut) === 1 ? ' · active' : ''}</option>)}
            </select>
            {can('create') && (
              <button type="button" onClick={() => { setEditing(null); setActiveTab('affectation'); setError(''); }} className="inline-flex items-center gap-2 rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900">
                <Plus size={16} /> Nouvelle affectation
              </button>
            )}
            <button type="button" onClick={reload} disabled={loading} aria-label="Actualiser" className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-50"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /></button>
          </div>
        </div>
      </header>

      {!canRead && <div role="alert" className="mb-5 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Votre rôle ne dispose pas de la permission de lecture des emplois du temps.</div>}
      {error && <div role="alert" className="mb-4 flex items-start gap-3 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle size={18} className="mt-0.5 shrink-0" /><span className="flex-1">{error}</span><button type="button" onClick={() => setError('')} aria-label="Fermer le message"><X size={16} /></button></div>}
      {notice && <div role="status" className="mb-4 border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

      <nav aria-label="Vues des emplois du temps" className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => { setActiveTab(id); setEditing(null); }} aria-current={activeTab === id ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === id ? 'border-teal-700 text-teal-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Icon size={16} />{label}
          </button>
        ))}
        {activeTab === 'affectation' && <span className="inline-flex shrink-0 items-center gap-2 border-b-2 border-teal-700 px-4 py-3 text-sm font-semibold text-teal-900"><Plus size={16} />{editing ? 'Modifier' : 'Nouvelle affectation'}</span>}
      </nav>

      {loading ? (
        <div role="status" className="border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Chargement des données de l’académie…</div>
      ) : canRead && (
        <section className="min-h-[420px]">
          {activeTab === 'planning_general' && <PlanningGeneral {...viewProps} />}
          {activeTab === 'groupe' && <PlanningGroupe {...viewProps} />}
          {activeTab === 'calendrier' && <Calendrier data={viewProps.data} isTrainer={isTrainer} />}
          {activeTab === 'statistiques' && <Statistiques {...viewProps} />}
          {activeTab === 'affectation' && (
            <NouvelleAffectation
              key={`${editing?.id || 'new'}-${selectedYear}`}
              years={data.annees_scolaires}
              groups={data.groupes}
              sessions={data.sessions}
              trainers={data.formateurs}
              rooms={data.salles}
              schedules={data.emplois_du_temps}
              enrollments={data.inscriptions}
              defaultYearId={selectedYear}
              assignment={editing}
              saving={saving}
              onCancel={() => { setEditing(null); setActiveTab('planning_general'); }}
              onSubmit={handleSave}
            />
          )}
        </section>
      )}
    </main>
  );
}
