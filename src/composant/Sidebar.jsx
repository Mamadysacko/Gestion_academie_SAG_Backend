import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Languages, LogOut, X } from 'lucide-react';
import { useLanguage } from '../i18n/useLanguage';
import { buildMenuItems, roleLabel } from './menuConfig';
import logoAges from '../assets/logo-ages.png';
import logoSag from '../assets/logo-sag.png';

const EXPANDED = 280;
const COLLAPSED = 80;

/** Info-bulle affichée à droite d'une icône lorsque la barre est réduite. */
function Tip({ children }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-brand-charcoal px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg ring-1 ring-brand-gold/40 transition-opacity group-hover/item:opacity-100 group-focus-visible/item:opacity-100">
      {children}
    </span>
  );
}

function SidebarBody({ currentUser, onLogout, activeTab, setActiveTab, collapsed, onToggle, onClose, mobile }) {
  const { language, setLanguage, t } = useLanguage();
  const menuItems = buildMenuItems(currentUser, t);
  const compact = collapsed && !mobile;
  const initials = (currentUser?.email || '??').substring(0, 2).toUpperCase();

  const go = (id) => { setActiveTab(id); onClose?.(); };

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-brand-charcoal text-slate-200">
      {/* Marque : logo AGES, en tête de la barre */}
      <div className="relative flex items-center gap-2 border-b border-white/10 p-3">
        <div className={`flex h-14 items-center overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-brand-gold/40 transition-all ${compact ? 'mx-auto w-14' : 'flex-1 justify-center'}`}>
          <img
            src={logoAges}
            alt="AGES — Entreprise Albert Global Services"
            className={compact ? 'h-[70px] w-auto max-w-none shrink-0 -translate-y-1' : 'h-12 w-full object-contain px-2'}
          />
        </div>
        {mobile && (
          <button type="button" onClick={onClose} aria-label="Fermer le menu" className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Compte connecté */}
      <button
        type="button"
        onClick={() => go('profil')}
        aria-label={t('profile')}
        className={`group/item relative m-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2.5 text-left transition hover:border-brand-gold/60 hover:bg-white/10 ${compact ? 'justify-center' : ''}`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-gold to-brand-gold-light text-sm font-extrabold text-brand-charcoal">{initials}</span>
        {!compact && (
          <span className="min-w-0">
            <span className="mb-0.5 inline-block rounded-full border border-brand-gold/50 bg-brand-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-gold-light">{roleLabel(currentUser, language)}</span>
            <span className="block truncate text-xs font-medium text-slate-300">{currentUser?.email}</span>
          </span>
        )}
        {compact && <Tip>{currentUser?.email}</Tip>}
      </button>

      {/* Navigation */}
      <nav aria-label={t('managementModules')} className="sidebar-scroll min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 pb-3">
        {!compact && (
          <p className="mb-2 px-3 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{t('managementModules')}</p>
        )}
        {compact && <span className="mx-auto mb-2 block h-px w-8 bg-white/10" />}
        {menuItems.map((item) => {
          const ItemIcon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => go(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              title={compact ? item.label : undefined}
              className={`group/item relative flex w-full items-center gap-3 rounded-xl py-2.5 text-sm transition-colors ${compact ? 'justify-center px-0' : 'px-3'} ${isActive ? 'font-semibold text-brand-charcoal' : 'text-slate-300 hover:bg-white/8 hover:text-white'}`}
            >
              {isActive && (
                <motion.span
                  layoutId={mobile ? 'sidebar-active-mobile' : 'sidebar-active'}
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-gold-light to-brand-gold shadow-lg shadow-brand-gold/20"
                  transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                />
              )}
              <ItemIcon className="relative h-[18px] w-[18px] shrink-0" />
              {!compact && <span className="relative min-w-0 flex-1 truncate text-left">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Pied : logo SAG (partenaire), langue, déconnexion */}
      <div className="space-y-2.5 border-t border-white/10 p-3">
        <div className={`flex items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-brand-gold/40 ${compact ? 'mx-auto h-14 w-14' : 'aspect-[2.5/1] w-full'}`} title="Société AngloGold Ashanti de Guinée (SAG)">
          {compact
            ? <span role="img" aria-label="Société AngloGold Ashanti de Guinée — SAG" className="block h-full w-full bg-no-repeat" style={{ backgroundImage: `url(${logoSag})`, backgroundSize: "210%", backgroundPosition: "6% 52%" }} />
            : <img src={logoSag} alt="Société AngloGold Ashanti de Guinée — SAG SA, Siguiri" className="w-full object-cover" />}
        </div>

        {!compact && (
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-gold-light/80">SAG Education Project · Siguiri</p>
        )}

        {compact ? (
          <button
            type="button"
            onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
            aria-label={t('language')}
            className="group/item relative flex w-full items-center justify-center rounded-xl py-2.5 text-xs font-bold uppercase text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            {language}
            <Tip>{t('language')} : {language === 'fr' ? t('french') : t('english')}</Tip>
          </button>
        ) : (
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300">
            <Languages className="h-4 w-4 text-brand-gold-light" />
            <span className="flex-1">{t('language')}</span>
            <select
              aria-label={t('language')}
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="rounded-md border border-white/15 bg-brand-charcoal px-2 py-1 text-xs text-white"
            >
              <option value="fr">{t('french')}</option>
              <option value="en">{t('english')}</option>
            </select>
          </label>
        )}

        <button
          type="button"
          onClick={onLogout}
          aria-label={t('logout')}
          className={`group/item relative flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-brand-red hover:bg-brand-red hover:text-white ${compact ? '' : 'px-4'}`}
        >
          <LogOut className="h-4 w-4" />
          {!compact && <span>{t('logout')}</span>}
          {compact && <Tip>{t('logout')}</Tip>}
        </button>
      </div>

      {/* Bouton de réduction (ordinateur uniquement) */}
      {!mobile && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Déployer la barre latérale' : 'Réduire la barre latérale vers la gauche'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Déployer' : 'Réduire'}
          className="absolute -right-3.5 top-[4.6rem] z-40 flex h-7 w-7 items-center justify-center rounded-full border border-brand-gold bg-brand-charcoal text-brand-gold-light shadow-lg transition hover:bg-brand-gold hover:text-brand-charcoal"
        >
          <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
}

/**
 * Barre latérale : réductible vers la gauche (icônes seules) sur ordinateur, tiroir
 * coulissant sur mobile et tablette.
 */
const Sidebar = ({ currentUser, onLogout, activeTab, setActiveTab, collapsed, onToggle, mobileOpen, onCloseMobile }) => {
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onCloseMobile(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, onCloseMobile]);

  const shared = { currentUser, onLogout, activeTab, setActiveTab };

  return (
    <>
      {/* Ordinateur */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? COLLAPSED : EXPANDED }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}
        className="sticky top-0 z-40 hidden h-screen shrink-0 border-r border-brand-gold/30 shadow-xl lg:block print:hidden"
      >
        <SidebarBody {...shared} collapsed={collapsed} onToggle={onToggle} />
      </motion.aside>

      {/* Mobile et tablette : tiroir */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[300] lg:hidden print:hidden">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="absolute inset-0 bg-brand-charcoal/60 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="absolute inset-y-0 left-0 w-[min(20rem,86vw)] shadow-2xl"
              aria-label="Menu principal"
            >
              <SidebarBody {...shared} collapsed={false} mobile onClose={onCloseMobile} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
