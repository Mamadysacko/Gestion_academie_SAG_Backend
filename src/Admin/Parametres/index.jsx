import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, BookOpen, BriefcaseBusiness, Building2, CalendarDays, ChartNoAxesColumn, ClipboardCheck, Languages, ListChecks, Users } from 'lucide-react';
import manifest from 'virtual:ages-features';
import Configuration from './Configuration';
import { buildConfigSteps } from './configModel';
import AnneesScolaires from '../OrganisationPedagogique/AnneesScolaires';
import Groupes from '../OrganisationPedagogique/Groupes';
import Departements from './Departements';
import Niveaux from './Niveaux';
import TypesFormations from './TypesFormations';
import Sessions from '../OrganisationPedagogique/Sessions';
import ParametresEvaluation from './ParametresEvaluation';
import TypesEmployes from './TypesEmployes';
import { useLanguage } from '../../i18n/useLanguage';
import SubTabNav from '../../composant/SubTabNav';

// `table` relie chaque sous-onglet à sa table : l'ordre des onglets suit les dépendances du schéma SQL.
const dataTabs = [
  { id: 'annees', label: 'Années scolaires', icon: CalendarDays, component: AnneesScolaires, table: 'annees_scolaires' },
  { id: 'groupes', label: 'Groupes', icon: Users, component: Groupes, table: 'groupes' },
  { id: 'departements', labelKey: 'departments', icon: Building2, component: Departements, table: 'departements' },
  { id: 'niveaux', labelKey: 'levels', icon: ChartNoAxesColumn, component: Niveaux, table: 'niveaux' },
  { id: 'types', labelKey: 'trainingTypes', icon: BookOpen, component: TypesFormations, table: 'types_formations' },
  { id: 'types-employes', labelKey: 'employeeTypes', icon: BriefcaseBusiness, component: TypesEmployes, table: 'types_employes' },
  { id: 'sessions', labelKey: 'sessions', icon: CalendarDays, component: Sessions, table: 'sessions' },
  { id: 'evaluations', labelKey: 'evaluationSettings', icon: ClipboardCheck, component: ParametresEvaluation, table: 'parametres' },
];

const configOrder = buildConfigSteps(manifest.schema).map((step) => step.id);
const tabs = [
  { id: 'configuration', label: 'Configuration', icon: ListChecks, component: Configuration },
  ...[...dataTabs].sort((a, b) => configOrder.indexOf(a.table) - configOrder.indexOf(b.table)),
];

export default function Parametres({ onBack, initialTab, currentUser }) {
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState(tabs.some((tab) => tab.id === initialTab) ? initialTab : tabs[0].id);
  const currentTab = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const ActiveSection = currentTab.component;

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:text-teal-950"><ArrowLeft className="h-3.5 w-3.5" /> {t('backToDashboard')}</button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-teal-800">{t('academicAdministration')}</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{t('settings')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('settingsDescription')}</p>
          </div>
          <span className="border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 rounded">
            {tabs.length} {t('modulesConnected')}
          </span>
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-teal-50 p-2 text-teal-700"><Languages className="h-4 w-4" /></span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">{t('languageSettings')}</h2>
            <p className="mt-1 text-xs text-slate-500">{t('languageSettingsDescription')}</p>
            <p className="mt-1 text-[11px] text-slate-400">{t('languageSavedLocally')}</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <span>{t('language')}</span>
          <select
            aria-label={t('language')}
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            <option value="fr">{t('french')}</option>
            <option value="en">{t('english')}</option>
          </select>
        </label>
      </section>

      <SubTabNav label="Sous-onglets des paramètres" items={tabs.map((tab) => ({ ...tab, label: tab.label || t(tab.labelKey) }))} active={activeTab} onChange={setActiveTab} />

      <AnimatePresence mode="wait">
        <motion.div key={currentTab.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
          <ActiveSection currentUser={currentUser} onOpenTab={setActiveTab} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}