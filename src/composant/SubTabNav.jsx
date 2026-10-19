/**
 * Barre de sous-onglets commune à tous les modules. Même lisibilité que le menu latéral :
 * onglet actif plein (noir charbon, texte or clair), onglets inactifs sur fond clair avec texte
 * foncé et survol doré. Défile horizontalement sur petit écran.
 *
 * items : [{ id, label, icon?, badge? }]   ·   trailing : élément affiché après les onglets
 */
export default function SubTabNav({ items, active, onChange, label = 'Sous-onglets', trailing = null, className = '' }) {
  return (
    <nav aria-label={label} className={`rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm ${className}`}>
      <div className="flex gap-1.5 overflow-x-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-current={selected ? 'page' : undefined}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                selected
                  ? 'bg-brand-charcoal text-brand-gold-light shadow-md ring-1 ring-brand-gold/40'
                  : 'bg-slate-100 text-slate-800 hover:bg-brand-gold-light/50 hover:text-brand-charcoal'
              }`}
            >
              {Icon && <Icon className={`h-4 w-4 shrink-0 ${selected ? 'text-brand-gold-light' : 'text-brand-gold'}`} />}
              <span>{item.label}</span>
              {item.badge != null && (
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${selected ? 'bg-brand-gold text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>{item.badge}</span>
              )}
            </button>
          );
        })}
        {trailing}
      </div>
    </nav>
  );
}
