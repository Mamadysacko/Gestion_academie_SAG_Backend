import { 
  School, 
  LogOut, 
  Building2, 
  GraduationCap, 
  LayoutDashboard,
  Users,
  CalendarDays,
  BookOpen,
  Calendar,
  Award,
  ClipboardList,
  ChevronRight,
  Sparkles,
  CheckSquare,
  FileBarChart,
  Settings,
  BookMarked,
  UserCheck,
  Shield,
  Languages,
} from 'lucide-react';
import { useLanguage } from '../i18n/useLanguage';

const Sidebar = ({ currentUser, onLogout, activeTab, setActiveTab }) => {
  const { language, setLanguage, t } = useLanguage();

  const getRoleConfig = (role) => {
    switch (role) {
      case 'admin':
        return {
          label: language === 'en' ? 'Administrator' : 'Administrateur',
          roleBadge: 'bg-purple-100 text-purple-700 border-purple-200',
          activeTabClass: 'bg-purple-600 text-white shadow-md shadow-purple-200 font-semibold',
          hoverClass: 'hover:bg-purple-50 text-slate-600 hover:text-purple-700',
          menuItems: [
            { id: 'overview', label: t('dashboard'), icon: LayoutDashboard },
            { id: 'organisation-pedagogique', label: t('pedagogicalOrganization'), icon: BookOpen },
            { id: 'emplois-temps', label: t('schedules'), icon: CalendarDays },
            { id: 'auditeurs', label: t('auditorsAndRegistrations'), icon: GraduationCap },
            { id: 'formateurs', label: t('trainers'), icon: UserCheck },
            { id: 'salles', label: t('rooms'), icon: Building2 },
            { id: 'evaluations', label: t('evaluationsAndGrades'), icon: ClipboardList },
            { id: 'presences', label: t('attendance'), icon: CheckSquare },
            { id: 'utilisateurs', label: t('usersAndRoles'), icon: Shield },
            { id: 'parametres', label: t('settings'), icon: Settings },
          ]
        };
      case 'directeur':
        return {
          label: language === 'en' ? 'Academic Director' : 'Directeur Pédagogique',
          roleBadge: 'bg-blue-100 text-blue-700 border-blue-200',
          activeTabClass: 'bg-blue-600 text-white shadow-md shadow-blue-200 font-semibold',
          hoverClass: 'hover:bg-blue-50 text-slate-600 hover:text-blue-700',
          menuItems: [
            { id: 'overview', label: `1. 🏠 ${t('dashboard')}`, icon: LayoutDashboard },
            { id: 'academie', label: `2. 🎓 ${language === 'en' ? 'Academy' : 'Académie'}`, icon: BookOpen },
            { id: 'auditeurs', label: `3. 👥 ${language === 'en' ? 'Auditors' : 'Auditeurs'}`, icon: Users },
            { id: 'pedagogie', label: `4. 👨‍🏫 ${language === 'en' ? 'Teaching' : 'Pédagogie'}`, icon: GraduationCap },
            { id: 'presences', label: `5. 🟢 ${t('attendance')}`, icon: CheckSquare },
            { id: 'evaluations', label: `6. 📝 ${language === 'en' ? 'Assessments' : 'Évaluations'}`, icon: Award },
            { id: 'resultats', label: `7. 📊 ${language === 'en' ? 'Results & Reports' : 'Résultats & Rapports'}`, icon: FileBarChart },
            { id: 'profil', label: `8. 👤 ${language === 'en' ? 'My Profile' : 'Mon Profil'}`, icon: UserCheck },
          ]
        };
      case 'formateur':
        return {
          label: language === 'en' ? 'Trainer' : 'Formateur',
          roleBadge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          activeTabClass: 'bg-emerald-600 text-white shadow-md shadow-emerald-200 font-semibold',
          hoverClass: 'hover:bg-emerald-50 text-slate-600 hover:text-emerald-700',
          menuItems: [
            { id: 'overview', label: `1. 🏠 ${t('dashboard')}`, icon: LayoutDashboard },
            { id: 'auditeurs', label: `2. 👥 ${language === 'en' ? 'My Auditors' : 'Mes Auditeurs'}`, icon: Users },
            { id: 'planning', label: `3. 📅 ${language === 'en' ? 'My Schedule' : 'Mon Planning'}`, icon: Calendar },
            { id: 'presences', label: `4. 🟢 ${t('attendance')}`, icon: CheckSquare },
            { id: 'evaluations', label: `5. 📝 ${language === 'en' ? 'Assessments' : 'Évaluations'}`, icon: Award },
            { id: 'resultats', label: `6. 📊 ${language === 'en' ? 'Results' : 'Résultats'}`, icon: FileBarChart },
            { id: 'matieres', label: `7. 📚 ${language === 'en' ? 'My Subjects' : 'Mes Matières'}`, icon: BookMarked },
            { id: 'profil', label: `8. 👤 ${language === 'en' ? 'My Profile' : 'Mon Profil'}`, icon: UserCheck },
          ]
        };
      default:
        return {
          label: role,
          roleBadge: 'bg-slate-100 text-slate-700',
          activeTabClass: 'bg-blue-600 text-white',
          hoverClass: 'hover:bg-slate-100',
          menuItems: []
        };
    }
  };

  const config = getRoleConfig(currentUser?.role_code || currentUser?.role);
  const allModules = [
    { id: 'overview', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'organisation-pedagogique', label: t('pedagogicalOrganization'), icon: BookOpen },
    { id: 'emplois-temps', label: t('schedules'), icon: CalendarDays },
    { id: 'auditeurs', label: t('auditorsAndRegistrations'), icon: GraduationCap },
    { id: 'formateurs', label: t('trainers'), icon: UserCheck },
    { id: 'salles', label: t('rooms'), icon: Building2 },
    { id: 'evaluations', label: t('evaluationsAndGrades'), icon: ClipboardList },
    { id: 'presences', label: t('attendance'), icon: CheckSquare },
    { id: 'utilisateurs', label: t('usersAndRoles'), icon: Shield },
    { id: 'parametres', label: t('settings'), icon: Settings },
    { id: 'profil', label: t('profile'), icon: UserCheck },
  ];
  const isTrainer = currentUser?.role_code === 'formateur' || currentUser?.role === 'formateur';
  const availableModules = isTrainer
    ? [
      { id: 'espace-formateur', label: t('trainerSpace'), icon: Calendar },
      ...allModules.filter((item) => item.id !== 'overview' && item.id !== 'profil'),
      allModules.find((item) => item.id === 'profil'),
    ]
    : allModules;
  const menuItems = availableModules.filter((item) =>
    item.id === 'overview' ||
    item.id === 'profil' ||
    item.id === 'espace-formateur' ||
    currentUser?.role === 'admin' ||
    currentUser?.role_code === 'admin' ||
    (currentUser?.permissions?.[item.id] || []).includes('read')
  );

  return (
    <aside className="flex w-full shrink-0 flex-col justify-between border-b border-slate-200 bg-white shadow-sm md:sticky md:top-0 md:h-screen md:w-72 md:border-b-0 md:border-r md:z-30">
      {/* Top Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-100 flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-md text-white">
            <School className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-800 text-base leading-tight">{t('academyERP')}</h1>
            <p className="text-[11px] text-slate-400 font-medium">{t('frenchAndEnglish')}</p>
          </div>
        </div>

        {/* User Profile Card */}
        <button
          type="button"
          onClick={() => setActiveTab('profil')}
          className="p-3.5 mx-3 my-3 w-[calc(100%-1.5rem)] text-left bg-slate-50 border border-slate-100 rounded-2xl transition hover:border-teal-200 hover:bg-teal-50/50"
          aria-label={t('profile')}
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
              {currentUser?.email?.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase mb-0.5 ${config.roleBadge}`}>
                {currentUser?.role_nom || config.label}
              </span>
              <p className="text-xs font-semibold text-slate-700 truncate">{currentUser?.email}</p>
            </div>
          </div>
        </button>

        {/* Navigation Menu */}
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:max-h-[calc(100vh-230px)] md:flex-col md:space-y-1 md:overflow-y-auto md:pb-0">
          <p className="mb-2 hidden px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 md:block">
            {t('managementModules')}
          </p>
          {menuItems.map((item) => {
            const ItemIcon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-auto shrink-0 items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-all duration-200 md:w-full ${
                  isActive ? config.activeTabClass : `${config.hoverClass}`
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <ItemIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80 shrink-0" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer & Logout */}
      <div className="p-4 border-t border-slate-100 space-y-2.5">
        <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-700 flex items-center space-x-2">
          <Sparkles className="w-4 h-4 shrink-0 text-blue-600" />
          <span>{t('schoolYear')} : <strong>2025-2026</strong></span>
        </div>

        <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
          <Languages className="h-4 w-4 text-slate-500" />
          <span className="flex-1">{t('language')}</span>
          <select
            aria-label={t('language')}
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
          >
            <option value="fr">{t('french')}</option>
            <option value="en">{t('english')}</option>
          </select>
        </label>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-xl text-xs font-semibold transition-all border border-slate-200 hover:border-red-200"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('logout')}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
