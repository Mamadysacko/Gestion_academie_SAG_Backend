import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CornerDownLeft, Search, X } from 'lucide-react';
import { AIDE_QUERY_KEY, useCatalog } from './useCatalog';

/**
 * Recherche rapide dans la barre supérieure (raccourci Ctrl + K) : suggestions en direct,
 * accès direct à l'écran, ou « Voir tous les résultats » dans le guide d'aide.
 */
export default function SearchBox({ currentUser, onNavigate }) {
  const catalog = useCatalog(currentUser);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef(null);
  const input = useRef(null);

  const found = useMemo(() => (query.trim() ? catalog.search(query, { limit: 6 }) : { results: [], journeys: [] }), [catalog, query]);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); input.current?.focus(); setOpen(true); }
      if (event.key === 'Escape') setOpen(false);
    };
    const onDown = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, []);

  const seeAll = () => {
    try { window.sessionStorage.setItem(AIDE_QUERY_KEY, query); } catch { /* le guide s'ouvrira sans la requête */ }
    setOpen(false);
    onNavigate('aide');
  };
  const choose = (feature) => {
    setOpen(false);
    setQuery('');
    onNavigate(feature.moduleId, feature.tabId || null);
  };
  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => Math.min(index + 1, found.results.length - 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)); }
    if (event.key === 'Enter') {
      event.preventDefault();
      const target = found.results[active]?.feature;
      if (target?.allowed) choose(target); else seeAll();
    }
  };

  return (
    <div ref={root} className="relative hidden min-w-0 flex-1 md:block md:max-w-md">
      <label className="relative block">
        <span className="sr-only">Rechercher une fonctionnalité ou poser une question</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={input}
          type="search"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Rechercher une fonctionnalité…  (Ctrl K)"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm outline-none transition focus:border-brand-gold focus:bg-white focus:ring-2 focus:ring-brand-gold-light/50"
        />
        {query && <button type="button" onClick={() => { setQuery(''); input.current?.focus(); }} aria-label="Effacer" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>}
      </label>

      <AnimatePresence>
        {open && query.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="absolute left-0 right-0 top-full z-[260] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <ul role="listbox" className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {found.results.map(({ feature }, index) => (
                <li key={feature.id} role="option" aria-selected={index === active}>
                  <button type="button" onMouseEnter={() => setActive(index)} onClick={() => (feature.allowed ? choose(feature) : seeAll())} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${index === active ? 'bg-brand-gold-light/25' : ''}`}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">{feature.title}</span>
                      <span className="block truncate text-[11px] text-slate-500">{feature.path.join(' › ')}{feature.allowed ? '' : ' · droits requis'}</span>
                    </span>
                    {index === active && <CornerDownLeft className="h-3.5 w-3.5 text-slate-400" />}
                  </button>
                </li>
              ))}
              {!found.results.length && <li className="px-4 py-5 text-center text-sm text-slate-500">Aucune fonctionnalité ne correspond. Essayez d’autres mots.</li>}
            </ul>
            <button type="button" onClick={seeAll} className="flex w-full items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-brand-bordeaux hover:bg-brand-gold-light/30">
              Voir tous les résultats dans le guide d’aide <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
