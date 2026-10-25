import { useCallback, useEffect, useState } from 'react';
import { useLiveRefresh } from '../../composant/useLiveRefresh';
import { Building2, CalendarDays, ChartNoAxesCombined, MapPinned, Plus } from 'lucide-react';
import { getRoomOccupancy, WEEKDAYS } from './sallesHelpers';
import { AssignmentFormDialog, RoomFormDialog, RoomMetric } from './SallesComponents';
import MultiAssignmentDialog from './AffectationMultiple';
import ListeSalles from './ListeSalles';
import AffectationsSalles from './AffectationsSalles';
import DisponibiliteSalles from './DisponibiliteSalles';
import StatistiquesSalles from './StatistiquesSalles';
import { emploisApi, formateursApi, sallesApi } from '../../config/apiService';
import { useConfirm } from '../../composant/confirmContext';
import { loadPlanningData } from '../planningData';
import { getCurrentSchoolYear } from '../../utils/schoolYear';
import { useToastNotice } from '../../composant/toastContext';
import SubTabNav from '../../composant/SubTabNav';
import PrerequisiteBanner from '../../aide/Prerequisites';
import { usePrerequisites } from '../../aide/usePrerequisites';

const tabs = [
  { id: 'salles', label: 'Salles', icon: Building2 },
  { id: 'affectations', label: 'Affectations groupe-salle', icon: CalendarDays },
  { id: 'disponibilite', label: 'Disponibilité', icon: MapPinned },
  { id: 'statistiques', label: 'Statistiques', icon: ChartNoAxesCombined },
];

const emptyData = {
  annees_scolaires: [], sessions: [], groupes: [], niveaux: [], types_formations: [],
  formateurs: [], salles: [], emplois_du_temps: [], inscriptions: [], inscriptionsAccessibles: false, presences: [],
};

