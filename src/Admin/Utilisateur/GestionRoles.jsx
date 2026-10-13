import { Shield, Plus, Edit2, Trash2, Users, Check, Lock, ChevronRight, Layers } from 'lucide-react';
import { MODULES_PERMISSIONS } from './utilisateursData';

export default function GestionRoles({
  roles, users, onAddRole, onEditRole, onDeleteRole, onNavigateMatrix,
  canCreate = false, canUpdate = false, canDelete = false,
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            Gestion des Rôles & Profils d'Accès ({roles.length})
          </h2>
          <p className="text-xs text-slate-500">
            Définissez les privilèges, accès aux modules et responsabilités des comptes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {canUpdate && <button
            onClick={onNavigateMatrix}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition"
          >
            <Layers className="w-4 h-4 text-purple-600" />
            <span>Matrice des Droits</span>
          </button>}

          {canCreate && <button
            onClick={onAddRole}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Rôle</span>
          </button>}
        </div>
      </div>

      {/* Grille des cartes Rôles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => {
          const count = users.filter((u) => u.role_id === role.id).length;
          const accessibleModulesCount = Object.keys(role.permissions || {}).filter(
            (k) => (role.permissions[k] || []).length > 0
          ).length;

          return (
            <div
              key={role.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-purple-200 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Top Row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${role.badgeColor}`}>
                      {role.code}
                    </span>
                    {role.isSystem && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full" title="Rôle système protégé">
                        <Lock className="w-3 h-3" /> Système
                      </span>
                    )}
                  </div>

                  {(canUpdate || (canDelete && !role.isSystem)) && <div className="flex items-center gap-1">
                    {canUpdate && <button
                      onClick={() => onEditRole(role)}
                      title="Modifier les privilèges"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>}
                    {!role.isSystem && canDelete && (
                      <button
                        onClick={() => onDeleteRole(role.id)}
                        title="Supprimer ce rôle"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>}
                </div>

                {/* Nom & Description */}
                <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-purple-700 transition">
                  {role.nom}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">
                  Droits d’accès configurés dans la matrice des permissions.
                </p>

                {/* Modules autorisés */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Accès aux Modules ({accessibleModulesCount}/{MODULES_PERMISSIONS.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {MODULES_PERMISSIONS.map((m) => {
                      const hasPerm = (role.permissions?.[m.id] || []).length > 0;
                      if (!hasPerm) return null;
                      return (
                        <span
                          key={m.id}
                          className="inline-flex items-center text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                        >
                          <Check className="w-2.5 h-2.5 text-emerald-600 mr-1" />
                          {m.nom}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Info */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-400" />
                  <strong>{count}</strong> utilisateur{count > 1 ? 's' : ''} assigné{count > 1 ? 's' : ''}
                </span>

                {canUpdate && <button
                  onClick={() => onEditRole(role)}
                  className="text-purple-600 hover:text-purple-800 flex items-center gap-0.5 font-bold"
                >
                  <span>Détails</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
