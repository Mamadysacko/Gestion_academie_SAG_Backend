import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, PencilLine, TriangleAlert } from 'lucide-react';
import { ConfirmContext } from './confirmContext';
import ModalOverlay from './ModalOverlay';

const TONES = {
  danger: { icon: TriangleAlert, badge: 'bg-rose-100 text-rose-700', button: 'bg-rose-700 hover:bg-rose-800', label: 'Supprimer' },
  warning: { icon: PencilLine, badge: 'bg-amber-100 text-amber-700', button: 'bg-amber-600 hover:bg-amber-700', label: 'Confirmer' },
  primary: { icon: CheckCircle2, badge: 'bg-teal-100 text-teal-700', button: 'bg-teal-800 hover:bg-teal-900', label: 'Confirmer' },
};

/**
 * Fournit `useConfirm()` à toute l'application : une fenêtre modale de confirmation
 * qui remplace window.confirm pour les créations, modifications et suppressions.
 */
export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const confirmButton = useRef(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    // Un simple texte évoquant une suppression / un détachement s'affiche en mode « danger ».
    const isDeletion = typeof options === 'string' && /supprim|détach/i.test(options);
    const normalized = typeof options === 'string'
      ? { message: options, ...(isDeletion ? { tone: 'danger', title: 'Confirmer la suppression' } : {}) }
      : options;
    setRequest({ tone: 'primary', title: 'Confirmation', ...normalized, resolve });
  }), []);

  const close = useCallback((answer) => {
    setRequest((current) => {
      current?.resolve(answer);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!request) return undefined;
    confirmButton.current?.focus();
  }, [request]);

  const tone = TONES[request?.tone] || TONES.primary;
  const Icon = tone.icon;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {request && (
          <ModalOverlay key="confirm-overlay" layer="confirm" onClose={() => close(false)}>
            <motion.section
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              role="alertdialog" aria-modal="true" data-modal-fixed aria-labelledby="confirm-title" aria-describedby="confirm-message"
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start gap-4">
                <motion.span initial={{ scale: 0.6, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone.badge}`}><Icon className="h-5 w-5" /></motion.span>
                <div className="min-w-0">
                  <h2 id="confirm-title" className="text-base font-bold text-slate-900">{request.title}</h2>
                  <p id="confirm-message" className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{request.message}</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={() => close(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">{request.cancelLabel || 'Annuler'}</button>
                <motion.button whileTap={{ scale: 0.96 }} ref={confirmButton} type="button" onClick={() => close(true)} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${tone.button}`}>{request.confirmLabel || tone.label}</motion.button>
              </div>
            </motion.section>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
