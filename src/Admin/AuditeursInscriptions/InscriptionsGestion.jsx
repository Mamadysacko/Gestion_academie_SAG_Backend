import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, GraduationCap, Plus, RefreshCw, Search, Sparkles, SquarePen, Trash2, UserPlus, Users, X } from 'lucide-react';
import {
  anneesScolairesApi,
  auditeursApi,
  departementsApi,
  emploisApi,
  groupesApi,
  inscriptionsApi,
  sessionsApi,
  typesEmployesApi,
} from '../../config/apiService';
import { getCurrentSchoolYear } from '../../utils/schoolYear';
import { formatDateFr } from './auditeursHelpers';
import SearchableSelect from '../../composant/SearchableSelect';
import { useConfirm } from '../../composant/confirmContext';
import { useLiveRefresh } from '../../composant/useLiveRefresh';
import { jourLabel } from '../EmploisDuTemps/emploisHelpers';
import AffectationFields from './AffectationFields';
import TagSelect from '../../composant/TagSelect';
import { sessionOptions } from './affectationHelpers';
import { useToastNotice } from '../../composant/toastContext';
import Pagination from '../../composant/Pagination';
import { usePagination } from '../../composant/usePagination';
import PrerequisiteBanner from '../../aide/Prerequisites';
import { usePrerequisites } from '../../aide/usePrerequisites';
import ModalOverlay from '../../composant/ModalOverlay';

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'terminee', label: 'Terminée' },
  { value: 'abandonnee', label: 'Abandonnée' },
  { value: 'annulee', label: 'Annulée' },
];

