import { useCallback, useEffect, useState } from 'react';
import PageConnexion from './page_connexion';
import AdminDashboard from './Admin/AdminDashboard';
import Sidebar from './composant/Sidebar';
import TopBar from './composant/TopBar';
import ApiActivityBar from './composant/ApiActivityBar';
import ReturnBar from './aide/ReturnBar';
import { NavContext } from './composant/navContext';
import { AnimatePresence, motion } from 'framer-motion';
import { AUTH_EXPIRED_EVENT, authApi } from './config/apiService';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  // Sous-onglet demandé par un lien (aide) ; `nonce` force la réouverture même si l'écran est déjà affiché.
  const [navTarget, setNavTarget] = useState({ sub: null, nonce: 0, action: null });
  // Écran d'origine quand l'utilisateur est parti compléter un prérequis : une barre propose d'y revenir.
  const [returnTo, setReturnTo] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return window.localStorage.getItem('ages-sidebar-collapsed') === '1'; } catch { return false; }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((current) => {
      const next = !current;
      try { window.localStorage.setItem('ages-sidebar-collapsed', next ? '1' : '0'); } catch { /* préférence non mémorisée */ }
      return next;
    });
  }, []);

  useEffect(() => {
    let active = true;
    // Jeton de renouvellement (cookie HttpOnly) d'abord, ancienne session PHP sinon.
    authApi.restore()
      .then((response) => {
        if (active && response?.success && response.data) {
          const user = { ...response.data, role: response.data.role_code };
          setCurrentUser(user);
          if (user.role_code === 'formateur') setActiveTab('espace-formateur');
        }
      })
      .catch((error) => {
        if (error.status !== 401) console.error('Impossible de restaurer la session :', error);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const expire = () => setCurrentUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, expire);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, expire);
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return undefined;

    let active = true;
    let requestInProgress = false;
    const refreshCurrentUser = async () => {
      if (requestInProgress) return;
      requestInProgress = true;
      try {
        const response = await authApi.me();
        if (active && response?.success && response.data) {
          const user = { ...response.data, role: response.data.role_code };
          // Garder la même référence tant que rien n'a changé : sinon chaque minuteur
          // relancerait le chargement complet de l'écran ouvert.
          setCurrentUser((current) => (JSON.stringify(current) === JSON.stringify(user) ? current : user));
        }
      } catch (error) {
        if (active && error.status === 401) {
          setCurrentUser(null);
        } else if (active) {
          console.error('Impossible d’actualiser les droits du compte :', error);
        }
      } finally {
        requestInProgress = false;
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshCurrentUser();
    };

    refreshCurrentUser();
    const intervalId = window.setInterval(refreshCurrentUser, 15000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [currentUser?.id]);

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    setActiveTab(userData?.role_code === 'formateur' || userData?.role === 'formateur' ? 'espace-formateur' : 'overview');
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Erreur pendant la déconnexion :', error);
    } finally {
      setCurrentUser(null);
      setActiveTab('overview');
    }
  };

  const canAccessModule = useCallback((module, action = 'read') => {
    if (currentUser?.role_code === 'admin' || currentUser?.role === 'admin') return true;
    return (currentUser?.permissions?.[module] || []).includes(action);
  }, [currentUser]);

  const navigateTo = useCallback((tab, sub = null, options = {}) => {
    const isTrainer = currentUser?.role_code === 'formateur' || currentUser?.role === 'formateur';
    const open = () => {
      setNavTarget((current) => ({ sub, nonce: sub ? current.nonce + 1 : current.nonce, action: options.action || null }));
      if (options.returnTo) setReturnTo(options.returnTo);
      else setReturnTo((current) => (current && current.moduleId === tab && (current.tabId || null) === sub ? null : current));
      setActiveTab(tab);
    };
    if (tab === 'profil' || tab === 'aide') {
      open();
      return;
    }
    if (tab === 'espace-formateur') {
      if (isTrainer) open();
      return;
    }
    const modules = tab === 'overview' ? null : tab === 'rapports' ? ['organisation-pedagogique'] : tab === 'parametres' ? ['parametres', 'organisation-pedagogique'] : [tab];
    if (modules === null || modules.some((module) => canAccessModule(module))) open();
  }, [canAccessModule, currentUser]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 text-sm text-slate-600">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand-gold-light border-t-brand-gold" aria-hidden="true" />
        Vérification de la session…
      </div>
    );
  }

  if (!currentUser) {
    return <PageConnexion onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <NavContext.Provider value={navigateTo}>
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      <ApiActivityBar />
      <Sidebar
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={navigateTo}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          currentUser={currentUser}
          activeTab={activeTab}
          onNavigate={navigateTo}
          onOpenMenu={() => setMobileMenuOpen(true)}
        />

        {returnTo && (
          <ReturnBar returnTo={returnTo} currentUser={currentUser} onReturn={() => navigateTo(returnTo.moduleId, returnTo.tabId || null)} onDismiss={() => setReturnTo(null)} />
        )}

        <main className="mx-auto w-full min-w-0 max-w-[1680px] flex-1 p-3 sm:p-5 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div key={`${activeTab}:${navTarget.nonce}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <AdminDashboard
                currentUser={currentUser}
                activeTab={activeTab}
                subTab={navTarget.sub}
                navAction={navTarget.action}
                setActiveTab={navigateTo}
                onUserUpdated={setCurrentUser}
              />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
    </NavContext.Provider>
  );
}

export default App;
