import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';
import { ToastContext } from './toastContext';

const STYLES = {
  success: { icon: CheckCircle2, title: 'Opération réussie', ring: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
  error: { icon: XCircle, title: 'Action impossible', ring: 'border-rose-200', badge: 'bg-rose-100 text-rose-700', bar: 'bg-rose-500' },
  warning: { icon: TriangleAlert, title: 'Attention', ring: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500' },
  info: { icon: Info, title: 'Information', ring: 'border-sky-200', badge: 'bg-sky-100 text-sky-700', bar: 'bg-sky-500' },
  reminder: { icon: BellRing, title: 'Rappel', ring: 'border-violet-200', badge: 'bg-violet-100 text-violet-700', bar: 'bg-violet-500' },
};
const DEFAULT_DURATION = { success: 4000, info: 5000, warning: 7000, error: 8000, reminder: 9000 };

/** Pile de notifications animées (en haut à droite), remplaçant les alertes du navigateur. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => setToasts((items) => items.filter((item) => item.id !== id)), []);

  const push = useCallback((type, message, options = {}) => {
    const text = String(message ?? '').trim();
    if (!text) return null;
    counter.current += 1;
    const id = counter.current;
    setToasts((items) => {
      // Évite d'empiler deux fois le même message.
      if (items.some((item) => item.message === text && item.type === type)) return items;
      return [...items.slice(-4), { id, type, message: text, title: options.title, action: options.action, duration: options.duration ?? DEFAULT_DURATION[type] }];
    });
    return id;
  }, []);

  const api = useMemo(() => ({
    success: (message, options) => push('success', message, options),
    error: (message, options) => push('error', message, options),
    warning: (message, options) => push('warning', message, options),
    info: (message, options) => push('info', message, options),
    reminder: (message, options) => push('reminder', message, options),
    dismiss,
  }), [dismiss, push]);

  // Les anciens appels à window.alert deviennent des notifications persistantes.
  useEffect(() => {
    const original = window.alert;
    window.alert = (message) => push('info', message, { duration: 0 });
    return () => { window.alert = original; };
  }, [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div aria-live="polite" className="pointer-events-none fixed right-4 top-[4.5rem] z-[600] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 print:hidden">
          <AnimatePresence initial={false}>
            {toasts.map((item) => <ToastItem key={item.id} toast={item} onDismiss={dismiss} />)}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const onClose = useCallback(() => onDismiss(toast.id), [onDismiss, toast.id]);
  const style = STYLES[toast.type] || STYLES.info;
  const Icon = style.icon;
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!toast.duration || paused) return undefined;
    const timer = window.setTimeout(onClose, toast.duration);
    return () => window.clearTimeout(timer);
  }, [onClose, paused, toast.duration]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.94, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto relative overflow-hidden rounded-xl border bg-white/95 shadow-xl backdrop-blur ${style.ring}`}
    >
      <div className="flex items-start gap-3 p-3.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.badge}`}><Icon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">{toast.title || style.title}</p>
          <p className="mt-0.5 whitespace-pre-line break-words text-xs leading-5 text-slate-600">{toast.message}</p>
          {toast.action && <button type="button" onClick={() => { toast.action.onClick(); onClose(); }} className="mt-2 text-xs font-bold text-teal-800 hover:underline">{toast.action.label} →</button>}
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer la notification" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
      </div>
      {toast.duration > 0 && (
        <motion.div
          className={`absolute bottom-0 left-0 h-0.5 ${style.bar}`}
          initial={{ width: '100%' }}
          animate={{ width: paused ? undefined : '0%' }}
          transition={{ duration: toast.duration / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
}
