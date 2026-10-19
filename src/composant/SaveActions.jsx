import { ChevronDown, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * Pied de formulaire avec choix de la suite après l'enregistrement.
 *
 * submit    : { label } — bouton principal (type submit, ex. « Enregistrer »)
 * followUps : [{ id, label, hint? }] — « Enregistrer et continuer », « Enregistrer et affecter »…
 * onFollowUp(id) est appelé à la place du submit simple. `busy` désactive tout (anti double-clic).
 */
export default function SaveActions({ submitLabel = 'Enregistrer', followUps = [], onFollowUp, onCancel, busy = false, form }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
      <button type="button" onClick={onCancel} disabled={busy} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50">Annuler</button>
      <div ref={root} className="relative inline-flex">
        <button
          type="submit"
          form={form}
          disabled={busy}
          className={`inline-flex items-center gap-2 bg-brand-charcoal px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-gold disabled:cursor-wait disabled:opacity-60 ${followUps.length ? 'rounded-l-xl' : 'rounded-xl'}`}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}{submitLabel}
        </button>
        {followUps.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              disabled={busy}
              aria-label="Autres options d’enregistrement"
              aria-expanded={open}
              className="inline-flex items-center rounded-r-xl border-l border-white/25 bg-brand-charcoal px-2.5 text-white transition hover:bg-brand-gold disabled:opacity-60"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <ul role="menu" className="absolute bottom-full right-0 z-10 mb-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                {followUps.map((item) => (
                  <li key={item.id} role="none">
                    <button type="button" role="menuitem" onClick={() => { setOpen(false); onFollowUp?.(item.id); }} className="block w-full px-4 py-2.5 text-left transition hover:bg-brand-gold-light/30">
                      <span className="block text-sm font-semibold text-slate-900">{item.label}</span>
                      {item.hint && <span className="block text-xs text-slate-500">{item.hint}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
