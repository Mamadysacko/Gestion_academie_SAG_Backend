import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, BookOpen, ChevronRight, Compass, GitBranch, Lock, Route, Search, Sparkles, X } from 'lucide-react';
import manifest from 'virtual:ages-features';
import { AIDE_QUERY_KEY, useCatalog } from './useCatalog';
import FeatureSheet from './FeatureSheet';
import ModalOverlay from '../composant/ModalOverlay';
import JourneyView from './JourneyView';
import DependencyMap from './DependencyMap';

const PANELS = [
  { id: 'guide', label: 'Fonctionnalités', icon: BookOpen },
  { id: 'journeys', label: 'Parcours guidés', icon: Route },
];

const EXAMPLES = [
  'Comment inscrire un nouvel auditeur ?',
  'Comment créer une session de formation ?',
  'Comment saisir les notes d’une évaluation ?',
  'Pourquoi ne puis-je pas enregistrer une inscription ?',
];

/** Vrai sous 1024 px : la fiche s'affiche alors en fenêtre plutôt que dans la colonne de droite. */
function useNarrowScreen() {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia('(max-width: 1023px)');
      query.addEventListener('change', notify);
      return () => query.removeEventListener('change', notify);
    },
    () => window.matchMedia('(max-width: 1023px)').matches,
    () => false,
  );
}

function readInitialQuery() {
  try {
    const stored = window.sessionStorage.getItem(AIDE_QUERY_KEY) || '';
    window.sessionStorage.removeItem(AIDE_QUERY_KEY);
    return stored;
  } catch {
    return '';
  }
}

