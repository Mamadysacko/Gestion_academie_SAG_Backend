import { Menu } from 'lucide-react';
import LiveClock from './LiveClock';
import SearchBox from '../aide/SearchBox';
import CentreRappels from './CentreRappels';
import { buildMenuItems } from './menuConfig';
import { useLanguage } from '../i18n/useLanguage';

/**
 * Barre supérieure fixe : menu mobile, titre de la page, date et heure en temps réel,
 * rappels. Reste visible pendant le défilement.
 */
export default function TopBar({ currentUser, activeTab, onNavigate, onOpenMenu }) {
  const { t } = useLanguage();
  const items = buildMenuItems(currentUser, t);
  const current = items.find((item) => item.id === activeTab);
  const Icon = current?.icon;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-3 backdrop-blur-md print:hidden sm:px-5 lg:px-8">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Ouvrir le menu"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-brand-gold hover:text-brand-gold lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex min-w-0 items-center gap-2.5 md:w-56 md:flex-none lg:w-64">
        {Icon && <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-charcoal text-brand-gold-light sm:flex"><Icon className="h-4.5 w-4.5" /></span>}
        <div className="min-w-0">
          <p className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-brand-gold sm:block">AGES · SAG Education Project</p>
          <p className="truncate text-sm font-bold text-slate-900 sm:text-base">{current?.label || t('dashboard')}</p>
        </div>
      </div>

      <SearchBox currentUser={currentUser} onNavigate={onNavigate} />
      <LiveClock />
      <CentreRappels currentUser={currentUser} onNavigate={onNavigate} />
    </header>
  );
}
