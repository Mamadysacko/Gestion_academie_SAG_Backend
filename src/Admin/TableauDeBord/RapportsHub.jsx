import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpenCheck, Building2, ClipboardCheck, FileSpreadsheet, GraduationCap, LayoutDashboard, Medal, Printer, RefreshCw, Users } from 'lucide-react';
import {
  departementsApi, formateursApi, groupesApi, niveauxApi, rapportsApi, sallesApi, typesEmployesApi,
} from '../../config/apiService';
import TagSelect from '../../composant/TagSelect';
import { useLiveRefresh } from '../../composant/useLiveRefresh';
import { useToast } from '../../composant/toastContext';
import { printElements } from '../../utils/print';
import { exportWorkbook } from '../../utils/exportExcel';
import { buildReportCharts } from '../../utils/reportCharts';
import RapportDocument from './RapportDocument';

const CATEGORIES = [
  { id: 'auditeurs', label: 'Auditeurs', icon: Users },
  { id: 'presences', label: 'Présences', icon: ClipboardCheck },
  { id: 'notes', label: 'Notes & évaluations', icon: BookOpenCheck },
  { id: 'passages', label: 'Passage de niveau', icon: Medal },
  { id: 'formateurs', label: 'Formateurs', icon: GraduationCap },
  { id: 'salles', label: 'Salles & emplois du temps', icon: Building2 },
  { id: 'admin', label: 'Administratifs & statistiques', icon: LayoutDashboard },
];

