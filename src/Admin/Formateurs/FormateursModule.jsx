import { useCallback, useEffect, useState } from 'react';
import { useLiveRefresh } from '../../composant/useLiveRefresh';
import { AlertTriangle, CalendarDays, Users, X } from 'lucide-react';
import { getScheduleDetails, getTrainerConflicts, getWorkloadByTrainer } from './formateursHelpers';
import { ScheduleDialog, TrainerDialog, TrainerMetric } from './FormateursComponents';
import ListeFormateurs from './ListeFormateurs';
import AffectationsFormateur from './AffectationsFormateur';
import EmploiDuTemps from './EmploiDuTemps';
import ChargeTravail from './ChargeTravail';
import { emploisApi, formateursApi } from '../../config/apiService';
import { loadPlanningData } from '../planningData';
import { getCurrentSchoolYear } from '../../utils/schoolYear';
import { useConfirm } from '../../composant/confirmContext';
import { useToastNotice } from '../../composant/toastContext';

const tabs = [
  { id: 'liste', label: 'Liste des formateurs', icon: Users },
  { id: 'affectations', label: 'Affectations groupe / session', icon: CalendarDays },
  { id: 'emploi', label: 'Emploi du temps', icon: CalendarDays },
  { id: 'charge', label: 'Créneaux par formateur', icon: CalendarDays },
];

const emptyData = {
  annees_scolaires: [], sessions: [], groupes: [], niveaux: [], types_formations: [],
  formateurs: [], salles: [], emplois_du_temps: [], inscriptions: [], inscriptionsAccessibles: false, presences: [],
};

