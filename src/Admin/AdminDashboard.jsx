import { useMemo, useState } from 'react';
import {
  Activity, ArrowDownToLine, ArrowRight, CalendarDays, Check, ClipboardCheck,
  Clock3, GraduationCap, Plus, Search, SquarePen, Trash2, Users, X,
} from 'lucide-react';
import Parametres from './Parametres';
import NotesModule from './EvaluationsNotes';
import FormateursModule from './Formateurs';
import SallesModule from './Salles';
import PresenceModule from './Presences/PresenceModule';
import AuditeursInscriptionsModule from './AuditeursInscriptions';
import EmploisDuTempsModule from './EmploisDuTemps';
import OrganisationPedagogiqueModule from './OrganisationPedagogique';
import TableDeBord from './TableauDeBord';
import UtilisateurModule from './Utilisateur';
import { getPresenceData } from './Presences/presenceData';
import MonProfil from './Utilisateur/MonProfil';
import EspaceFormateur from './Formateurs/EspaceFormateur';
import { useConfirm } from '../composant/confirmContext';
import { useToastNotice } from '../composant/toastContext';

const MODULES = [
  { id: 'organisation-pedagogique', label: 'Organisation Pédagogique', singular: 'Organisation Pédagogique', icon: CalendarDays, fields: [] },
  { id: 'emplois-temps', label: 'Emplois du temps', singular: 'séance', icon: CalendarDays, fields: [
    { key: 'groupe', label: 'Groupe', required: true },
    { key: 'matiere', label: 'Matière / formation' },
    { key: 'date', label: 'Date', type: 'date', required: true },
    { key: 'horaire', label: 'Horaire' },
    { key: 'salle', label: 'Salle' },
    { key: 'formateur', label: 'Formateur' },
  ] },
  { id: 'auditeurs', label: 'Auditeurs & Inscriptions', singular: 'auditeur', icon: GraduationCap, fields: [
    { key: 'nom', label: 'Nom complet', required: true },
    { key: 'matricule', label: 'Matricule' },
    { key: 'email', label: 'E-mail', type: 'email' },
    { key: 'telephone', label: 'Téléphone', type: 'tel' },
    { key: 'groupe', label: 'Groupe / inscription' },
  ] },
  { id: 'formateurs', label: 'Formateurs', singular: 'formateur', icon: Users, fields: [
    { key: 'nom', label: 'Nom complet', required: true },
    { key: 'specialite', label: 'Spécialité' },
    { key: 'email', label: 'E-mail', type: 'email' },
    { key: 'telephone', label: 'Téléphone', type: 'tel' },
  ] },
  { id: 'salles', label: 'Salles', singular: 'salle', icon: Activity, fields: [
    { key: 'nom', label: 'Nom de la salle', required: true },
    { key: 'code', label: 'Code' },
    { key: 'capacite', label: 'Capacité', type: 'number' },
    { key: 'equipement', label: 'Équipements' },
  ] },
  { id: 'evaluations', label: 'Évaluations & Notes', singular: 'évaluation', icon: ClipboardCheck, fields: [
    { key: 'libelle', label: 'Intitulé', required: true },
    { key: 'groupe', label: 'Groupe' },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'bareme', label: 'Barème', type: 'number' },
  ] },
  { id: 'presences', label: 'Présences', singular: 'présence', icon: Check, fields: [
    { key: 'auditeur', label: 'Auditeur', required: true },
    { key: 'groupe', label: 'Groupe' },
    { key: 'date', label: 'Date', type: 'date', required: true },
    { key: 'statut', label: 'Statut', type: 'select', options: ['Présent', 'Absent', 'Retard', 'Excusé'] },
  ] },
];

const makeEmptyData = () => Object.fromEntries(MODULES.map((module) => [module.id, []]));