const PERIODS = [
  { value: 'journalier', label: 'Journalier' }, { value: 'hebdomadaire', label: 'Hebdomadaire' }, { value: 'mensuel', label: 'Mensuel' },
  { value: 'annuel', label: 'Annuel (année scolaire)' }, { value: 'libre', label: 'Période libre' },
];
const DAYS = [1, 2, 3, 4, 5].map((value) => ({ value: String(value), label: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'][value - 1] }));
const STATUSES = [{ value: 'active', label: 'Active' }, { value: 'terminee', label: 'Terminée' }, { value: 'abandonnee', label: 'Abandonnée' }, { value: 'annulee', label: 'Annulée' }];
const NUMBERS = [1, 2, 3, 4, 5].map((value) => ({ value: String(value), label: `Évaluation ${value}` }));

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const rows = (response) => (Array.isArray(response?.data) ? response.data : []);

/**
 * Rapports : 7 sous-onglets (auditeurs, présences, notes, passages, formateurs, salles, administratifs),
 * chacun avec ses analyses et ses filtres, prévisualisation A4 paysage, export PDF (impression) et Excel.
 */
export default function RapportsHub({ annees = [], sessions = [], selectedAnnee = '', selectedSession = '' }) {
  const toast = useToast();
  const [category, setCategory] = useState('auditeurs');
  const [catalogue, setCatalogue] = useState({ rapports: [] });
  const [refs, setRefs] = useState({ niveaux: [], groupes: [], salles: [], formateurs: [], departements: [], types: [] });
  const [codes, setCodes] = useState({});
  const [filters, setFilters] = useState({ id_annee: String(selectedAnnee || ''), id_session: String(selectedSession || '') });
  const [periodType, setPeriodType] = useState('');
  const [date, setDate] = useState(todayIso());
  const [month, setMonth] = useState(todayIso().slice(0, 7));
  const [from, setFrom] = useState(`${todayIso().slice(0, 7)}-01`);
  const [to, setTo] = useState(todayIso());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const doc = useRef(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      rapportsApi.catalogue(), niveauxApi.getAll().catch(() => ({})), groupesApi.getAll().catch(() => ({})), sallesApi.getAll().catch(() => ({})),
      formateursApi.getAll().catch(() => ({})), departementsApi.getAll().catch(() => ({})), typesEmployesApi.getAll().catch(() => ({})),
    ]).then(([cat, niveaux, groupes, salles, formateurs, departements, types]) => {
      if (!active) return;
      setCatalogue(cat.data);
      setRefs({ niveaux: rows(niveaux), groupes: rows(groupes), salles: rows(salles), formateurs: rows(formateurs), departements: rows(departements), types: rows(types) });
    }).catch((loadError) => { if (active) setError(loadError.message || 'Impossible de charger le catalogue des rapports.'); });
    return () => { active = false; };
  }, []);

  const reports = useMemo(() => catalogue.rapports.filter((item) => item.categorie === category), [catalogue, category]);
  const code = codes[category] && reports.some((item) => item.code === codes[category]) ? codes[category] : reports[0]?.code || '';
  const definition = reports.find((item) => item.code === code) || null;
  const usesPeriod = definition?.filtres.includes('periode');
  const effectivePeriod = periodType || definition?.periode_par_defaut || 'annuel';

  const params = useMemo(() => {
    if (!definition) return null;
    const out = {};
    definition.filtres.forEach((key) => { if (key !== 'periode' && filters[key]) out[key] = filters[key]; });
    if (usesPeriod) {
      out.periode = effectivePeriod;
      if (['journalier', 'hebdomadaire'].includes(effectivePeriod)) out.date = date;
      if (effectivePeriod === 'mensuel') out.mois = month;
      if (effectivePeriod === 'libre') { out.date_debut = from; out.date_fin = to; }
    }
    return out;
  }, [date, definition, effectivePeriod, filters, from, month, to, usesPeriod]);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!code || !params) return;
    if (effectivePeriod === 'libre' && usesPeriod && (!from || !to || to < from)) return;
    if (!silent) setLoading(true);
    try {
      const response = await rapportsApi.generate(code, params);
      setReport(response.data);
      setError('');
    } catch (loadError) {
      if (!silent) { setReport(null); setError(loadError.message || 'Impossible de générer ce rapport.'); }
    } finally {
      setLoading(false);
    }
  }, [code, effectivePeriod, from, params, to, usesPeriod]);

  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);
  useLiveRefresh(() => load({ silent: true }), { intervalMs: 60000 });

  const set = (key) => (value) => setFilters((current) => ({
    ...current, [key]: value, ...(key === 'id_annee' ? { id_session: '', id_groupe: '' } : {}), ...(key === 'id_session' ? { id_groupe: '' } : {}),
  }));

  const options = {
    id_annee: annees.map((item) => ({ value: String(item.id), label: item.libelle })),
    id_session: sessions.filter((item) => !filters.id_annee || String(item.id_annee) === filters.id_annee).map((item) => ({ value: String(item.id), label: `${item.code} · ${item.libelle}` })),
    id_niveau: refs.niveaux.map((item) => ({ value: String(item.id), label: item.libelle })),
    id_groupe: refs.groupes.filter((item) => !filters.id_session || String(item.id_session) === filters.id_session).map((item) => ({ value: String(item.id), label: `${item.code} · ${item.libelle}` })),
    id_salle: refs.salles.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.libelle}` })),
    id_formateur: refs.formateurs.map((item) => ({ value: String(item.id), label: `${item.prenom} ${item.nom}`, hint: item.matricule })),
    id_departement: refs.departements.map((item) => ({ value: String(item.id), label: item.libelle, hint: item.code })),
    id_type_employe: refs.types.map((item) => ({ value: String(item.id), label: item.libelle })),
    statut: STATUSES, jour_semaine: DAYS, numero: NUMBERS,
  };
  const LABELS = {
    id_annee: 'Année scolaire', id_session: 'Session', id_niveau: 'Niveau', id_groupe: 'Groupe', id_salle: 'Salle', id_formateur: 'Formateur',
    id_departement: 'Département', id_type_employe: 'Type d’employeur', statut: 'Statut d’inscription', jour_semaine: 'Jour', numero: 'Évaluation',
  };
  const filterKeys = (definition?.filtres || []).filter((key) => key !== 'periode');

  const exportPdf = () => {
    if (!report) return;
    printElements(doc.current, report.titre, { orientation: 'landscape', margin: '8mm', branded: false });
  };

  const exportExcel = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await exportWorkbook({
        filename: `${report.code}-${todayIso()}`,
        sheets: [{
          name: report.titre, title: report.titre,
          subtitle: `${report.categorie_libelle}${report.periode ? ` · ${report.periode.libelle}` : ''}`,
          filters: report.filtres, summary: report.resume, sections: report.sections, charts: buildReportCharts(report),
        }],
      });
      toast.success('Le fichier Excel a été généré (A4 paysage, avec logos et pied de page).');
    } catch (exportError) {
      toast.error(exportError.message || 'L’export Excel a échoué.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="space-y-5">
      <nav aria-label="Catégories de rapports" className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm print:hidden">
        {CATEGORIES.map((item) => {
          const Icon = item.icon;
          const active = category === item.id;
          return (
            <button key={item.id} type="button" onClick={() => setCategory(item.id)} aria-current={active ? 'page' : undefined} className={`relative inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${active ? 'text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {active && <motion.span layoutId="rapports-cat" className="absolute inset-0 rounded-xl bg-blue-700" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <Icon className="relative h-4 w-4" /><span className="relative">{item.label}</span>
              <span className={`relative rounded-full px-1.5 text-[10px] ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{catalogue.rapports.filter((r) => r.categorie === item.id).length}</span>
            </button>
          );
        })}
      </nav>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1 lg:max-w-xl">
            <TagSelect label="Analyse" required value={code} onChange={(value) => { setCodes((current) => ({ ...current, [category]: value })); setPeriodType(''); }} options={reports.map((item) => ({ value: item.code, label: item.titre }))} placeholder="Choisir un rapport" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualiser</button>
            <button type="button" onClick={exportPdf} disabled={!report} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Printer className="h-4 w-4" />PDF / Imprimer</button>
            <button type="button" onClick={exportExcel} disabled={!report || exporting} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><FileSpreadsheet className="h-4 w-4" />{exporting ? 'Génération…' : 'Excel'}</button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {usesPeriod && <>
            <TagSelect label="Période" required value={effectivePeriod} onChange={setPeriodType} options={PERIODS} />
            {['journalier', 'hebdomadaire'].includes(effectivePeriod) && <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Date de référence<input type="date" value={date} onChange={(event) => event.target.value && setDate(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800" /></label>}
            {effectivePeriod === 'mensuel' && <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Mois<input type="month" value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800" /></label>}
            {effectivePeriod === 'libre' && <>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Du<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800" /></label>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Au<input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800" /></label>
            </>}
          </>}
          {filterKeys.map((key) => <TagSelect key={key} label={LABELS[key]} value={filters[key] || ''} onChange={set(key)} options={options[key] || []} placeholder="Tous" />)}
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
      {loading && !report ? <div role="status" className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Génération du rapport…</div> : (
        <AnimatePresence mode="wait">
          {report && (
            <motion.div key={report.code} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-x-auto rounded-2xl bg-slate-200 p-4 print:bg-white print:p-0">
              <RapportDocument ref={doc} report={report} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </section>
  );
}
