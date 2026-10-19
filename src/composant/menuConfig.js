import {
  Building2, GraduationCap, LayoutDashboard, CalendarDays, Calendar,
  ClipboardList, CheckSquare, Settings, UserCheck, Shield, LifeBuoy, FileBarChart,
} from 'lucide-react';

const isRole = (user, role) => user?.role_code === role || user?.role === role;

/** Modules proposés dans la barre latérale selon le rôle et les permissions du compte. */
export function buildMenuItems(currentUser, t) {
  const allModules = [
    { id: 'overview', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'emplois-temps', label: t('schedules'), icon: CalendarDays },
    { id: 'auditeurs', label: t('auditorsAndRegistrations'), icon: GraduationCap },
    { id: 'formateurs', label: t('trainers'), icon: UserCheck },
    { id: 'salles', label: t('rooms'), icon: Building2 },
    { id: 'evaluations', label: t('evaluationsAndGrades'), icon: ClipboardList },
    { id: 'presences', label: t('attendance'), icon: CheckSquare },
    { id: 'rapports', label: 'Rapports', icon: FileBarChart, permission: 'organisation-pedagogique' },
    { id: 'utilisateurs', label: t('usersAndRoles'), icon: Shield },
    { id: 'parametres', label: t('settings'), icon: Settings, permission: ['parametres', 'organisation-pedagogique'] },
    { id: 'profil', label: t('profile'), icon: UserCheck },
    { id: 'aide', label: 'Aide & guide', icon: LifeBuoy },
  ];
  const availableModules = isRole(currentUser, 'formateur')
    ? [
      { id: 'espace-formateur', label: t('trainerSpace'), icon: Calendar },
      ...allModules.filter((item) => item.id !== 'overview' && item.id !== 'profil' && item.id !== 'aide'),
      allModules.find((item) => item.id === 'profil'),
      allModules.find((item) => item.id === 'aide'),
    ]
    : allModules;
  return availableModules.filter((item) =>
    item.id === 'overview'
    || item.id === 'profil'
    || item.id === 'aide'
    || item.id === 'espace-formateur'
    || isRole(currentUser, 'admin')
    || [].concat(item.permission || item.id).some((module) => (currentUser?.permissions?.[module] || []).includes('read')));
}

export function roleLabel(currentUser, language) {
  const role = currentUser?.role_code || currentUser?.role;
  const labels = {
    admin: language === 'en' ? 'Administrator' : 'Administrateur',
    directeur: language === 'en' ? 'Academic Director' : 'Directeur Pédagogique',
    formateur: language === 'en' ? 'Trainer' : 'Formateur',
  };
  return currentUser?.role_nom || labels[role] || role || '';
}
