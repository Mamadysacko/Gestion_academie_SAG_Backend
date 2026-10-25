import { useId, useMemo, useRef, useState } from 'react';
import { Check, Search, X } from 'lucide-react';

const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLocaleLowerCase();

/**
 * Sélecteur à liste visible, sans menu déroulant : un champ de recherche filtre la liste
 * en direct (accents et casse ignorés), un clic ou « Entrée » choisit l'élément.
 * Idéal quand il y a beaucoup de choix : tout reste visible, rien n'est caché dans un menu.
 *
 * options : [{ value, label, hint?, badge? }]   ·   value : chaîne ('' = aucun choix)
 * multiple : value est un tableau de chaînes ; un clic coche / décoche, « Tout cocher » prend la liste filtrée.
 */
export function ListPicker({
  label,
  value,
  onChange,
  options = [],
  multiple = false,
  required = false,
  disabled = false,
  placeholder = 'Rechercher…',
  emptyMessage = 'Aucun résultat.',
  disabledMessage = '',
  note = '',
  action = null,
  height = 'h-64',
}) {
  const id = useId();
  const searchRef = useRef(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return options;
    return options.filter((option) => normalize(`${option.label} ${option.hint ?? ''} ${option.badge ?? ''}`).includes(term));
  }, [options, query]);

  const values = multiple ? (Array.isArray(value) ? value.map(String) : []) : [String(value ?? '')];
  const selected = multiple ? values.length > 0 : options.find((option) => String(option.value) === String(value));
  const choose = (option) => {
    const key = String(option.value);
    if (multiple) onChange(values.includes(key) ? values.filter((item) => item !== key) : [...values, key]);
    else onChange(String(value) === key && !required ? '' : key);
  };
  const checkAll = () => onChange([...new Set([...values, ...filtered.map((option) => String(option.value))])]);
  const uncheckAll = () => onChange(values.filter((key) => !filtered.some((option) => String(option.value) === key)));

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => Math.min(index + 1, filtered.length - 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)); }
    if (event.key === 'Enter') {
      event.preventDefault();
      const target = filtered[Math.min(active, filtered.length - 1)];
      if (target) choose(target);
    }
  };

  return (
    <div className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition ${selected ? 'border-brand-gold' : 'border-slate-200'} ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2.5">
        <span id={`${id}-label`} className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
          {label}{required && <span className="text-red-600"> *</span>}
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold tabular-nums text-slate-500 ring-1 ring-slate-200">
          {multiple ? `${values.length} choisi(s) · ` : ''}{filtered.length}/{options.length}
        </span>
      </div>

      <div className="relative border-b border-slate-100 px-3 py-2">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={searchRef}
          type="search"
          value={query}
          disabled={disabled}
          onChange={(event) => { setQuery(event.target.value); setActive(0); }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-labelledby={`${id}-label`}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-8 text-sm outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold-light/50"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); searchRef.current?.focus(); }} aria-label="Effacer la recherche" className="absolute right-5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {multiple && !disabled && filtered.length > 0 && (
        <div className="flex gap-3 border-b border-slate-100 px-3 py-1.5 text-[11px] font-semibold">
          <button type="button" onClick={checkAll} className="text-brand-bordeaux hover:underline">Tout cocher{query ? ' (filtrés)' : ''}</button>
          <button type="button" onClick={uncheckAll} className="text-slate-500 hover:underline">Tout décocher</button>
        </div>
      )}

      <ul role="listbox" aria-multiselectable={multiple || undefined} aria-labelledby={`${id}-label`} className={`${height} min-h-40 flex-1 divide-y divide-slate-100 overflow-y-auto`}>
        {disabled && disabledMessage ? (
          <li className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">{disabledMessage}</li>
        ) : filtered.map((option, index) => {
          const isSelected = values.includes(String(option.value));
          return (
            <li key={option.value} role="option" aria-selected={isSelected}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => choose(option)}
                onMouseEnter={() => setActive(index)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${isSelected ? 'bg-brand-gold-light/35' : index === active && query ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center ${multiple ? 'rounded-md' : 'rounded-full'} border-2 transition ${isSelected ? 'border-brand-gold bg-brand-gold text-white' : 'border-slate-300'}`}>
                  {isSelected && <Check className="h-3 w-3" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${isSelected ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{option.label}</span>
                  {option.hint && <span className="block truncate text-[11px] text-slate-500">{option.hint}</span>}
                </span>
                {option.badge && <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{option.badge}</span>}
              </button>
            </li>
          );
        })}
        {!disabled && !filtered.length && (
          <li className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">{emptyMessage}</li>
        )}
      </ul>

      {action && <div className="border-t border-slate-100 bg-slate-50 px-3 py-2">{action}</div>}
      {note && <p className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">{note}</p>}
    </div>
  );
}

/**
 * Choix rapide par pastilles (années, sessions, jours) : quelques valeurs, toutes visibles,
 * un seul clic. `multiple` : value est un tableau de chaînes.
 */
export function ChipGroup({ label, value, onChange, options = [], multiple = false, allLabel = '', required = false }) {
  const values = multiple ? (Array.isArray(value) ? value.map(String) : []) : [String(value ?? '')];
  const pick = (key) => {
    if (multiple) onChange(values.includes(key) ? values.filter((item) => item !== key) : [...values, key]);
    else onChange(values[0] === key && !required ? '' : key);
  };
  const noneSelected = multiple ? !values.length : !values[0];
  const chip = (active) => `rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? 'border-brand-gold bg-brand-gold text-white shadow-sm' : 'border-slate-300 bg-white text-slate-600 hover:border-brand-gold hover:text-brand-gold'}`;

  return (
    <div className="min-w-0">
      {label && <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}{required && <span className="text-red-600"> *</span>}</p>}
      <div className="flex flex-wrap gap-1.5">
        {allLabel && <button type="button" onClick={() => onChange(multiple ? [] : '')} className={chip(noneSelected)} aria-pressed={noneSelected}>{allLabel}</button>}
        {options.map((option) => {
          const active = values.includes(String(option.value));
          return <button key={option.value} type="button" onClick={() => pick(String(option.value))} className={chip(active)} aria-pressed={active} title={option.hint}>{option.label}</button>;
        })}
        {!options.length && <span className="text-xs text-slate-400">Aucun choix disponible.</span>}
      </div>
    </div>
  );
}

/** Récapitulatif des choix faits (et des valeurs déduites automatiquement). */
export function RecapStrip({ items = [] }) {
  return (
    <div className="flex flex-wrap items-stretch gap-2 rounded-2xl border border-brand-gold/30 bg-brand-gold-light/20 p-2.5">
      {items.map((item) => (
        <div key={item.label} className={`min-w-0 flex-1 basis-36 rounded-xl bg-white px-3 py-2 ring-1 ${item.value ? 'ring-brand-gold/40' : 'ring-slate-200'}`}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{item.label}{item.auto && <span className="ml-1 rounded bg-brand-gold-light/60 px-1 py-px text-[9px] text-brand-bordeaux">auto</span>}</p>
          <p className={`mt-0.5 truncate text-sm font-semibold ${item.value ? 'text-slate-900' : 'text-slate-400'}`}>{item.value || '—'}</p>
        </div>
      ))}
    </div>
  );
}