const TODAY = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const EMPTY_FORM = () => ({
  id_auditeur: '',
  id_session: '',
  id_groupe: '',
  id_emploi_du_temps: '',
  id_departement: '',
  date_inscription: TODAY(),
});
const EMPTY_AUDITEUR = () => ({
  nom: '',
  prenom: '',
  matricule: '',
  sexe: 'M',
  telephone: '',
  email: '',
  position: '',
  id_type_employe: '',
});
const createMatricule = (yearLabel, auditeurs) => {
  const year = String(yearLabel || new Date().getFullYear()).split('-')[0];
  const pattern = new RegExp(`^AUD-${year}-(\\d+)$`, 'i');
  const max = auditeurs.reduce((highest, item) => {
    const match = String(item.matricule || '').match(pattern);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `AUD-${year}-${String(max + 1).padStart(3, '0')}`;
};

const rows = (response) => (Array.isArray(response?.data) ? response.data : []);
const asId = (value) => Number(value);
const isAdmin = (user) => user?.role_code === 'admin' || user?.role === 'admin';
const can = (user, action) => isAdmin(user)
  || (user?.permissions?.auditeurs || []).includes(action)
  || (user?.permissions?.inscriptions || []).includes(action);

export default function InscriptionsGestion({ currentUser, initialAuditeurId, openOnMount, onInitialAuditeurConsumed, onCreateAuditeur }) {
  const prerequisites = usePrerequisites('auditeurs/inscriptions', currentUser);
  const confirm = useConfirm();
  const [data, setData] = useState({ auditeurs: [], inscriptions: [], emplois: [], groupes: [], sessions: [], annees: [], departements: [], typesEmployes: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useToastNotice();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [yearFilter, setYearFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [formOpen, setFormOpen] = useState(() => Boolean(initialAuditeurId || openOnMount));
  const [wizardStep, setWizardStep] = useState(initialAuditeurId ? 2 : 1);
  const [auditeurMode, setAuditeurMode] = useState(initialAuditeurId ? 'existing' : 'new');
  const [newAuditeur, setNewAuditeur] = useState(EMPTY_AUDITEUR);
  const [creatingAuditeur, setCreatingAuditeur] = useState(false);
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM(),
    id_auditeur: initialAuditeurId ? String(initialAuditeurId) : '',
  }));
  const [editing, setEditing] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) { setLoading(true); setError(''); }
    try {
      const [auditeurs, inscriptions, emplois, groupes, sessions, annees, departements, typesEmployes] = await Promise.all([
        auditeursApi.getAll(),
        inscriptionsApi.getAll(),
        emploisApi.getAll(),
        groupesApi.getAll(),
        sessionsApi.getAll(),
        anneesScolairesApi.getAll(),
        departementsApi.getAll(),
        typesEmployesApi.getAll().catch(() => ({ data: [] })),
      ]);
      setData({
        auditeurs: rows(auditeurs).map((item) => ({ ...item, id: asId(item.id) })),
        inscriptions: rows(inscriptions).map((item) => ({
          ...item,
          id: asId(item.id),
          id_auditeur: asId(item.id_auditeur),
          id_emploi_du_temps: asId(item.id_emploi_du_temps),
          id_salle: asId(item.id_salle),
          id_departement: asId(item.id_departement),
          id_groupe: asId(item.id_groupe),
          id_session: asId(item.id_session),
          id_annee: asId(item.id_annee),
          jour_semaine: asId(item.jour_semaine),
        })),
        emplois: rows(emplois).map((item) => ({
          ...item,
          id: asId(item.id),
          id_groupe: asId(item.id_groupe),
          id_salle: asId(item.id_salle),
          id_annee: asId(item.id_annee),
          jour_semaine: asId(item.jour_semaine),
          statut: asId(item.statut),
          salle_capacite: item.salle_capacite == null ? null : asId(item.salle_capacite),
        })),
        groupes: rows(groupes).map((item) => ({ ...item, id: asId(item.id), id_session: asId(item.id_session), jour_semaine: asId(item.jour_semaine), capacite: item.capacite == null ? null : asId(item.capacite), statut: asId(item.statut) })),
        sessions: rows(sessions).map((item) => ({ ...item, id: asId(item.id), id_annee: asId(item.id_annee) })),
        annees: rows(annees).map((item) => ({ ...item, id: asId(item.id), statut: asId(item.statut) })),
        departements: rows(departements).map((item) => ({ ...item, id: asId(item.id) })),
        typesEmployes: rows(typesEmployes).map((item) => ({ ...item, id: asId(item.id) })),
      });
    } catch (loadError) {
      if (!silent) setError(loadError.message || 'Impossible de charger le registre depuis le serveur.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load());
  }, [load]);
  useLiveRefresh(() => load({ silent: true }), { intervalMs: 45000 });

  const activeYear = useMemo(() => getCurrentSchoolYear(data.annees), [data.annees]);
  const effectiveYearId = yearFilter === 'tous' ? '' : yearFilter || String(activeYear?.id || '');
  const yearSessions = data.sessions.filter((session) => !effectiveYearId || String(session.id_annee) === effectiveYearId);

  const suggestedMatricule = useMemo(() => createMatricule(activeYear?.libelle, data.auditeurs), [activeYear, data.auditeurs]);
  const openGroupsCount = useMemo(() => new Set(data.emplois
    .filter((emploi) => emploi.statut === 1 && (!activeYear || emploi.id_annee === activeYear.id))
    .map((emploi) => emploi.id_groupe)).size, [activeYear, data.emplois]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('fr');
    return data.inscriptions.filter((item) => {
      if (statusFilter !== 'tous' && item.statut !== statusFilter) return false;
      if (effectiveYearId && String(item.id_annee) !== effectiveYearId) return false;
      if (sessionFilter && String(item.id_session) !== sessionFilter) return false;
      const label = `${item.auditeur_prenom || ''} ${item.auditeur_nom || ''} ${item.auditeur_matricule || ''} ${item.auditeur_position || ''} ${item.type_employe_libelle || ''} ${item.groupe_code || ''} ${item.groupe_libelle || ''} ${item.salle_code || ''} ${item.departement_libelle || ''}`.toLocaleLowerCase('fr');
      return !term || label.includes(term);
    });
  }, [data.inscriptions, effectiveYearId, search, sessionFilter, statusFilter]);
  const { pageRows, pagerProps } = usePagination(filtered, 25);

  const metrics = useMemo(() => {
    const scoped = data.inscriptions.filter((item) => (!effectiveYearId || String(item.id_annee) === effectiveYearId)
      && (!sessionFilter || String(item.id_session) === sessionFilter));
    return {
      total: scoped.length,
      active: scoped.filter((item) => item.statut === 'active').length,
      people: new Set(scoped.filter((item) => item.statut === 'active').map((item) => item.id_auditeur)).size,
    };
  }, [data.inscriptions, effectiveYearId, sessionFilter]);

  const selectedAuditeur = data.auditeurs.find((auditeur) => String(auditeur.id) === String(form.id_auditeur));

  const openCreate = () => {
    setError('');
    setNewAuditeur({ ...EMPTY_AUDITEUR(), matricule: createMatricule(activeYear?.libelle, data.auditeurs) });
    setAuditeurMode('new');
    setWizardStep(1);
    setForm(EMPTY_FORM());
    onInitialAuditeurConsumed?.();
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving || creatingAuditeur) return;
    setFormOpen(false);
    onInitialAuditeurConsumed?.();
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.id_emploi_du_temps) {
      setError('Sélectionnez la salle dans laquelle l’auditeur sera affecté.');
      return;
    }
    const room = data.emplois.find((item) => String(item.id) === String(form.id_emploi_du_temps));
    const group = data.groupes.find((item) => String(item.id) === String(form.id_groupe));
    if (!(await confirm({
      title: 'Confirmer l’inscription ?',
      message: `${selectedAuditeur?.prenom || ''} ${selectedAuditeur?.nom || ''} sera inscrit(e) dans le groupe ${group?.code || ''} · ${group?.libelle || ''}, salle ${room?.salle_code || ''} (${room?.formateur_prenom || ''} ${room?.formateur_nom || ''}), chaque ${jourLabel(group?.jour_semaine).toLocaleLowerCase('fr')}.`,
      tone: 'primary',
      confirmLabel: 'Inscrire',
    }))) return;

    setSaving(true);
    try {
      const created = await inscriptionsApi.create({
        id_auditeur: Number(form.id_auditeur),
        id_session: Number(form.id_session),
        id_emploi_du_temps: Number(form.id_emploi_du_temps),
        id_departement: Number(form.id_departement),
        date_inscription: form.date_inscription,
        statut: 'active',
      });
      setFormOpen(false);
      onInitialAuditeurConsumed?.();
      setNotice(created?.message || 'Inscription enregistrée.');
      await load({ silent: true });
    } catch (saveError) {
      setError(saveError.message || 'Échec de la création de l’inscription.');
    } finally {
      setSaving(false);
    }
  };

  const continueToEnrollment = async (event) => {
    event.preventDefault();
    setError('');
    if (auditeurMode === 'existing') {
      if (!form.id_auditeur) {
        setError('Veuillez sélectionner un auditeur.');
        return;
      }
      setWizardStep(2);
      return;
    }
    const auditeurToCreate = { ...newAuditeur, matricule: newAuditeur.matricule.trim() || suggestedMatricule };
    if (!auditeurToCreate.nom.trim() || !auditeurToCreate.prenom.trim() || !auditeurToCreate.matricule.trim()) {
      setError('Le nom, le prénom et le matricule sont obligatoires.');
      return;
    }
    if (!data.departements.length) {
      setError('Impossible de poursuivre : créez d’abord un département dans les paramètres.');
      return;
    }
    if (!(isAdmin(currentUser) || (currentUser?.permissions?.auditeurs || []).includes('create'))) {
      setError('Vous ne disposez pas du droit de créer un nouvel auditeur.');
      return;
    }

    setCreatingAuditeur(true);
    try {
      const auditeurId = await onCreateAuditeur?.(auditeurToCreate);
      if (!auditeurId) return;
      setData((current) => ({
        ...current,
        auditeurs: [...current.auditeurs, { ...auditeurToCreate, id: Number(auditeurId) }],
      }));
      setForm((current) => ({ ...current, id_auditeur: String(auditeurId) }));
      setWizardStep(2);
      setNotice('Dossier auditeur créé. Complétez maintenant son inscription.');
    } catch (createError) {
      setError(createError.message || 'Impossible de créer le dossier auditeur.');
    } finally {
      setCreatingAuditeur(false);
    }
  };

  const openEdit = (inscription) => {
    setError('');
    setEditing({
      inscription,
      id_session: String(inscription.id_session),
      id_groupe: String(inscription.id_groupe),
      id_emploi_du_temps: String(inscription.id_emploi_du_temps),
      id_departement: String(inscription.id_departement),
      date_inscription: String(inscription.date_inscription).slice(0, 10),
      statut: inscription.statut,
    });
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    const { inscription } = editing;
    if (!editing.id_emploi_du_temps) {
      setError('Sélectionnez la salle de l’auditeur.');
      return;
    }
    const payload = {};
    if (String(inscription.id_emploi_du_temps) !== editing.id_emploi_du_temps) payload.id_emploi_du_temps = Number(editing.id_emploi_du_temps);
    if (String(inscription.id_departement) !== editing.id_departement) payload.id_departement = Number(editing.id_departement);
    if (String(inscription.date_inscription).slice(0, 10) !== editing.date_inscription) payload.date_inscription = editing.date_inscription;
    if (inscription.statut !== editing.statut) payload.statut = editing.statut;
    if (!Object.keys(payload).length) {
      setEditing(null);
      return;
    }
    const room = data.emplois.find((item) => String(item.id) === editing.id_emploi_du_temps);
    if (!(await confirm({
      title: 'Enregistrer les modifications ?',
      message: `Inscription de ${inscription.auditeur_prenom} ${inscription.auditeur_nom}${payload.id_emploi_du_temps ? `\nNouvelle affectation : groupe ${room?.groupe_code || ''}, salle ${room?.salle_code || ''} (${room?.formateur_prenom || ''} ${room?.formateur_nom || ''}).` : ''}${payload.statut ? `\nNouveau statut : ${STATUSES.find((s) => s.value === payload.statut)?.label}.` : ''}`,
      tone: 'warning',
    }))) return;

    setSaving(true);
    setError('');
    try {
      await inscriptionsApi.update(inscription.id, payload);
      setEditing(null);
      setNotice('Inscription mise à jour.');
      await load({ silent: true });
    } catch (saveError) {
      setError(saveError.message || 'Impossible de modifier cette inscription.');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (inscription, statut) => {
    if (!(await confirm({
      title: 'Modifier le statut ?',
      message: `L’inscription de ${inscription.auditeur_prenom} ${inscription.auditeur_nom} passera à « ${STATUSES.find((s) => s.value === statut)?.label} ».`,
      tone: 'warning',
    }))) return;
    setError('');
    setBusyId(inscription.id);
    try {
      await inscriptionsApi.changeStatut(inscription.id, { statut });
      setData((current) => ({
        ...current,
        inscriptions: current.inscriptions.map((item) => item.id === inscription.id ? { ...item, statut } : item),
      }));
      setNotice('Statut d’inscription mis à jour.');
    } catch (updateError) {
      setError(updateError.message || 'Impossible de modifier le statut.');
    } finally {
      setBusyId(null);
    }
  };

  const removeInscription = async (inscription) => {
    if (!(await confirm({
      title: 'Supprimer cette inscription ?',
      message: `${inscription.auditeur_prenom} ${inscription.auditeur_nom} — groupe ${inscription.groupe_code}, salle ${inscription.salle_code}.\nSes présences, notes et décisions de passage liées à cette inscription seront aussi supprimées. Pour conserver l’historique, préférez le statut « Annulée ».`,
      tone: 'danger',
    }))) return;
    setError('');
    setBusyId(inscription.id);
    try {
      await inscriptionsApi.delete(inscription.id);
      setData((current) => ({ ...current, inscriptions: current.inscriptions.filter((item) => item.id !== inscription.id) }));
      setNotice('Inscription supprimée.');
    } catch (deleteError) {
      setError(deleteError.message || 'Impossible de supprimer cette inscription.');
    } finally {
      setBusyId(null);
    }
  };

  const inputClass = 'mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm';

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-800">Gestion des inscriptions</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Registre académique</h2>
          <p className="mt-1 text-sm text-slate-500">Chaque auditeur est inscrit dans une session et un groupe ; ses jours de présence sont ceux du groupe et vous choisissez sa salle (et donc son formateur).</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Actualiser</button>
          {can(currentUser, 'create') && <button type="button" onClick={openCreate} disabled={prerequisites.blocked} title={prerequisites.blocked ? 'Complétez d’abord les prérequis indiqués ci-dessous' : undefined} className="inline-flex items-center gap-2 bg-brand-charcoal px-4 py-2 text-sm font-semibold text-white hover:bg-brand-gold disabled:cursor-not-allowed disabled:opacity-40"><Plus size={16} />Nouvelle inscription</button>}
        </div>
      </header>
      <PrerequisiteBanner prerequisites={prerequisites} action="d’inscrire un auditeur" />

      {error && !formOpen && !editing && <div role="alert" className="flex items-start gap-2 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
      {notice && <div role="status" className="border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={GraduationCap} label="Inscriptions" value={metrics.total} />
        <Metric icon={CalendarDays} label="Inscriptions actives" value={metrics.active} />
        <Metric icon={Users} label="Auditeurs actifs inscrits" value={metrics.people} />
        <Metric icon={CalendarDays} label="Groupes avec salles" value={openGroupsCount} />
      </div>

      <section className="space-y-4 border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_180px_220px_180px]">
          <label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher auditeur, matricule, groupe, salle…" className="w-full border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-700" /></label>
          <TagSelect required value={yearFilter || String(activeYear?.id || 'tous')} onChange={(next) => { setYearFilter(next); setSessionFilter(''); }} options={[{ value: 'tous', label: 'Toutes les années' }, ...data.annees.map((year) => ({ value: String(year.id), label: year.libelle, hint: Number(year.id) === Number(activeYear?.id) ? 'Année active' : undefined }))]} placeholder="Année scolaire" />
          <TagSelect value={sessionFilter} onChange={setSessionFilter} options={sessionOptions(yearSessions)} placeholder="Toutes les sessions" />
          <TagSelect required value={statusFilter} onChange={setStatusFilter} options={[{ value: 'tous', label: 'Tous les statuts' }, ...STATUSES]} placeholder="Statut" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-3">Auditeur</th><th className="px-3 py-3">Session / groupe</th><th className="px-3 py-3">Jour</th><th className="px-3 py-3">Salle / formateur</th><th className="px-3 py-3">Département</th><th className="px-3 py-3">Inscription</th><th className="px-3 py-3">Statut</th><th className="px-3 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-3"><p className="font-semibold text-slate-800">{item.auditeur_prenom} {item.auditeur_nom}</p><p className="mt-1 font-mono text-xs text-slate-500">{item.auditeur_matricule}</p>{(item.auditeur_position || item.type_employe_libelle) && <p className="mt-0.5 text-[11px] text-slate-500">{[item.auditeur_position, item.type_employe_libelle].filter(Boolean).join(' · ')}</p>}</td>
                  <td className="px-3 py-3"><p className="font-semibold text-slate-800">{item.groupe_code} · {item.groupe_libelle}</p><p className="mt-1 text-xs text-slate-500">{item.session_code} · {item.session_libelle} · {item.annee_libelle}</p></td>
                  <td className="px-3 py-3 text-xs font-semibold text-slate-700">{jourLabel(item.jour_semaine)}</td>
                  <td className="px-3 py-3"><p className="text-slate-800">{item.salle_code} · {item.salle_libelle}</p><p className="mt-1 text-xs text-slate-500">{item.formateur_prenom} {item.formateur_nom}</p></td>
                  <td className="px-3 py-3 text-slate-700">{item.departement_code} · {item.departement_libelle}</td>
                  <td className="px-3 py-3 text-slate-600">{formatDateFr(item.date_inscription)}</td>
                  <td className="px-3 py-3">
                    {can(currentUser, 'update') ? <select value={item.statut} disabled={busyId === item.id} onChange={(event) => changeStatus(item, event.target.value)} aria-label={`Statut de ${item.auditeur_prenom} ${item.auditeur_nom}`} className="border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold disabled:opacity-50">{STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select> : <span className="text-xs font-semibold text-slate-700">{STATUSES.find((status) => status.value === item.statut)?.label || item.statut}</span>}
                  </td>
                  <td className="px-3 py-3"><div className="flex justify-end gap-1">
                    {can(currentUser, 'update') && <button type="button" onClick={() => openEdit(item)} disabled={busyId === item.id} title="Modifier" aria-label={`Modifier l’inscription de ${item.auditeur_prenom} ${item.auditeur_nom}`} className="p-2 text-slate-500 hover:bg-teal-50 hover:text-teal-800 disabled:opacity-40"><SquarePen size={16} /></button>}
                    {can(currentUser, 'delete') && <button type="button" onClick={() => removeInscription(item)} disabled={busyId === item.id} title="Supprimer" aria-label={`Supprimer l’inscription de ${item.auditeur_prenom} ${item.auditeur_nom}`} className="p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"><Trash2 size={16} /></button>}
                  </div></td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && <tr><td colSpan="8" className="px-4 py-12 text-center text-sm text-slate-500">Aucune inscription ne correspond aux filtres.</td></tr>}
              {loading && <tr><td colSpan="8" className="px-4 py-12 text-center text-sm text-slate-500">Chargement depuis la base de données…</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination {...pagerProps} />
        <p className="text-xs text-slate-500">{filtered.length} inscription(s) affichée(s). Un auditeur ne peut avoir qu’une inscription active par session.</p>
      </section>

      {formOpen && (
        <ModalOverlay onClose={() => { closeForm(); }}>
          <form onSubmit={wizardStep === 1 ? continueToEnrollment : submit} className="max-h-[94vh] w-full max-w-2xl space-y-5 overflow-y-auto border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <header className="flex items-start justify-between border-b border-slate-100 pb-4"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-800">Parcours d’inscription · Étape {wizardStep} sur 2</p><h3 className="mt-1 text-xl font-bold text-slate-900">{wizardStep === 1 ? 'Auditeur' : 'Session, groupe et salle'}</h3><p className="mt-1 text-sm text-slate-500">{wizardStep === 1 ? 'Créez un dossier ou sélectionnez un auditeur déjà enregistré.' : 'Les jours de présence sont repris du groupe ; choisissez la salle de l’auditeur.'}</p></div><button type="button" onClick={closeForm} disabled={saving || creatingAuditeur} aria-label="Fermer" className="p-1 text-slate-500"><X size={18} /></button></header>
            <ol aria-label="Progression de l’inscription" className="grid grid-cols-2 gap-3">
              {[1, 2].map((step) => <li key={step} aria-current={wizardStep === step ? 'step' : undefined} className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${wizardStep === step ? 'border-teal-300 bg-teal-50 text-teal-900' : wizardStep > step ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-500'}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${wizardStep > step ? 'bg-emerald-600 text-white' : wizardStep === step ? 'bg-teal-700 text-white' : 'bg-slate-100'}`}>{wizardStep > step ? <CheckCircle2 size={16} /> : step}</span><span className="font-semibold">{step === 1 ? 'Auditeur' : 'Affectation & inscription'}</span></li>)}
            </ol>
            {error && <p role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
            {wizardStep === 1 ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => setAuditeurMode('new')} aria-pressed={auditeurMode === 'new'} className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${auditeurMode === 'new' ? 'border-teal-400 bg-teal-50 ring-1 ring-teal-200' : 'border-slate-200 hover:border-slate-300'}`}><UserPlus className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" /><span><span className="block text-sm font-bold text-slate-900">Créer un nouvel auditeur</span><span className="mt-1 block text-xs text-slate-500">Dossier créé avant l’inscription.</span></span></button>
                  <button type="button" onClick={() => setAuditeurMode('existing')} aria-pressed={auditeurMode === 'existing'} className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${auditeurMode === 'existing' ? 'border-teal-400 bg-teal-50 ring-1 ring-teal-200' : 'border-slate-200 hover:border-slate-300'}`}><Users className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" /><span><span className="block text-sm font-bold text-slate-900">Choisir un auditeur existant</span><span className="mt-1 block text-xs text-slate-500">Inscrire un dossier déjà présent.</span></span></button>
                </div>
                {auditeurMode === 'existing' ? (
                  <SearchableSelect
                    label="Auditeur"
                    value={form.id_auditeur}
                    onChange={(id) => setForm((current) => ({ ...current, id_auditeur: id }))}
                    options={data.auditeurs.map((auditeur) => ({
                      value: String(auditeur.id),
                      label: `${auditeur.prenom} ${auditeur.nom} · ${auditeur.matricule}`,
                    }))}
                    placeholder="Rechercher par nom ou matricule"
                    emptyMessage="Aucun auditeur trouvé."
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700">Nom *<input required value={newAuditeur.nom} onChange={(event) => setNewAuditeur((current) => ({ ...current, nom: event.target.value }))} autoComplete="family-name" className={inputClass} /></label>
                    <label className="text-sm font-semibold text-slate-700">Prénom *<input required value={newAuditeur.prenom} onChange={(event) => setNewAuditeur((current) => ({ ...current, prenom: event.target.value }))} autoComplete="given-name" className={inputClass} /></label>
                    <label className="text-sm font-semibold text-slate-700">Matricule *<input required value={newAuditeur.matricule || suggestedMatricule} onChange={(event) => setNewAuditeur((current) => ({ ...current, matricule: event.target.value }))} className={inputClass} /><span className="mt-1 block text-xs font-normal text-slate-500">Généré automatiquement, modifiable si nécessaire.</span></label>
                    <TagSelect label="Sexe" required value={newAuditeur.sexe} onChange={(next) => setNewAuditeur((current) => ({ ...current, sexe: next }))} options={[{ value: 'M', label: 'Masculin' }, { value: 'F', label: 'Féminin' }]} />
                    <label className="text-sm font-semibold text-slate-700">Position<input maxLength="100" value={newAuditeur.position} onChange={(event) => setNewAuditeur((current) => ({ ...current, position: event.target.value }))} placeholder="Ex. Chef de service" className={inputClass} /></label>
                    <TagSelect label="Type d’employé" value={String(newAuditeur.id_type_employe || '')} onChange={(next) => setNewAuditeur((current) => ({ ...current, id_type_employe: next }))} options={data.typesEmployes.map((type) => ({ value: String(type.id), label: type.libelle }))} placeholder="Non renseigné" />
                    <label className="text-sm font-semibold text-slate-700">Téléphone<input type="tel" value={newAuditeur.telephone} onChange={(event) => setNewAuditeur((current) => ({ ...current, telephone: event.target.value }))} autoComplete="tel" className={inputClass} /></label>
                    <label className="text-sm font-semibold text-slate-700">E-mail<input type="email" value={newAuditeur.email} onChange={(event) => setNewAuditeur((current) => ({ ...current, email: event.target.value }))} autoComplete="email" className={inputClass} /></label>
                    {!(isAdmin(currentUser) || (currentUser?.permissions?.auditeurs || []).includes('create')) && <p className="sm:col-span-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800">Votre compte peut inscrire les auditeurs existants, mais ne dispose pas du droit de créer un nouveau dossier.</p>}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3"><Sparkles className="h-5 w-5 shrink-0 text-emerald-700" /><div className="min-w-0"><p className="text-xs font-semibold text-emerald-800">Auditeur sélectionné</p><p className="truncate text-sm font-bold text-emerald-950">{selectedAuditeur ? `${selectedAuditeur.prenom} ${selectedAuditeur.nom} · ${selectedAuditeur.matricule}` : '—'}</p></div></div>
                <AffectationFields
                  data={data}
                  yearId={activeYear?.id}
                  value={form}
                  onChange={(next) => setForm((current) => ({ ...current, ...next }))}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TagSelect label="Département" required value={String(form.id_departement || '')} onChange={(next) => setForm((current) => ({ ...current, id_departement: next }))} options={data.departements.map((department) => ({ value: String(department.id), label: department.libelle, hint: department.code }))} placeholder="Sélectionner un département" />
                  <label className="block text-sm font-semibold text-slate-700">Date d’inscription<input required type="date" value={form.date_inscription} onChange={(event) => setForm((current) => ({ ...current, date_inscription: event.target.value }))} className={inputClass} /></label>
                </div>
              </div>
            )}
            <footer className="flex flex-col-reverse justify-between gap-2 border-t border-slate-100 pt-4 sm:flex-row">
              <button type="button" onClick={wizardStep === 1 ? closeForm : () => { setError(''); setWizardStep(1); }} disabled={saving || creatingAuditeur} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">{wizardStep === 1 ? 'Annuler' : <><ArrowLeft size={16} />Retour à l’étape 1</>}</button>
              <button type="submit" disabled={saving || creatingAuditeur || (wizardStep === 2 && (!form.id_auditeur || !form.id_emploi_du_temps || !form.id_departement)) || (wizardStep === 1 && auditeurMode === 'existing' && !data.auditeurs.length)} className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50">{wizardStep === 1 ? (creatingAuditeur ? 'Création du dossier…' : <>Continuer <ArrowRight size={16} /></>) : (saving ? 'Enregistrement…' : <>Confirmer l’inscription <CheckCircle2 size={16} /></>)}</button>
            </footer>
          </form>
        </ModalOverlay>
      )}

      {editing && (
        <ModalOverlay onClose={() => { if (!saving) setEditing(null); }}>
          <form onSubmit={saveEdit} className="max-h-[94vh] w-full max-w-2xl space-y-5 overflow-y-auto border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <header className="flex items-start justify-between border-b border-slate-100 pb-4"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-800">Modifier l’inscription</p><h3 className="mt-1 text-xl font-bold text-slate-900">{editing.inscription.auditeur_prenom} {editing.inscription.auditeur_nom}</h3><p className="mt-1 text-sm text-slate-500">Changer de groupe ou de salle met à jour automatiquement l’année, la session, le jour et le formateur.</p></div><button type="button" onClick={() => setEditing(null)} disabled={saving} aria-label="Fermer" className="p-1 text-slate-500"><X size={18} /></button></header>
            {error && <p role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
            <AffectationFields
              data={data}
              yearId={editing.inscription.id_annee}
              keepSessionId={editing.inscription.id_session}
              excludeInscriptionId={editing.inscription.id}
              value={editing}
              onChange={(next) => setEditing((current) => ({ ...current, ...next }))}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <TagSelect label="Département" required value={String(editing.id_departement || '')} onChange={(next) => setEditing((current) => ({ ...current, id_departement: next }))} options={data.departements.map((department) => ({ value: String(department.id), label: department.libelle, hint: department.code }))} />
              <label className="block text-sm font-semibold text-slate-700">Date d’inscription<input required type="date" value={editing.date_inscription} onChange={(event) => setEditing((current) => ({ ...current, date_inscription: event.target.value }))} className={inputClass} /></label>
              <TagSelect label="Statut" required value={editing.statut} onChange={(next) => setEditing((current) => ({ ...current, statut: next }))} options={STATUSES} />
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setEditing(null)} disabled={saving} className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">Annuler</button>
              <button type="submit" disabled={saving || !editing.id_emploi_du_temps} className="rounded-md bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            </footer>
          </form>
        </ModalOverlay>
      )}
    </section>
  );
}

function Metric({ icon: Icon, label, value }) {
  return <article className="flex items-center gap-3 border border-slate-200 bg-white p-4"><span className="bg-teal-50 p-2.5 text-teal-800"><Icon size={18} /></span><div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-900">{value}</p></div></article>;
}