function FeatureRow({ feature, selected, onSelect, hint }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(feature)}
      data-feature-id={feature.id}
      aria-current={selected ? 'true' : undefined}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${selected ? 'border-brand-gold bg-brand-gold-light/25' : 'border-slate-200 bg-white hover:border-brand-gold/60 hover:shadow-sm'}`}
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-slate-900">{feature.title}</span>
          {feature.type === 'action' && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">Bouton</span>}
          {!feature.allowed && <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500"><Lock className="h-3 w-3" />Droits requis</span>}
        </span>
        <span className="mt-0.5 block text-[11px] font-semibold text-brand-gold">{feature.path.join(' › ')}</span>
        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-600">{hint || feature.summary}</span>
      </span>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
    </button>
  );
}

/**
 * Guide d'aide : recherche en langage naturel, catalogue des fonctionnalités détectées dans le code,
 * parcours guidés, carte des dépendances et erreurs fréquentes. Tout s'adapte aux droits de l'utilisateur.
 */
export default function AidePage({ currentUser, onNavigate }) {
  const catalog = useCatalog(currentUser);
  const narrow = useNarrowScreen();
  const [query, setQuery] = useState(readInitialQuery);
  const [panel, setPanel] = useState('guide');
  const [openModule, setOpenModule] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [errorModule, setErrorModule] = useState('');
  const [errorFilter, setErrorFilter] = useState('');

  const found = useMemo(() => (query.trim() ? catalog.search(query, { limit: 14 }) : null), [catalog, query]);
  const selected = catalog.features.find((feature) => feature.id === selectedId) || null;
  const selectedHits = found?.results.find((item) => item.feature.id === selectedId)?.errorHits || [];

  const errorList = useMemo(() => {
    const term = errorFilter.trim().toLowerCase();
    return catalog.modules
      .filter((module) => !errorModule || module.id === errorModule)
      .flatMap((module) => module.errors.map((error) => ({ ...error, moduleLabel: module.title })))
      .filter((error) => !term || error.message.toLowerCase().includes(term));
  }, [catalog, errorModule, errorFilter]);

  useEffect(() => {
    if (!selected) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setSelectedId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const select = (feature) => setSelectedId(feature.id);
  const moduleFeatures = (moduleId) => catalog.features.filter((feature) => feature.moduleId === moduleId && feature.type === 'subtab');

  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-charcoal via-slate-800 to-brand-bordeaux p-5 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand-gold/25 blur-3xl" aria-hidden="true" />
        <span className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-brand-gold via-brand-gold-light to-brand-gold" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold-light"><Sparkles className="h-3.5 w-3.5" />Aide & guide</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Que souhaitez-vous faire ?</h1>
          <p className="mt-2 text-sm text-slate-300">Posez votre question : le guide vous indique où aller, quoi préparer avant, et vérifie vos données.</p>
          <label className="relative mt-5 block">
            <span className="sr-only">Votre question</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPanel('guide'); }}
              placeholder="Ex. : Comment inscrire un nouvel auditeur ?"
              autoFocus
              className="w-full rounded-2xl border-0 bg-white py-3.5 pl-12 pr-10 text-base text-slate-900 shadow-xl outline-none ring-2 ring-transparent transition focus:ring-brand-gold-light"
            />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Effacer la question" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
          </label>
          {!query && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((example) => (
                <button key={example} type="button" onClick={() => setQuery(example)} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-white/20">{example}</button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm" role="tablist" aria-label="Sections de l’aide">
        {PANELS.map((item) => {
          const Icon = item.icon;
          const active = panel === item.id;
          return (
            <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => setPanel(item.id)} className={`relative inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${active ? 'text-brand-charcoal' : 'text-slate-500 hover:text-slate-800'}`}>
              {active && <motion.span layoutId="aide-panel" className="absolute inset-0 rounded-xl bg-brand-gold-light/60" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <Icon className="relative h-4 w-4" /><span className="relative">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
        <main className="min-w-0 space-y-4">
          {panel === 'guide' && found && (
            <>
              {found.journeys.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Parcours guidés proposés</h2>
                  {found.journeys.map((journey) => (
                    <button key={journey.id} type="button" onClick={() => { setQuery(''); setPanel('journeys'); }} className="flex w-full items-center justify-between gap-3 rounded-xl border border-brand-gold/50 bg-brand-gold-light/20 p-3 text-left transition hover:bg-brand-gold-light/40">
                      <span><span className="block text-sm font-bold text-slate-900">{journey.title}</span><span className="text-xs text-slate-600">{journey.steps.length} étapes · état de vos données vérifié</span></span>
                      <Route className="h-4 w-4 shrink-0 text-brand-gold" />
                    </button>
                  ))}
                </section>
              )}
              <section className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{found.results.length} résultat(s)</h2>
                {found.results.map(({ feature, errorHits }) => (
                  <FeatureRow key={feature.id} feature={feature} selected={feature.id === selectedId} onSelect={select} hint={errorHits[0]?.message ? `Cause possible : ${errorHits[0].message}` : undefined} />
                ))}
                {!found.results.length && (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Aucune fonctionnalité ne correspond à « {query} ». Reformulez avec d’autres mots (ex. « inscription », « salle », « notes »).</p>
                )}
              </section>
            </>
          )}

          {panel === 'guide' && !found && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500"><Compass className="h-4 w-4" />Parcourir par onglet principal</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {catalog.modules.map((module) => {
                  const Icon = module.icon;
                  const features = moduleFeatures(module.id);
                  const expanded = openModule === module.id;
                  return (
                    <div key={module.id} className={`rounded-2xl border bg-white shadow-sm transition ${expanded ? 'border-brand-gold sm:col-span-2' : 'border-slate-200'}`}>
                      <button type="button" data-module-id={module.id} onClick={() => { setOpenModule(expanded ? null : module.id); if (!expanded) select(module); }} aria-expanded={expanded} className="flex w-full items-start gap-3 p-4 text-left">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-charcoal text-brand-gold-light"><Icon className="h-5 w-5" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-slate-900">{module.title}</span>
                          <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-slate-600">{module.summary}</span>
                          <span className="mt-1 block text-[11px] font-semibold text-brand-gold">{features.length ? `${features.length} sous-onglet(s)` : 'Page unique'}</span>
                        </span>
                        <ChevronRight className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                      </button>
                      <AnimatePresence initial={false}>
                        {expanded && features.length > 0 && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="grid gap-2 border-t border-slate-100 p-3 sm:grid-cols-2">
                              {features.map((feature) => <FeatureRow key={feature.id} feature={feature} selected={feature.id === selectedId} onSelect={select} />)}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {panel === 'journeys' && (
            <section className="space-y-4">
              <p className="text-sm text-slate-600">Chaque étape indique si l’élément existe déjà dans vos données ; la prochaine action recommandée est mise en évidence.</p>
              {catalog.journeys.map((journey) => <JourneyView key={journey.id} journey={journey} catalog={catalog} currentUser={currentUser} onNavigate={onNavigate} />)}
            </section>
          )}

        </main>

        {/* Fiche détaillée : colonne fixe sur grand écran, panneau plein écran sur mobile */}
        <aside className="hidden min-w-0 lg:block">
          <div className="sticky top-20 h-[calc(100vh-6.5rem)] overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            {selected
              ? <FeatureSheet key={selected.id} feature={selected} catalog={catalog} currentUser={currentUser} onNavigate={onNavigate} onSelect={select} errorHits={selectedHits} />
              : <div className="flex h-full flex-col items-center justify-center gap-2 bg-white p-8 text-center text-sm text-slate-500"><BookOpen className="h-8 w-8 text-slate-300" />Sélectionnez une fonctionnalité pour voir ses étapes, ses prérequis et y accéder.</div>}
          </div>
        </aside>
      </div>

      {selected && narrow && (
        <ModalOverlay align="bottom" onClose={() => setSelectedId(null)} className="!p-0">
          <section role="dialog" aria-modal="true" aria-label={`Fiche : ${selected.title}`} data-modal-fixed className="flex h-[calc(100dvh-2.5rem)] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl">
            <FeatureSheet key={selected.id} feature={selected} catalog={catalog} currentUser={currentUser} onNavigate={onNavigate} onSelect={select} onClose={() => setSelectedId(null)} errorHits={selectedHits} />
          </section>
        </ModalOverlay>
      )}
      <p className="text-center text-[11px] text-slate-400">Guide généré à partir du code de l’application : {Object.keys(manifest.modules).length} modules · {catalog.features.filter((feature) => feature.type === 'subtab').length} écrans · {catalog.features.filter((feature) => feature.type === 'action').length} actions détectées.</p>
    </div>
  );
}
