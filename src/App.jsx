import { useCallback, useEffect, useState } from 'react';
import PageConnexion from './page_connexion';
import AdminDashboard from './Admin/AdminDashboard';
import Sidebar from './composant/Sidebar';
import CentreRappels from './composant/CentreRappels';
import { AnimatePresence, motion } from 'framer-motion';
import { authApi } from './config/apiService';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    let active = true;
    authApi.me()
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
          setCurrentUser(user);
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

  const navigateTo = useCallback((tab) => {
    const isTrainer = currentUser?.role_code === 'formateur' || currentUser?.role === 'formateur';
    if (tab === 'profil') {
      setActiveTab(tab);
      return;
    }
    if (tab === 'espace-formateur') {
      if (isTrainer) setActiveTab(tab);
      return;
    }
    const module = tab === 'overview' ? null : tab === 'parametres' ? 'parametres' : tab;
    if (module === null || canAccessModule(module)) setActiveTab(tab);
  }, [canAccessModule, currentUser]);

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">Vérification de la session…</div>;
  }

  if (!currentUser) {
    return <PageConnexion onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800 md:flex-row">
      {/* Sidebar Latérale Professionnelle */}
      <Sidebar 
        currentUser={currentUser} 
        onLogout={handleLogout} 
        activeTab={activeTab} 
        setActiveTab={navigateTo}
      />

      {/* Zone de contenu principal sur fond lumineux clair */}
      <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <AdminDashboard
              currentUser={currentUser}
              activeTab={activeTab}
              setActiveTab={navigateTo}
              onUserUpdated={setCurrentUser}
            />
          </motion.div>
        </AnimatePresence>
      </main>
      <CentreRappels currentUser={currentUser} onNavigate={navigateTo} />
    </div>
  );
}

export default App;
