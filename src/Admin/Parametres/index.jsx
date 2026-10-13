import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, BookOpen, BriefcaseBusiness, Building2, Scale, Star, CalendarDays, ChartNoAxesColumn, ClipboardCheck, Languages } from 'lucide-react';
import Departements from './Departements';
import Niveaux from './Niveaux';
import TypesFormations from './TypesFormations';
import Sessions from './Sessions';
import ParametresEvaluation from './ParametresEvaluation';
import TypesEmployes from './TypesEmployes';
import ReglesPassage from './ReglesPassage';
import BaremesAppreciation from './BaremesAppreciation';
import { useLanguage } from '../../i18n/useLanguage';

const tabs = [
  { id: 'departements', labelKey: 'departments', icon: Building2, component: Departements },
  { id: 'niveaux', labelKey: 'levels', icon: ChartNoAxesColumn, component: Niveaux },
  { id: 'types', labelKey: 'trainingTypes', icon: BookOpen, component: TypesFormations },
  { id: 'types-employes', labelKey: 'employeeTypes', icon: BriefcaseBusiness, component: TypesEmployes },
  { id: 'sessions', labelKey: 'sessions', icon: CalendarDays, component: Sessions },
  { id: 'evaluations', labelKey: 'evaluationSettings', icon: ClipboardCheck, component: ParametresEvaluation },
  { id: 'regles', label: 'Règles d’évaluation', icon: Scale, component: ReglesPassage },
  { id: 'baremes', label: 'Barème d’appréciation', icon: Star, component: BaremesAppreciation },
];

export default function Parametres({ onBack }) {
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState(tabs[0].id);
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

      <nav aria-label="Sous-onglets des paramètres" className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = tab.id === activeTab;
          return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} aria-current={selected ? 'page' : undefined} className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-xs font-semibold transition ${selected ? 'border-teal-700 text-teal-900' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'}`}>
            <Icon className="h-4 w-4" />{tab.label || t(tab.labelKey)}
          </button>;
        })}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div key={currentTab.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
          <ActiveSection />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}