import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { API_ACTIVITY_EVENT } from '../config/apiService';

/**
 * Indicateur d'activité réseau : fine barre dorée en haut de l'écran pendant les chargements,
 * et pastille « Enregistrement… » pendant une écriture (ajout, modification, suppression).
 * La barre n'apparaît qu'après 250 ms pour ne pas clignoter sur les réponses instantanées.
 */
export default function ApiActivityBar() {
  const [activity, setActivity] = useState({ reads: 0, writes: 0 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onActivity = (event) => setActivity(event.detail);
    window.addEventListener(API_ACTIVITY_EVENT, onActivity);
    return () => window.removeEventListener(API_ACTIVITY_EVENT, onActivity);
  }, []);

  const busy = activity.reads + activity.writes > 0;
  useEffect(() => {
    if (!busy) {
      const hide = window.setTimeout(() => setVisible(false), 0);
      return () => window.clearTimeout(hide);
    }
    const show = window.setTimeout(() => setVisible(true), 250);
    return () => window.clearTimeout(show);
  }, [busy]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[700] print:hidden" aria-live="polite">
      <AnimatePresence>
        {busy && visible && (
          <motion.div
            key="bar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-1 w-full overflow-hidden bg-brand-gold-light/40"
          >
            <motion.div
              className="h-full w-1/3 rounded-full bg-gradient-to-r from-brand-gold to-brand-gold-light"
              animate={{ x: ['-100%', '300%'] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {activity.writes > 0 && visible && (
          <motion.div
            key="saving"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full bg-brand-charcoal px-4 py-2 text-xs font-semibold text-brand-gold-light shadow-lg ring-1 ring-brand-gold/50"
            role="status"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enregistrement en cours…
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
