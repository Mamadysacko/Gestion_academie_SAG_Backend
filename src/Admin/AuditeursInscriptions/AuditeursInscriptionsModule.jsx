import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  GraduationCap,
  BarChart3,
  Plus,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
} from 'lucide-react';
import { anneesScolairesApi, auditeursApi, emploisApi, groupesApi, inscriptionsApi, positionsApi, sessionsApi, typesEmployesApi } from '../../config/apiService';
import { useConfirm } from '../../composant/confirmContext';
import { useLiveRefresh } from '../../composant/useLiveRefresh';
import { getCurrentSchoolYear } from '../../utils/schoolYear';
import { calculateStatistics } from './auditeursHelpers';
import ListeAuditeurs from './ListeAuditeurs';
import InscriptionsGestion from './InscriptionsGestion';
import StatistiquesAuditeurs from './StatistiquesAuditeurs';
import FormAuditeurDialog from './FormAuditeurDialog';
import StatutChangeDialog from './StatutChangeDialog';
import DossierAuditeurComplet from './DossierAuditeurComplet';
import { useToastNotice } from '../../composant/toastContext';
import SubTabNav from '../../composant/SubTabNav';

const TABS = [
  { id: 'liste', label: 'Liste des auditeurs', icon: Users },
  { id: 'inscriptions', label: 'Inscriptions & Classes', icon: GraduationCap },
  { id: 'statistiques', label: 'Statistiques & Indicateurs', icon: BarChart3 },
];

const EMPTY_DATA = {
  annees: [], groupes: [], auditeurs: [],
  inscriptions: [], historique_statuts: [], presences: [], typesEmployes: [], positions: [],
};
const STATUS_TO_LEGACY = { active: 'Active', terminee: 'Terminée', abandonnee: 'Abandonnée', annulee: 'Annulée' };
const STATUS_TO_DATABASE = { Active: 'active', Terminée: 'terminee', Abandonnée: 'abandonnee', Annulée: 'annulee' };
const list = (response) => Array.isArray(response?.data) ? response.data : [];