const AdminDashboard = ({ activeTab = 'overview', setActiveTab, currentUser, onUserUpdated }) => {
  const confirm = useConfirm();
  const [records, setRecords] = useState(makeEmptyData);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [openCreateUser, setOpenCreateUser] = useState(false);
  const [notice, setNotice] = useToastNotice();
  const [formValues, setFormValues] = useState({});
  const activeModule = MODULES.find((module) => module.id === activeTab);
  const visibleRecords = useMemo(() => {
    const rows = records[activeTab] || [];
    const term = search.trim().toLocaleLowerCase('fr');
    if (!term) return rows;
    return rows.filter((record) => Object.values(record).some((value) =>
      String(value ?? '').toLocaleLowerCase('fr').includes(term)
    ));
  }, [activeTab, records, search]);

  if (activeTab === 'overview') {
    return <TableDeBord setActiveTab={setActiveTab} currentUser={currentUser} />;
  }

  if (activeTab === 'profil') {
    const backTab = currentUser?.role_code === 'formateur' || currentUser?.role === 'formateur'
      ? 'espace-formateur'
      : 'overview';
    return <MonProfil currentUser={currentUser} onBack={() => setActiveTab?.(backTab)} onUserUpdated={onUserUpdated} />;
  }

  if (activeTab === 'espace-formateur'
    && (currentUser?.role_code === 'formateur' || currentUser?.role === 'formateur')) {
    return <EspaceFormateur currentUser={currentUser} />;
  }

  if (activeTab === 'presences') {
    return <PresenceModule onBack={() => setActiveTab?.('overview')} currentUser={currentUser} />;
  }

  if (activeTab === 'evaluations') {
    return <NotesModule onBack={() => setActiveTab?.('overview')} currentUser={currentUser} />;
  }

  if (activeTab === 'formateurs') {
    return (
      <FormateursModule
        onBack={() => setActiveTab?.('overview')}
        currentUser={currentUser}
        canCreateUser={currentUser?.role === 'admin'
          || currentUser?.role_code === 'admin'
          || (currentUser?.permissions?.utilisateurs || []).includes('create')}
        onCreateUser={() => {
          setOpenCreateUser(true);
          setActiveTab?.('utilisateurs');
        }}
      />
    );
  }

  if (activeTab === 'salles') {
    return <SallesModule onBack={() => setActiveTab?.('overview')} currentUser={currentUser} />;
  }

  if (activeTab === 'auditeurs') {
    return <AuditeursInscriptionsModule onBack={() => setActiveTab?.('overview')} currentUser={currentUser} />;
  }

  if (activeTab === 'emplois-temps') {
    return <EmploisDuTempsModule onBack={() => setActiveTab?.('overview')} currentUser={currentUser} />;
  }

  if (activeTab === 'organisation-pedagogique') {
    return <OrganisationPedagogiqueModule onBack={() => setActiveTab?.('overview')} currentUser={currentUser} />;
  }

  if (activeTab === 'utilisateurs') {
    return (
      <UtilisateurModule
        onBack={() => setActiveTab?.('overview')}
        currentUser={currentUser}
        openCreateUser={openCreateUser}
        onCreateUserHandled={() => setOpenCreateUser(false)}
      />
    );
  }

  if (activeTab === 'parametres') {
    return <Parametres onBack={() => setActiveTab?.('overview')} />;
  }

  const openForm = (record = null) => {
    setEditing(record);
    setIsFormOpen(true);
    setFormValues(record ? { ...record } : Object.fromEntries(
      (activeModule?.fields || []).map((field) => [field.key, field.options?.[0] || ''])
    ));
  };

  const saveRecord = (event) => {
    event.preventDefault();
    if (!activeModule) return;
    setRecords((current) => {
      const moduleRows = current[activeModule.id] || [];
      const updatedRows = editing
        ? moduleRows.map((row) => row.id === editing.id ? { ...formValues, id: row.id } : row)
        : [...moduleRows, { ...formValues, id: `${Date.now()}-${Math.random()}` }];
      return { ...current, [activeModule.id]: updatedRows };
    });
    setEditing(null);
    setIsFormOpen(false);
    setNotice(`${activeModule.singular} ${editing ? 'mis à jour' : 'ajouté'}.`);
    window.setTimeout(() => setNotice(''), 2800);
  };

  const deleteRecord = async (recordId) => {
    if (!activeModule || !await confirm('Supprimer cet élément ?')) return;
    setRecords((current) => ({
      ...current,
      [activeModule.id]: current[activeModule.id].filter((record) => record.id !== recordId),
    }));
  };

  const exportRows = () => {
    if (!activeModule || visibleRecords.length === 0) return;
    const headers = activeModule.fields.map((field) => field.label);
    const csv = [headers, ...visibleRecords.map((record) => activeModule.fields.map((field) => record[field.key] || ''))]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    link.download = `${activeModule.id}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (!activeModule) {
    const summary = MODULES.map((module) => ({
      ...module,
      count: module.id === 'presences' ? getPresenceData().presences.length : records[module.id].length,
    }));
    return (
      <div className="space-y-7">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Pilotage académique</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Tableau de bord</h1>
            <p className="mt-1 text-sm text-slate-500">Vue d’ensemble des activités de l’académie</p>
          </div>
          <span className="inline-flex items-center gap-2 self-start rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 sm:self-auto">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Mode sans API métier
          </span>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicateurs de gestion">
          {summary.slice(0, 4).map((module) => (
            <button key={module.id} onClick={() => setActiveTab?.(module.id)} className="group flex min-h-28 items-center justify-between border border-slate-200 bg-white p-5 text-left transition hover:border-teal-300 hover:shadow-sm">
              <div><p className="text-xs font-semibold text-slate-500">{module.label}</p><p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{module.count}</p></div>
              <module.icon className="h-5 w-5 text-teal-700 transition group-hover:translate-x-1" />
            </button>
          ))}
        </section>

        <section className="border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div><h2 className="text-sm font-bold text-slate-900">Accès aux modules</h2><p className="mt-1 text-xs text-slate-500">Sélectionnez un espace de gestion</p></div>
            <Clock3 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3">
            {summary.map((module) => (
              <button key={module.id} onClick={() => setActiveTab?.(module.id)} className="flex items-center gap-3 border-b border-r border-slate-100 px-5 py-4 text-left transition hover:bg-slate-50">
                <module.icon className="h-4 w-4 shrink-0 text-teal-700" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{module.label}</span>
                <span className="text-xs tabular-nums text-slate-400">{module.count}</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </button>
            ))}
          </div>
        </section>
        <p className="text-xs leading-5 text-slate-500">Les données ajoutées dans cette interface restent en mémoire jusqu’au rechargement. Le service API métier doit être configuré pour une sauvegarde durable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button onClick={() => setActiveTab?.('overview')} className="mb-3 text-xs font-semibold text-teal-700 hover:text-teal-900">← Tableau de bord</button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-teal-50 text-teal-800"><activeModule.icon className="h-5 w-5" /></div>
            <div><h1 className="text-2xl font-bold tracking-tight text-slate-900">{activeModule.label}</h1><p className="mt-0.5 text-sm text-slate-500">Gestion et suivi des {activeModule.label.toLocaleLowerCase('fr')}</p></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportRows} disabled={!visibleRecords.length} className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ArrowDownToLine className="h-4 w-4" /> Exporter CSV</button>
          <button onClick={() => openForm()} className="inline-flex items-center gap-2 bg-teal-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-900"><Plus className="h-4 w-4" /> Ajouter</button>
        </div>
      </header>

      {notice && <div role="status" className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

      <section className="border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-bold text-slate-900">Registre</p><p className="mt-0.5 text-xs text-slate-500">{visibleRecords.length} résultat{visibleRecords.length > 1 ? 's' : ''}</p></div>
          <label className="relative block w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher dans ce module" className="w-full border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" /></label>
        </div>
        {visibleRecords.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr>{activeModule.fields.map((field) => <th key={field.key} className="px-4 py-3 font-bold">{field.label}</th>)}<th className="px-4 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRecords.map((record) => <tr key={record.id} className="hover:bg-slate-50/70">{activeModule.fields.map((field) => <td key={field.key} className="max-w-64 truncate px-4 py-3 text-slate-700">{record[field.key] || <span className="text-slate-300">—</span>}</td>)}<td className="px-4 py-3"><div className="flex justify-end gap-1"><button aria-label="Modifier" title="Modifier" onClick={() => openForm(record)} className="p-2 text-slate-500 hover:bg-teal-50 hover:text-teal-800"><SquarePen className="h-4 w-4" /></button><button aria-label="Supprimer" title="Supprimer" onClick={() => deleteRecord(record.id)} className="p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center px-5 py-14 text-center"><activeModule.icon className="h-8 w-8 text-slate-300" /><h2 className="mt-3 text-sm font-bold text-slate-700">{search ? 'Aucun résultat' : 'Aucun élément enregistré'}</h2><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{search ? 'Essayez un autre terme de recherche.' : `Ajoutez un premier élément pour commencer la gestion des ${activeModule.label.toLocaleLowerCase('fr')}.`}</p>{!search && <button onClick={() => openForm()} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-teal-800 hover:text-teal-950"><Plus className="h-4 w-4" /> Ajouter {activeModule.singular}</button>}</div>
        )}
      </section>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsFormOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="record-form-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 id="record-form-title" className="text-base font-bold text-slate-900">{editing ? 'Modifier' : 'Ajouter'} : {activeModule.singular}</h2><p className="mt-1 text-xs text-slate-500">Les champs marqués sont obligatoires.</p></div><button onClick={() => setIsFormOpen(false)} aria-label="Fermer" className="p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
            <form onSubmit={saveRecord} className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">{activeModule.fields.map((field) => <label key={field.key} className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-700">{field.label}{field.required && <span className="text-rose-600"> *</span>}</span>{field.type === 'select' ? <select required={field.required} value={formValues[field.key] || ''} onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))} className="w-full border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"><option value="">Sélectionner</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : <input required={field.required} type={field.type || 'text'} min={field.type === 'number' ? 0 : undefined} value={formValues[field.key] || ''} onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))} className="w-full border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100" />}</label>)}</div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setIsFormOpen(false)} className="border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Annuler</button><button type="submit" className="bg-teal-800 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-900">{editing ? 'Enregistrer' : 'Ajouter'}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