export default function FormateursModule({ onBack, currentUser, onCreateUser, canCreateUser = false }) {
  const confirm = useConfirm();
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('liste');
  const [trainerDialog, setTrainerDialog] = useState(null);
  const [scheduleDialog, setScheduleDialog] = useState(null);
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useToastNotice();

  const reloadData = useCallback(async () => {
    const nextData = await loadPlanningData(currentUser);
    setData(nextData);
  }, [currentUser]);

  useLiveRefresh(() => reloadData().catch(() => {}), { intervalMs: 60000 });

  useEffect(() => {
    let active = true;
    loadPlanningData(currentUser)
      .then((nextData) => {
        if (active) setData(nextData);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Impossible de charger les données des formateurs et des emplois du temps.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [currentUser]);

  const hasAccess = (module, action) => currentUser?.role_code === 'admin'
    || currentUser?.role === 'admin'
    || (currentUser?.permissions?.[module] || []).includes(action);
  const canUsePlanning = ['emplois-temps', 'organisation-pedagogique', 'salles', 'formateurs']
    .every((module) => hasAccess(module, 'read'));

  const activeYear = getCurrentSchoolYear(data.annees_scolaires);
  const activeSchedules = data.emplois_du_temps.filter((schedule) => activeYear && schedule.id_annee === activeYear.id);
  const schedules = activeSchedules.map((schedule) => getScheduleDetails(data, schedule));
  const conflicts = getTrainerConflicts(data, activeSchedules);
  const workloads = getWorkloadByTrainer(data, activeSchedules);
  const activeCount = data.formateurs.filter((trainer) => Number(trainer.actif) === 1).length;
  const busyCount = new Set(activeSchedules.map((schedule) => schedule.id_formateur)).size;
  const activeGroupCount = new Set(activeSchedules.map((schedule) => schedule.id_groupe)).size;

  const saveTrainer = async (record) => {
    try {
      const payload = {
        matricule: record.matricule.trim().toLocaleUpperCase('fr'),
        nom: record.nom.trim(),
        prenom: record.prenom.trim(),
        telephone: record.telephone?.trim() || null,
        email: record.email?.trim().toLocaleLowerCase('fr') || null,
        id_salle: record.id_salle ? Number(record.id_salle) : null,
        actif: Number(record.actif) === 1 ? 1 : 0,
      };
      if (record.mot_de_passe_temporaire) payload.password = record.mot_de_passe_temporaire;
      if (!record.id) throw new Error('Les nouveaux formateurs doivent être créés depuis Utilisateurs & rôles.');
      await formateursApi.update(record.id, payload);
      await reloadData();
      setTrainerDialog(null);
      setError('');
      setNotice(`Formateur ${record.id ? 'mis à jour' : 'créé'} dans la base de données.`);
    } catch (saveError) {
      setError(saveError.message || 'Le compte formateur n’a pas pu être enregistré.');
    }
  };

  const toggleStatus = async (trainer) => {
    const willActivate = Number(trainer.actif) !== 1;
    const message = willActivate
      ? `Activer le compte de ${trainer.prenom} ${trainer.nom} ?`
      : `Désactiver le compte de ${trainer.prenom} ${trainer.nom} ? Ses créneaux existants seront conservés.`;
    if (!await confirm(message)) return;
    try {
      await formateursApi.toggleActif(trainer.id);
      await reloadData();
      setError('');
      setNotice(`Formateur ${willActivate ? 'activé' : 'désactivé'} dans la base de données.`);
    } catch (statusError) {
      setError(statusError.message || 'Le statut n’a pas pu être modifié.');
    }
  };

  const saveSchedule = async (record) => {
    try {
      const payload = {
        id_annee: Number(record.id_annee),
        id_groupe: Number(record.id_groupe),
        id_salle: Number(record.id_salle),
        id_formateur: Number(record.id_formateur),
        jour_semaine: Number(record.jour_semaine),
        statut: Number(record.statut ?? 1),
      };
      if (record.id) await emploisApi.update(record.id, payload);
      else await emploisApi.create(payload);
      await reloadData();
      setScheduleDialog(null);
      setError('');
      setNotice(`Créneau ${record.id ? 'modifié' : 'ajouté'} dans l’emploi du temps partagé.`);
    } catch (scheduleError) {
      setError(scheduleError.message || 'La séance n’a pas pu être enregistrée.');
    }
  };

  const removeSchedule = async (schedule) => {
    if (!await confirm(`Supprimer la séance de ${schedule.trainer?.prenom} ${schedule.trainer?.nom} · ${schedule.group?.libelle} ?`)) return;
    try {
      await emploisApi.delete(schedule.id);
      await reloadData();
      setError('');
      setNotice('Créneau supprimé de la base de données.');
    } catch (deleteError) {
      setError(deleteError.message || 'La séance est toujours référencée et ne peut être supprimée.');
    }
  };

  const removeTrainer = async (trainer) => {
    if (!await confirm(`Supprimer définitivement le formateur ${trainer.prenom} ${trainer.nom} ? Cette action est impossible s’il est associé à un compte utilisateur ou à un emploi du temps.`)) return;
    try {
      await formateursApi.delete(trainer.id);
      await reloadData();
      setError('');
      setNotice('Formateur supprimé.');
    } catch (deleteError) {
      setError(deleteError.message || 'Le formateur n’a pas pu être supprimé.');
    }
  };

  const openTrainerSchedule = (trainer) => {
    setSelectedTrainer(String(trainer.id));
    setActiveTab('emploi');
  };

  return <div className="space-y-6 pb-10">
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between"><div><button type="button" onClick={onBack} className="mb-3 text-xs font-semibold text-teal-800 hover:text-teal-950">← Tableau de bord</button><p className="text-xs font-bold uppercase text-teal-800">Administration pédagogique</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Gestion des formateurs</h1><p className="mt-1 text-sm text-slate-500">Gestion des profils, affectations et emploi du temps · {activeYear?.libelle || (hasAccess('organisation-pedagogique', 'read') ? 'aucune année active' : 'année non accessible')}</p></div>{canCreateUser && <button type="button" onClick={onCreateUser} className="bg-teal-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-900">Créer un nouvel utilisateur formateur</button>}</header>
    <div className="border-l-2 border-sky-600 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-950">Chaque formateur appartient à une seule salle et y vient tous les jours. Les auditeurs changent selon le jour. Un groupe peut occuper plusieurs salles : à l’inscription, la salle se remplit puis bascule automatiquement.</div>
    {!loading && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><TrainerMetric label="Comptes formateurs" value={data.formateurs.length} tone="slate" /><TrainerMetric label="Comptes actifs" value={activeCount} tone="green" /><TrainerMetric label="Formateurs planifiés" value={canUsePlanning ? busyCount : '—'} /><TrainerMetric label="Groupes planifiés" value={canUsePlanning ? activeGroupCount : '—'} tone="teal" detail={canUsePlanning ? 'Année scolaire sélectionnée' : 'Droits de planning requis'} /></section>}
    {loading && <div role="status" className="border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Chargement des formateurs, groupes et emplois du temps…</div>}
    {!loading && !error && hasAccess('organisation-pedagogique', 'read') && !activeYear && <div role="status" className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Aucune année scolaire n’est enregistrée. Ajoutez une année avant de planifier un créneau.</div>}
    {canUsePlanning && conflicts.length > 0 && <section className="border border-rose-200 bg-rose-50 p-4"><div className="flex items-center gap-2 text-sm font-bold text-rose-900"><AlertTriangle className="h-4 w-4" />{conflicts.length} conflit(s) détecté(s)</div><p className="mt-1 text-xs text-rose-800">Les contraintes de disponibilité de la base empêchent les doubles réservations du formateur ou de la salle le même jour.</p></section>}
    {error && <div role="alert" className="flex items-start justify-between gap-3 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Fermer" className="shrink-0"><X className="h-4 w-4" /></button></div>}
    {notice && <div role="status" className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
    {!loading && hasAccess('formateurs', 'read') && <nav aria-label="Sections Formateurs" className="flex gap-1 overflow-x-auto border-b border-slate-200">{tabs.filter((tab) => tab.id === 'liste' || canUsePlanning).map((tab) => { const Icon = tab.icon; const active = activeTab === tab.id; return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} aria-current={active ? 'page' : undefined} className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-xs font-semibold ${active ? 'border-teal-700 text-teal-900' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'}`}><Icon className="h-4 w-4" />{tab.label}</button>; })}</nav>}
    {!loading && !hasAccess('formateurs', 'read') && <div role="alert" className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Vous n’avez pas la permission de consulter les formateurs.</div>}
    {!loading && activeTab === 'liste' && hasAccess('formateurs', 'read') && <ListeFormateurs trainers={data.formateurs} workloads={workloads} onEdit={(trainer) => { setError(''); setTrainerDialog({ trainer }); }} onViewSchedule={openTrainerSchedule} onToggleStatus={toggleStatus} onDelete={removeTrainer} canUpdate={hasAccess('formateurs', 'update')} canDelete={hasAccess('formateurs', 'delete')} canReadSchedule={canUsePlanning} />}
    {!loading && activeTab === 'affectations' && canUsePlanning && <AffectationsFormateur schedules={schedules} trainers={data.formateurs} groups={data.groupes} onNew={() => { setError(''); setScheduleDialog({ schedule: null }); }} onEdit={(schedule) => { setError(''); setScheduleDialog({ schedule }); }} onDelete={removeSchedule} canCreate={hasAccess('emplois-temps', 'create')} canUpdate={hasAccess('emplois-temps', 'update')} canDelete={hasAccess('emplois-temps', 'delete')} />}
    {!loading && activeTab === 'emploi' && canUsePlanning && <EmploiDuTemps data={data} schedules={schedules} trainers={data.formateurs} groups={data.groupes} rooms={data.salles} selectedTrainer={selectedTrainer} onNew={() => { setError(''); setScheduleDialog({ schedule: null }); }} onEdit={(schedule) => { setError(''); setScheduleDialog({ schedule }); }} onDelete={removeSchedule} canCreate={hasAccess('emplois-temps', 'create')} canUpdate={hasAccess('emplois-temps', 'update')} canDelete={hasAccess('emplois-temps', 'delete')} />}
    {!loading && activeTab === 'charge' && canUsePlanning && <ChargeTravail data={data} schedules={activeSchedules} />}
    {trainerDialog && <TrainerDialog key={`${trainerDialog.trainer?.id ?? 'new'}`} trainer={trainerDialog.trainer} rooms={data.salles} trainers={data.formateurs} error={error} onClose={() => setTrainerDialog(null)} onSave={saveTrainer} />}
    {scheduleDialog && <ScheduleDialog key={`${scheduleDialog.schedule?.id ?? 'new'}`} schedule={scheduleDialog.schedule} data={data} error={error} onClose={() => setScheduleDialog(null)} onSave={saveSchedule} />}
  </div>;
}