export default function AuditeursInscriptionsModule({ onBack, currentUser, initialTab }) {
  const confirm = useConfirm();
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab || 'liste');

  // Notices and errors
  const [notice, setNotice] = useToastNotice();
  const [error, setError] = useState('');

  // Dialogs state
  const [auditeurDialog, setAuditeurDialog] = useState(null); // { auditeur: null | obj }
  const [registrationAuditeurId, setRegistrationAuditeurId] = useState(null);
  const [openRegistrationWizard, setOpenRegistrationWizard] = useState(false);
  const [registrationWizardRequest, setRegistrationWizardRequest] = useState(0);
  const [statutDialog, setStatutDialog] = useState(null); // { inscription: obj, auditeur: obj, groupe: obj }
  const [dossierDialog, setDossierDialog] = useState(null); // { auditeur: obj }

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [auditeursResponse, yearsResponse, groupsResponse, sessionsResponse, schedulesResponse, enrollmentsResponse, typesResponse, positionsResponse] = await Promise.all([
        auditeursApi.getAll(),
        anneesScolairesApi.getAll(),
        groupesApi.getAll(),
        sessionsApi.getAll(),
        emploisApi.getAll(),
        inscriptionsApi.getAll(),
        typesEmployesApi.getAll().catch(() => ({ data: [] })),
        positionsApi.getAll().catch(() => ({ data: [] })),
      ]);
      const annees = list(yearsResponse).map((row) => ({ ...row, id: Number(row.id), statut: Number(row.statut) }));
      const sessions = list(sessionsResponse).map((row) => ({ ...row, id: Number(row.id), id_annee: Number(row.id_annee) }));
      const groupes = list(groupsResponse).map((row) => {
        const session = sessions.find((item) => Number(item.id) === Number(row.id_session));
        const schedule = list(schedulesResponse).find((item) => Number(item.id_groupe) === Number(row.id));
        return {
          ...row,
          id: Number(row.id),
          id_annee: session?.id_annee,
          formation: session?.libelle || '',
          jour_semaine: Number(row.jour_semaine),
          capacite: row.capacite == null ? null : Number(row.capacite),
          statut: Number(row.statut),
          salle: schedule?.salle_libelle || '',
          formateur: `${schedule?.formateur_prenom || ''} ${schedule?.formateur_nom || ''}`.trim(),
        };
      });
      const inscriptions = list(enrollmentsResponse).map((row) => ({
        ...row,
        id: Number(row.id),
        id_auditeur: Number(row.id_auditeur),
        id_emploi_du_temps: Number(row.id_emploi_du_temps),
        id_groupe: Number(row.id_groupe),
        id_annee: Number(row.id_annee),
        id_departement: Number(row.id_departement),
        statut: STATUS_TO_LEGACY[row.statut] || row.statut,
      }));
      setData({
        ...EMPTY_DATA,
        annees,
        groupes,
        auditeurs: list(auditeursResponse).map((row) => ({ ...row, id: Number(row.id) })),
        inscriptions,
        typesEmployes: list(typesResponse).map((row) => ({ ...row, id: Number(row.id) })),
        positions: list(positionsResponse).map((row) => ({ ...row, id: Number(row.id) })),
      });
      setError('');
    } catch (loadError) {
      if (!silent) setError(loadError.message || 'Impossible de charger les auditeurs et leurs inscriptions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => loadData());
  }, [loadData]);
  useLiveRefresh(() => loadData({ silent: true }), { intervalMs: 45000 });

  const showNotice = (msg) => {
    setNotice(msg);
  };

  const activeYear = getCurrentSchoolYear(data.annees);

  const withoutActive = useMemo(() => {
    const active = new Set(data.inscriptions.filter((item) => item.statut === 'Active').map((item) => item.id_auditeur));
    return data.auditeurs.filter((item) => !active.has(item.id)).length;
  }, [data.auditeurs, data.inscriptions]);

  // Quick statistics for the top banner
  const quickStats = useMemo(() => {
    return calculateStatistics(data, activeYear?.id);
  }, [data, activeYear]);

  // Handlers Auditeur
  const handleSaveAuditeur = async (formValues) => {
    const fullName = `${formValues.nom.trim()} ${formValues.prenom.trim()}`;
    if (!(await confirm(formValues.id
      ? { title: 'Enregistrer les modifications ?', message: `Les informations de ${fullName} seront mises à jour.`, tone: 'warning' }
      : { title: 'Créer ce dossier auditeur ?', message: `${fullName} (matricule ${formValues.matricule.trim()}) sera enregistré dans la base.`, tone: 'primary' }))) {
      return null;
    }
    try {
      const payload = {
        matricule: formValues.matricule.trim(),
        nom: formValues.nom.trim(),
        prenom: formValues.prenom.trim(),
        sexe: formValues.sexe || null,
        telephone: formValues.telephone.trim() || null,
        email: formValues.email.trim() || null,
        id_position: formValues.id_position ? Number(formValues.id_position) : null,
        id_type_employe: formValues.id_type_employe ? Number(formValues.id_type_employe) : null,
      };
      let auditeurId = formValues.id ? Number(formValues.id) : null;
      if (formValues.id) await auditeursApi.update(formValues.id, payload);
      else {
        const response = await auditeursApi.create(payload);
        auditeurId = Number(response?.data?.id) || null;
      }
      await loadData({ silent: true });

      setError('');
      showNotice(`Auditeur ${formValues.id ? 'mis à jour' : 'créé'} avec succès.`);
      return auditeurId;
    } catch (err) {
      setError(err.message || 'Erreur lors de l’enregistrement de l’auditeur.');
      throw err;
    }
  };

  const handleDeleteAuditeur = async (auditeur) => {
    if (!(await confirm({
      title: 'Supprimer cet auditeur ?',
      message: `${auditeur.nom} ${auditeur.prenom} (matricule ${auditeur.matricule}) sera supprimé définitivement.\nUn auditeur qui possède des inscriptions ne peut pas être supprimé.`,
      tone: 'danger',
    }))) {
      return;
    }
    try {
      await auditeursApi.delete(auditeur.id);
      await loadData({ silent: true });
      setError('');
      showNotice('Auditeur supprimé.');
    } catch (err) {
      setError(err.message || 'Impossible de supprimer cet auditeur.');
    }
  };

  // Handlers Inscription
  const handleChangeStatut = async (id_inscription, nouveau_statut) => {
    if (!(await confirm({
      title: 'Modifier le statut de l’inscription ?',
      message: `Le statut passera à « ${nouveau_statut} ».`,
      tone: 'warning',
    }))) {
      return;
    }
    try {
      await inscriptionsApi.changeStatut(id_inscription, { statut: STATUS_TO_DATABASE[nouveau_statut] || nouveau_statut });
      await loadData({ silent: true });
      setError('');
      showNotice(`Statut mis à jour vers « ${nouveau_statut} ».`);
    } catch (err) {
      setError(err.message || 'Erreur lors du changement de statut.');
      throw err;
    }
  };

  const openRegistration = useCallback((auditeur) => {
    setError('');
    setRegistrationAuditeurId(auditeur?.id ? Number(auditeur.id) : null);
    setOpenRegistrationWizard(true);
    setRegistrationWizardRequest((request) => request + 1);
    setActiveTab('inscriptions');
  }, []);
  const clearRegistrationAuditeur = useCallback(() => {
    setRegistrationAuditeurId(null);
    setOpenRegistrationWizard(false);
  }, []);


  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation & Breadcrumbs */}
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mb-2 text-xs font-semibold text-teal-800 hover:text-teal-950 transition"
            >
              ← Retour au tableau de bord
            </button>
          )}
          <p className="text-xs font-bold uppercase tracking-wider text-teal-800">
            Gestion Scolaire & Vie de l’Académie
          </p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Auditeurs & Inscriptions
            </h1>
            <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-800 border border-teal-200">
              Année {activeYear?.libelle || '2026-2027'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Gestion complète des dossiers élèves, inscriptions en classe, transferts et statistiques.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={loadData} disabled={loading} title="Actualiser depuis la base de données" className="inline-flex items-center gap-1.5 border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Actualiser</button>
          <button
            type="button"
            onClick={() => openRegistration(null)}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 transition"
          >
            <Plus className="h-4 w-4" />
            Nouvel auditeur · Inscription
          </button>
        </div>
      </header>

      {/* Quick Stats Ribbon */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Total Auditeurs</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{quickStats.totalAuditeurs}</p>
          <p className="mt-1 text-[11px] text-slate-400">Base académique enregistrée</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Inscrits Actifs</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{quickStats.totalInscritsActifs}</p>
          <p className="mt-1 text-[11px] text-emerald-600 font-medium">Présents en classe · {activeYear?.libelle}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Taux de Remplissage</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">{quickStats.globalRate}%</p>
          <p className="mt-1 text-[11px] text-slate-400">{quickStats.totalEnrolled} / {quickStats.totalCapacity} places pourvues</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Sans inscription active</p>
          <p className="mt-1 text-2xl font-bold text-purple-700">{withoutActive}</p>
          <p className="mt-1 text-[11px] text-purple-600 font-medium">Auditeurs à inscrire dans une session</p>
        </div>
      </section>

      {/* Alert / Notice Display */}
      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError('')} aria-label="Fermer" className="shrink-0 p-1 text-rose-500 hover:text-rose-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900 shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <SubTabNav label="Sous-sections Auditeurs & Inscriptions" items={TABS} active={activeTab} onChange={(id) => { setActiveTab(id); setError(''); }} />

      {/* Tab Panels */}
      {loading && <div role="status" className="border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Chargement des données depuis le serveur…</div>}
      {!loading && activeTab === 'liste' && (
        <ListeAuditeurs
          data={data}
          currentUser={currentUser}
          onNewAuditeur={() => openRegistration(null)}
          onEditAuditeur={(auditeur) => {
            setError('');
            setAuditeurDialog({ auditeur });
          }}
          onDeleteAuditeur={handleDeleteAuditeur}
          onOpenDossier={(auditeur) => {
            setDossierDialog({ auditeur });
          }}
          onOpenInscription={(auditeur) => {
            setError('');
            openRegistration(auditeur);
          }}
          onOpenStatutChange={(inscription, auditeur, groupe) => {
            setError('');
            setStatutDialog({ inscription, auditeur, groupe });
          }}
        />
      )}

      {activeTab === 'inscriptions' && (
        <InscriptionsGestion
          key={registrationWizardRequest}
          currentUser={currentUser}
          initialAuditeurId={registrationAuditeurId}
          openOnMount={openRegistrationWizard}
          onInitialAuditeurConsumed={clearRegistrationAuditeur}
          onCreateAuditeur={handleSaveAuditeur}
        />
      )}

      {!loading && activeTab === 'statistiques' && (
        <StatistiquesAuditeurs data={data} />
      )}

      {/* Modals */}
      {auditeurDialog && (
        <FormAuditeurDialog
          isOpen={true}
          onClose={() => setAuditeurDialog(null)}
          onSave={handleSaveAuditeur}
          auditeur={auditeurDialog.auditeur}
          auditeurs={data.auditeurs}
          activeYear={activeYear}
          typesEmployes={data.typesEmployes}
          positions={data.positions}
        />
      )}

      {statutDialog && (
        <StatutChangeDialog
          isOpen={true}
          onClose={() => setStatutDialog(null)}
          onChangeStatut={handleChangeStatut}
          inscription={statutDialog.inscription}
          auditeur={statutDialog.auditeur}
          groupe={statutDialog.groupe}
        />
      )}

      {dossierDialog && (
        <DossierAuditeurComplet
          auditeurId={dossierDialog.auditeur.id}
          onClose={() => setDossierDialog(null)}
          onEdit={(auditeur) => setAuditeurDialog({ auditeur: data.auditeurs.find((item) => item.id === Number(auditeur.id)) || auditeur })}
          onInscrire={(auditeur) => { setDossierDialog(null); openRegistration(auditeur); }}
        />
      )}
    </div>
  );
}
