import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import ModalOverlay from './ModalOverlay';

/**
 * Fenêtre de formulaire large et animée : en-tête fixe, contenu défilant, pied d'actions fixe.
 * Rendue par ModalOverlay (portail, empilement, Échap, focus) ; plein écran sur mobile.
 */
export default function FormDialog({ titleId, title, description, onClose, size = 'max-w-5xl', children, footer }) {
  return (
    <ModalOverlay onClose={onClose} align="bottom" className="!p-0 sm:!p-6">
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-modal-fixed
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className={`flex max-h-[100dvh] w-full ${size} flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-slate-200 sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl`}
      >
        <header className="relative flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-brand-charcoal to-slate-800 px-5 py-4 text-white">
          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-brand-gold via-brand-gold-light to-brand-gold" aria-hidden="true" />
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-bold sm:text-lg">{title}</h2>
            {description && <p className="mt-1 text-xs leading-5 text-slate-300">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="shrink-0 rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">{children}</div>
        {footer && <footer className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">{footer}</footer>}
      </motion.section>
    </ModalOverlay>
  );
}
