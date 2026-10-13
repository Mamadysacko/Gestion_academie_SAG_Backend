import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellRing, CheckCheck, ChevronRight, X } from 'lucide-react';
import { rappelsApi } from '../config/apiService';
import { useLiveRefresh } from './useLiveRefresh';
import { useToast } from './toastContext';

const TONES = {
  attention: 'border-amber-200 bg-amber-50 text-amber-900',
  information: 'border-sky-200 bg-sky-50 text-sky-900',
};

const storageKey = (userId) => `ages-rappels-${userId}-${new Date().toISOString().slice(0, 10)}`;
const readSeen = (userId) => {
  try { return JSON.parse(window.localStorage.getItem(storageKey(userId)) || '[]'); } catch { return []; }
};
const writeSeen = (userId, ids) => {
  try { window.localStorage.setItem(storageKey(userId), JSON.stringify(ids)); } catch { /* stockage indisponible : les rappels réapparaîtront */ }
};

/**
 * Cloche de rappels : points importants à traiter (pointage du jour, notes manquantes,
 * évaluations proches, passages à valider…). Chaque point est annoncé une fois par jour
 * en notification, puis reste consultable ici avec un accès direct à l'écran concerné.
 */
export default function CentreRappels({ currentUser, onNavigate }) {
  const toast = useToast();
  const [data, setData] = useState({ rappels: [], total: 0 });
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState([]);
  const panel = useRef(null);
  const announced = useRef(false);

  const load = useCallback(async () => {
    try {
      const response = await rappelsApi.getAll();
      setData(response.data);
    } catch { /* les rappels sont facultatifs : on ne gêne pas l'utilisateur */ }
  }, []);

  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);
  useLiveRefresh(load, { intervalMs: 120000 });

  // Annonce unique (par jour et par rappel) à l'ouverture de l'application.
  useEffect(() => {
    if (announced.current || !data.rappels.length || !currentUser?.id) return;
    announced.current = true;
    const seen = readSeen(currentUser.id);
    const fresh = data.rappels.filter((item) => !seen.includes(item.id));
    fresh.slice(0, 3).forEach((item, index) => {
      window.setTimeout(() => toast.reminder(item.message, {
        title: item.titre ?? item.title,
        action: { label: 'Traiter', onClick: () => onNavigate(item.cible) },
      }), 700 * (index + 1));
    });
    writeSeen(currentUser.id, [...seen, ...fresh.map((item) => item.id)]);
  }, [currentUser?.id, data.rappels, onNavigate, toast]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => { if (!panel.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, [open]);

  const visible = data.rappels.filter((item) => !dismissed.includes(item.id));
  const urgent = visible.filter((item) => item.severite === 'attention').length;

  return (
    <div ref={panel} className="fixed right-4 top-4 z-[250] print:hidden">
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((current) => !current)}
        aria-label={`Rappels : ${visible.length} point(s) à traiter`}
        aria-expanded={open}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition hover:bg-slate-50"
      >
        {urgent ? <motion.span animate={{ rotate: [0, -14, 14, -10, 10, 0] }} transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 5 }}><BellRing className="h-5 w-5 text-amber-600" /></motion.span> : <Bell className="h-5 w-5" />}
        {visible.length > 0 && (
          <span className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${urgent ? 'bg-rose-600' : 'bg-sky-600'}`}>{visible.length}</span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.section
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            aria-label="Rappels"
          >
            <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
              <div><h2 className="text-sm font-bold text-slate-900">Rappels</h2><p className="text-[11px] text-slate-500">Points importants à traiter aujourd’hui</p></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-md p-1 text-slate-400 hover:bg-slate-200"><X className="h-4 w-4" /></button>
            </header>
            <ul className="max-h-[60vh] space-y-2 overflow-y-auto p-3">
              <AnimatePresence initial={false}>
                {visible.map((item) => (
                  <motion.li key={item.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className={`rounded-xl border p-3 ${TONES[item.severite] || TONES.information}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold">{item.titre ?? item.title}</p>
                      <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold tabular-nums">{item.total}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 opacity-90">{item.message}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <button type="button" onClick={() => { setOpen(false); onNavigate(item.cible); }} className="inline-flex items-center gap-1 text-xs font-bold underline-offset-2 hover:underline">Traiter <ChevronRight className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => setDismissed((current) => [...current, item.id])} className="text-[11px] opacity-70 hover:opacity-100">Masquer</button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
              {!visible.length && (
                <li className="flex flex-col items-center gap-2 py-8 text-center text-sm text-slate-500"><CheckCheck className="h-7 w-7 text-emerald-500" />Rien à signaler : tout est à jour.</li>
              )}
            </ul>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
