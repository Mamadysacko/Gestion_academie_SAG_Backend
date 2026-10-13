import {
  Users, Shield, UserCheck, UserX, Clock,
  ShieldCheck, Activity, ArrowUpRight
} from 'lucide-react';

export default function DashboardUtilisateurs({ users, roles, onNavigateTab }) {
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.actif === 1).length;
  const inactiveUsers = users.filter((u) => u.actif === 0).length;
  const loggedInUsers = users.filter((u) => u.last_login).length;
  const totalRoles = roles.length;

  const stats = [
    {
      title: 'Comptes Utilisateurs',
      value: totalUsers,
      subtext: `${activeUsers} actifs / ${inactiveUsers} suspendus`,
      icon: Users,
      color: 'from-blue-600 to-indigo-600',
      bgLight: 'bg-blue-50 text-blue-700',
      action: () => onNavigateTab('liste'),
    },
    {
      title: 'Rôles & Profils',
      value: totalRoles,
      subtext: 'Rôles configurés dans le système',
      icon: Shield,
      color: 'from-purple-600 to-pink-600',
      bgLight: 'bg-purple-50 text-purple-700',
      action: () => onNavigateTab('roles'),
    },
    {
      title: 'Comptes déjà utilisés',
      value: loggedInUsers,
      subtext: `${totalUsers - loggedInUsers} compte(s) jamais connecté(s)`,
      icon: ShieldCheck,
      color: 'from-emerald-600 to-teal-600',
      bgLight: 'bg-emerald-50 text-emerald-700',
      action: () => onNavigateTab('liste'),
    },
    {
      title: 'Rôles sans permission',
      value: roles.filter((role) => Object.values(role.permissions || {}).every((actions) => actions.length === 0)).length,
      subtext: 'Accès à configurer dans la matrice',
      icon: Activity,
      color: 'from-amber-500 to-orange-600',
      bgLight: 'bg-amber-50 text-amber-700',
      action: () => onNavigateTab('matrice'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              onClick={stat.action}
              className="cursor-pointer bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all transform hover:-translate-y-0.5 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{stat.title}</span>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${stat.bgLight} group-hover:scale-105 transition`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-black text-slate-900">{stat.value}</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">{stat.subtext}</p>
            </div>
          );
        })}
      </div>

      {/* Grid: Répartition par Rôle & Dernières Connexions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Répartition des utilisateurs par Rôle */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600" /> Répartition par Rôle
              </h3>
              <p className="text-xs text-slate-400">Effectif attribué à chaque profil</p>
            </div>
          </div>

          <div className="space-y-3">
            {roles.map((r) => {
              const count = users.filter((u) => u.role_id === r.id).length;
              const pct = Math.round((count / (totalUsers || 1)) * 100);
              return (
                <div key={r.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${r.badgeColor}`}>
                        {r.code}
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate">{r.nom}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-slate-900 font-mono">{count}</span>
                    <span className="text-[10px] text-slate-400 block font-medium">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dernières connexions & Activité */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Dernières Connexions des Utilisateurs
              </h3>
              <p className="text-xs text-slate-400">Horodatage de connexion et statut des comptes</p>
            </div>
            <button
              onClick={() => onNavigateTab('liste')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              Tous les comptes →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 rounded-l-xl">Utilisateur</th>
                  <th className="py-2.5 px-3">Rôle</th>
                  <th className="py-2.5 px-3">Dernière Connexion</th>
                  <th className="py-2.5 px-3 text-right rounded-r-xl">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.slice(0, 5).map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 font-bold text-slate-700 flex items-center justify-center text-xs">
                          {user.avatar || user.nom.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{user.prenom} {user.nom}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-semibold text-slate-700">{user.role_nom}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                      {user.last_login || 'Jamais connecté'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {user.actif === 1 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <UserCheck className="w-3 h-3" /> Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <UserX className="w-3 h-3" /> Suspendu
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