export default function SallesModule({ onBack, currentUser, initialTab }) {
  const confirm = useConfirm();
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab || 'salles');
  const [roomDialog, setRoomDialog] = useState(null);
  const [assignmentDialog, setAssignmentDialog] = useState(null);
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
        if (active) setError(loadError.message || 'Impossible de charger les salles et les créneaux.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [currentUser]);

  const hasAccess = (module, action) => currentUser?.role_code === 'admin'
    || currentUser?.role === 'admin'
    || (currentUser?.permissions?.[module] || []).includes(action);

  const prerequisites = usePrerequisites('salles/affectations', currentUser);
  const roomPrerequisites = usePrerequisites('salles/salles', currentUser);
  const activeYear = getCurrentSchoolYear(data.annees_scolaires);
  const canReadPlanning = ['emplois-temps', 'organisation-pedagogique', 'salles', 'formateurs']
    .every((module) => hasAccess(module, 'read'));
  const canReadStatistics = canReadPlanning && hasAccess('auditeurs', 'read');
  const yearSchedules = data.emplois_du_temps.filter((schedule) => activeYear && schedule.id_annee === activeYear.id);
  const assignments = yearSchedules.map((schedule) => {
    const group = data.groupes.find((item) => item.id === schedule.id_groupe);
    const session = data.sessions.find((item) => item.id === group?.id_session);
    const room = data.salles.find((item) => item.id === schedule.id_salle);
    const trainer = data.formateurs.find((item) => item.id === schedule.id_formateur);
    const activeLearners = data.inscriptionsAccessibles
      ? data.inscriptions.filter((item) => item.id_emploi_du_temps === schedule.id && item.statut === 'active').length
      : null;
    return { ...schedule, group, session, room, trainer, activeLearners };
  });

  const rooms = data.salles.map((room) => {
    const occupancy = getRoomOccupancy(room, yearSchedules, data.groupes, data.inscriptions);
    const trainer = data.formateurs.find((item) => Number(item.id_salle) === Number(room.id));
    return {
      ...room,
      ...occupancy,
      trainer,
      trainerLabel: trainer ? `${trainer.prenom} ${trainer.nom}` : 'Sans formateur',
      activeLearners: data.inscriptionsAccessibles ? occupancy.activeLearners : null,
      peakLearners: data.inscriptionsAccessibles ? occupancy.peakLearners : null,
      occupancyRate: data.inscriptionsAccessibles ? occupancy.occupancyRate : null,
      displayStatus: room.statut,
    };
  });

  const counts = {
    total: rooms.length,
    available: rooms.filter((room) => room.displayStatus === 'disponible').length,
    maintenance: 0,
    unavailable: rooms.filter((room) => room.displayStatus === 'indisponible').length,
  };

  /**
   * Enregistre une salle. mode : 'close' (liste), 'continue' (nouvelle salle), 'affect' (ouvre l'affectation),
   * 'inline' (création depuis le formulaire d'affectation). Renvoie l'identifiant de la salle, ou null en cas d'échec :
   * le formulaire reste alors ouvert avec toutes les données saisies.
   */
  const saveRoomRecord = async (record, mode = 'close') => {
    const code = record.code.trim().toLocaleUpperCase('fr');
    const newTrainer = data.formateurs.find((item) => String(item.id) === String(record.id_formateur));
    if ((record.id || mode === 'close') && !(await confirm(record.id
      ? { title: 'Enregistrer les modifications ?', message: `La salle ${code} sera mise à jour${newTrainer ? `\nFormateur attitré : ${newTrainer.prenom} ${newTrainer.nom}` : ''}.`, tone: 'warning' }
      : { title: 'Créer cette salle ?', message: `La salle ${code} · ${record.libelle.trim()} sera ajoutée${newTrainer ? ` et affectée à ${newTrainer.prenom} ${newTrainer.nom}` : ''}.`, tone: 'primary' }))) {
      return null;
    }
    try {
      const payload = {
        code,
        libelle: record.libelle.trim(),
        capacite: record.capacite === '' || record.capacite == null ? null : Number(record.capacite),
        statut: record.statut,
      };
      let roomId = record.id;
      if (record.id) await sallesApi.update(record.id, payload);
      else roomId = Number((await sallesApi.create(payload))?.data?.id) || null;

      // Une salle = un seul formateur attitré, qui y enseigne tous les jours.
      const previousTrainer = data.formateurs.find((item) => roomId && Number(item.id_salle) === Number(roomId));
      if (roomId && String(previousTrainer?.id || '') !== String(record.id_formateur || '')) {
        if (previousTrainer) await formateursApi.update(previousTrainer.id, { id_salle: null });
        if (newTrainer) await formateursApi.update(newTrainer.id, { id_salle: roomId });
      }
      setError('');
      setNotice(`Salle ${record.code ? code : ''} ${record.id ? 'modifiée' : 'créée'}.`.replace('  ', ' '));
      if (mode === 'affect') {
        // L'affectation a besoin de la salle et de son formateur à jour : on attend le rechargement.
        await reloadData();
        setRoomDialog(null);
        setActiveTab('affectations');
        setAssignmentDialog({ assignment: null, preset: { id_salle: Number(roomId) }, key: Date.now() });
      } else if (mode === 'inline') {
        await reloadData();
      } else {
        reloadData().catch(() => {});
        setRoomDialog(mode === 'continue' ? { room: null, key: Date.now() } : null);
      }
      return roomId;
    } catch (saveError) {
      reloadData().catch(() => {});
      setError(saveError.message || 'La salle n’a pas pu être enregistrée.');
      return null;
    }
  };

  const quickStatus = async (room, status) => {
    if (!(await confirm({
      title: 'Changer le statut de la salle ?',
      message: `${room.code} · ${room.libelle} passera à « ${status} ».`,
      tone: 'warning',
    }))) return;
    try {
      await sallesApi.changeStatut(room.id, { statut: status });
      await reloadData();
      setNotice(`Statut de ${room.code} mis à jour.`);
      setError('');
    } catch (saveError) {
      setError(saveError.message || 'Le statut n’a pas pu être modifié.');
    }
  };

  const removeRoom = async (room) => {
    if (!(await confirm({
      title: 'Supprimer cette salle ?',
      message: `${room.code} · ${room.libelle} sera supprimée définitivement.\nUne salle utilisée dans l’emploi du temps ne peut pas être supprimée.`,
      tone: 'danger',
    }))) return;
    try {
      await sallesApi.delete(room.id);
      await reloadData();
      setNotice('Salle supprimée.');
      setError('');
    } catch (deleteError) {
      setError(deleteError.message || 'La salle ne peut pas être supprimée.');
    }
  };

  const saveAssignment = async (record, mode = 'close') => {
    const group = data.groupes.find((item) => item.id === Number(record.id_groupe));
    const room = data.salles.find((item) => item.id === Number(record.id_salle));
    const trainer = data.formateurs.find((item) => item.id === Number(record.id_formateur));
    const day = WEEKDAYS.find((item) => item.value === Number(record.jour_semaine))?.label || '';
    if (mode !== 'continue' && !(await confirm({
      title: record.id ? 'Modifier cette affectation ?' : 'Affecter ce groupe à la salle ?',
      message: `Groupe ${group?.code || ''} · ${group?.libelle || ''}\nSalle ${room?.code || ''} · formateur ${trainer?.prenom || ''} ${trainer?.nom || ''}\nChaque ${day.toLocaleLowerCase('fr')}`,
      tone: record.id ? 'warning' : 'primary',
    }))) return;
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
      // La fenêtre se ferme dès que l'enregistrement est confirmé ; la liste se met à jour juste après.
      setError('');
      setNotice(`Affectation ${record.id ? 'modifiée' : 'créée'} dans l’emploi du temps partagé.`);
      reloadData().catch(() => {});
      setAssignmentDialog(mode === 'continue' && !record.id
        ? { assignment: null, key: Date.now(), preset: { id_annee: Number(record.id_annee), id_session: record.id_session || '', id_salle: Number(record.id_salle) } }
        : null);
    } catch (saveError) {
      setError(saveError.message || 'L’affectation n’a pas pu être enregistrée.');
    }
  };

  // Affectation en série : plusieurs groupes × plusieurs salles. Chaque couple est créé séparément ;
  // ceux que le serveur refuse sont listés et la fenêtre reste ouverte pour les corriger.
  const saveAssignments = async (records, mode = 'close') => {
    const labelOf = (record) => {
      const group = data.groupes.find((item) => item.id === Number(record.id_groupe));
      const room = data.salles.find((item) => item.id === Number(record.id_salle));
      return `${group?.code || '?'} → ${room?.code || '?'} (${WEEKDAYS.find((item) => item.value === Number(record.jour_semaine))?.label || ''})`;
    };
    if (mode !== 'continue' && !(await confirm({
      title: records.length > 1 ? `Créer ${records.length} affectations ?` : 'Affecter ce groupe à la salle ?',
      message: `${records.slice(0, 12).map(labelOf).join('\n')}${records.length > 12 ? `\n… et ${records.length - 12} autre(s)` : ''}\nLe formateur de chaque salle est repris automatiquement.`,
      tone: 'primary',
    }))) return;
    const failures = [];
    let created = 0;
    for (const record of records) {
      try {
        await emploisApi.create({
          id_annee: Number(record.id_annee), id_groupe: Number(record.id_groupe), id_salle: Number(record.id_salle),
          id_formateur: Number(record.id_formateur), jour_semaine: Number(record.jour_semaine), statut: 1,
        });
        created += 1;
      } catch (saveError) {
        failures.push(`${labelOf(record)} : ${saveError.message || 'refusée'}`);
      }
    }
    reloadData().catch(() => {});
    if (created) setNotice(`${created} affectation(s) créée(s) dans l’emploi du temps partagé.`);
    if (failures.length) {
      setError(`${failures.length} affectation(s) refusée(s) par le serveur :\n${failures.join('\n')}`);
      return;
    }
    setError('');
    const last = records[records.length - 1];
    setAssignmentDialog(mode === 'continue'
      ? { assignment: null, key: Date.now(), preset: { id_annee: Number(last.id_annee), id_session: last.id_session || '', id_salle: null } }
      : null);
  };

  const removeAssignment = async (assignment) => {
    const label = `${assignment.group?.libelle || 'ce groupe'} · ${assignment.room?.code || 'cette salle'}`;
    const day = WEEKDAYS.find((item) => item.value === Number(assignment.jour_semaine))?.label || '';
    if (!(await confirm({
      title: 'Supprimer cette affectation ?',
      message: `${label} · ${day}.\nSi des inscriptions ou présences y sont liées, la suppression sera refusée : désactivez-la plutôt.`,
      tone: 'danger',
    }))) return;
    try {
      await emploisApi.delete(assignment.id);
      await reloadData();
      setNotice('Créneau supprimé.');
      setError('');
    } catch (deleteError) {
      setError(deleteError.message || 'Le créneau n’a pas pu être supprimé.');
    }
  };

  return <div className="space-y-6 pb-10">
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between"><div><button type="button" onClick={onBack} className="mb-3 text-xs font-semibold text-teal-800 hover:text-teal-950">← Tableau de bord</button><p className="text-xs font-bold uppercase text-teal-800">Locaux et affectations pédagogiques</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Gestion des salles</h1><p className="mt-1 text-sm text-slate-500">Registre, disponibilité, affectations hebdomadaires et capacité{activeYear ? ` · ${activeYear.libelle}` : ''}.</p></div><div className="flex flex-wrap gap-2">{activeTab === 'salles' && hasAccess('salles', 'read') && hasAccess('salles', 'create') && <button type="button" onClick={() => { setError(''); setRoomDialog({ room: null }); }} disabled={roomPrerequisites.blocked} title={roomPrerequisites.blocked ? 'Créez d’abord un formateur disponible (voir le message ci-dessous)' : undefined} className="inline-flex items-center gap-2 bg-brand-charcoal px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-brand-gold disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-4 w-4" /> Nouvelle salle</button>}{activeTab === 'affectations' && canReadPlanning && hasAccess('emplois-temps', 'create') && <button type="button" onClick={() => { setError(''); setAssignmentDialog({ assignment: null }); }} disabled={prerequisites.blocked} title={prerequisites.blocked ? 'Complétez d’abord les prérequis indiqués' : undefined} className="inline-flex items-center gap-2 bg-brand-charcoal px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-brand-gold disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-4 w-4" /> Affecter une classe</button>}</div></header>
    {loading && <div role="status" className="border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Chargement des salles, groupes et emplois du temps…</div>}
    {!loading && !error && hasAccess('organisation-pedagogique', 'read') && !activeYear && <div role="status" className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Aucune année scolaire n’est enregistrée; les salles restent gérables, mais les affectations nécessitent une année active.</div>}
    {!loading && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><RoomMetric label="Salles au catalogue" value={counts.total} tone="slate" /><RoomMetric label="Disponibles" value={counts.available} tone="green" /><RoomMetric label="Indisponibles" value={counts.unavailable} tone="red" /></section>}
    {error && <div role="alert" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
    {notice && <div role="status" className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
    {!loading && !hasAccess('salles', 'read') && <div role="alert" className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Vous n’avez pas la permission de consulter les salles.</div>}
    {!loading && hasAccess('salles', 'read') && <SubTabNav label="Sections de gestion des salles" items={tabs.filter((tab) => tab.id === 'salles' || tab.id === 'disponibilite' || (tab.id === 'statistiques' && canReadStatistics) || (tab.id === 'affectations' && canReadPlanning))} active={activeTab} onChange={setActiveTab} />}
    {!loading && hasAccess('salles', 'read') && activeTab === 'salles' && <>
      <div className="border-l-2 border-sky-600 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-950">Chaque salle a un seul formateur attitré, présent tous les jours. Les auditeurs de la salle changent selon le jour. Un groupe trop nombreux est réparti sur plusieurs salles.</div>
      <PrerequisiteBanner prerequisites={roomPrerequisites} action="de créer une salle" />
      <ListeSalles rooms={rooms} onNew={() => { setError(''); setRoomDialog({ room: null }); }} onEdit={(room) => { setError(''); setRoomDialog({ room }); }} onDelete={removeRoom} onStatusChange={quickStatus} canCreate={hasAccess('salles', 'create') && !roomPrerequisites.blocked} canUpdate={hasAccess('salles', 'update')} canDelete={hasAccess('salles', 'delete')} canExport={hasAccess('salles', 'export')} />
    </>}
    {!loading && activeTab === 'affectations' && canReadPlanning && <>
      <PrerequisiteBanner prerequisites={prerequisites} action="d’affecter une classe" />
      <div className="border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">Affectez un groupe à une salle pour un jour. Le formateur de la salle est repris automatiquement. Un même groupe peut être affecté à plusieurs salles le même jour.</div>
      <AffectationsSalles assignments={assignments} years={data.annees_scolaires} sessions={data.sessions} rooms={rooms} groups={data.groupes} onNew={() => { setError(''); setAssignmentDialog({ assignment: null }); }} onEdit={(assignment) => { setError(''); setAssignmentDialog({ assignment }); }} onDelete={removeAssignment} canCreate={hasAccess('emplois-temps', 'create')} canUpdate={hasAccess('emplois-temps', 'update')} canDelete={hasAccess('emplois-temps', 'delete')} />
    </>}
    {!loading && hasAccess('salles', 'read') && activeTab === 'disponibilite' && <DisponibiliteSalles rooms={rooms} />}
    {!loading && hasAccess('salles', 'read') && canReadStatistics && activeTab === 'statistiques' && <StatistiquesSalles data={data} rooms={rooms} years={data.annees_scolaires} />}
    {roomDialog && <RoomFormDialog key={roomDialog.key ?? 'room'} room={roomDialog.room} trainers={data.formateurs} error={error} onClose={() => setRoomDialog(null)} onSave={saveRoomRecord} />}
    {assignmentDialog && (assignmentDialog.assignment
      ? <AssignmentFormDialog key={assignmentDialog.key ?? 'assignment'} assignment={assignmentDialog.assignment} preset={assignmentDialog.preset} onCreateRoom={hasAccess('salles', 'create') ? (record) => saveRoomRecord(record, 'inline') : null} data={data} error={error} onClose={() => setAssignmentDialog(null)} onSave={saveAssignment} />
      : <MultiAssignmentDialog key={assignmentDialog.key ?? 'assignment'} preset={assignmentDialog.preset} onCreateRoom={hasAccess('salles', 'create') ? (record) => saveRoomRecord(record, 'inline') : null} data={data} error={error} onClose={() => setAssignmentDialog(null)} onSaveMany={saveAssignments} />)}
  </div>;
}