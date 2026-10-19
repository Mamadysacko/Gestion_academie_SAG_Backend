import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Search, X } from 'lucide-react';

const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLocaleLowerCase();

/**
 * Liste déroulante avec étiquettes.
 * - S'ouvre au clic ; recherche intégrée ; navigation clavier (↑ ↓ Entrée Échap).
 * - Les éléments sélectionnés apparaissent sous forme de petites étiquettes supprimables.
 * - `multiple` : value est un tableau de chaînes ; sinon une chaîne ('' = aucun choix).
 */
export default function TagSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Sélectionner…',
  emptyMessage = 'Aucun résultat.',
  disabled = false,
  multiple = false,
  required = false,
  clearable = true,
  className = '',
}) {
  const id = useId();
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [box, setBox] = useState(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const values = useMemo(() => (multiple ? (Array.isArray(value) ? value : []) : (value === '' || value == null ? [] : [value])).map(String), [multiple, value]);
  const selected = values.map((item) => options.find((option) => String(option.value) === item)).filter(Boolean);
  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    return options.filter((option) => !term || normalize(option.label).includes(term)).slice(0, 80);
  }, [options, query]);

  // Position de la liste : calculée sur le champ, au-dessus s'il manque de la place en dessous.
  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const placeAbove = below < 240 && above > below;
    const available = Math.max(160, placeAbove ? above : below);
    const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 16);
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    setBox({ left, width, available, ...(placeAbove ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }) });
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (!rootRef.current?.contains(event.target) && !popoverRef.current?.contains(event.target)) { setOpen(false); setQuery(''); }
    };
    document.addEventListener('mousedown', onDown);
    window.setTimeout(() => searchRef.current?.focus(), 30);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const toggle = (option) => {
    const key = String(option.value);
    if (multiple) {
      onChange(values.includes(key) ? values.filter((item) => item !== key) : [...values, key]);
      return;
    }
    onChange(values[0] === key && clearable && !required ? '' : key);
    setOpen(false);
    setQuery('');
  };
  const remove = (key, event) => {
    event.stopPropagation();
    if (disabled) return;
    onChange(multiple ? values.filter((item) => item !== key) : '');
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') { setOpen(false); setQuery(''); return; }
    if (!open && ['Enter', ' ', 'ArrowDown'].includes(event.key)) { event.preventDefault(); setOpen(true); return; }
    if (!open) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => Math.min(index + 1, filtered.length - 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)); }
    if (event.key === 'Enter' && filtered[active]) { event.preventDefault(); toggle(filtered[active]); }
    if (event.key === 'Backspace' && !query && values.length && clearable) remove(values[values.length - 1], event);
  };

  return (
    <div ref={rootRef} className={`relative block min-w-44 flex-1 ${className}`} onKeyDown={onKeyDown}>
      {label && <span id={`${id}-label`} className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}{required && <span className="text-rose-600"> *</span>}</span>}
      <div
        ref={triggerRef}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-labelledby={label ? `${id}-label` : undefined}
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-disabled={disabled}
        onClick={() => !disabled && setOpen((current) => !current)}
        className={`flex min-h-[42px] w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 text-sm shadow-sm outline-none transition ${open ? 'border-teal-600 ring-2 ring-teal-100' : 'border-slate-300 hover:border-slate-400'} ${disabled ? 'cursor-not-allowed bg-slate-100 opacity-70' : ''} focus-visible:border-teal-600 focus-visible:ring-2 focus-visible:ring-teal-100`}
      >
        <AnimatePresence initial={false}>
          {selected.map((option) => (
            <motion.span
              key={option.value}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.12 }}
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-teal-50 py-0.5 pl-2 pr-1 text-xs font-semibold text-teal-900 ring-1 ring-teal-200"
            >
              <span className="truncate">{option.label}</span>
              {clearable && !(required && !multiple) && !disabled && (
                <button type="button" onClick={(event) => remove(String(option.value), event)} aria-label={`Retirer ${option.label}`} className="rounded p-0.5 text-teal-700 hover:bg-teal-100"><X className="h-3 w-3" /></button>
              )}
            </motion.span>
          ))}
        </AnimatePresence>
        {!selected.length && <span className="px-0.5 text-slate-400">{placeholder}</span>}
        <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {createPortal(
      <AnimatePresence>
        {open && box && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            style={{ position: 'fixed', zIndex: 480, left: box.left, width: box.width, top: box.top, bottom: box.bottom }}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input ref={searchRef} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} placeholder="Rechercher…" aria-label="Rechercher dans la liste" className="w-full bg-transparent text-sm outline-none" />
              {multiple && values.length > 0 && <button type="button" onClick={() => onChange([])} className="shrink-0 text-[11px] font-semibold text-slate-500 hover:text-rose-700">Tout retirer</button>}
            </div>
            <ul id={`${id}-list`} role="listbox" aria-multiselectable={multiple} style={{ maxHeight: Math.min(256, Math.max(96, box.available - 56)) }} className="overflow-y-auto overscroll-contain py-1">
              {filtered.map((option, index) => {
                const isSelected = values.includes(String(option.value));
                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => toggle(option)}
                    className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${index === active ? 'bg-slate-50' : ''} ${isSelected ? 'font-semibold text-teal-900' : 'text-slate-700'}`}
                  >
                    <span className="min-w-0"><span className="block truncate">{option.label}</span>{option.hint && <span className="block truncate text-[11px] font-normal text-slate-500">{option.hint}</span>}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-teal-700" />}
                  </li>
                );
              })}
              {!filtered.length && <li className="px-3 py-4 text-center text-sm text-slate-500">{emptyMessage}</li>}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
      )}
    </div>
  );
}
