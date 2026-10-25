import { useState } from 'react';
import { Layers, Shield, Check, Save, Lock } from 'lucide-react';
import { MODULES_PERMISSIONS, ACTIONS_PERMISSIONS, actionsFor } from './utilisateursData';

export default function MatricePermissions({ roles, onUpdateRolePermissions, canUpdate = false }) {
  const [selectedRole, setSelectedRole] = useState(roles[0]?.id ?? null);
  const [matrixState, setMatrixState] = useState(() => {
    const map = {};
    roles.forEach((role) => {
      map[role.id] = Object.fromEntries(
        Object.entries(role.permissions || {}).map(([module, actions]) => [module, [...actions]])
      );
    });
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const activeRole = roles.find((r) => r.id === selectedRole) || roles[0];
  const rolePerms = matrixState[selectedRole] || {};

  const handleToggle = (moduleId, actionId) => {
    if (activeRole?.isSystem && activeRole?.code === 'admin') return; // Admin reste tout autorisé

    setMatrixState((prev) => {
      const currentRolePerms = prev[selectedRole] || {};
      const currentModuleActions = currentRolePerms[moduleId] || [];
      const exists = currentModuleActions.includes(actionId);
      const updatedModuleActions = exists
        ? currentModuleActions.filter((a) => a !== actionId)
        : [...currentModuleActions, actionId];

      return {
        ...prev,
        [selectedRole]: {
          ...currentRolePerms,
          [moduleId]: updatedModuleActions,
        },
      };
    });
    setSavedNotice(false);
  };

  const handleToggleModuleRow = (moduleId) => {
    if (activeRole?.isSystem && activeRole?.code === 'admin') return;
    const currentModuleActions = rolePerms[moduleId] || [];
    const allActionIds = actionsFor(MODULES_PERMISSIONS.find((m) => m.id === moduleId)).map((a) => a.id);
    const hasAll = allActionIds.every((a) => currentModuleActions.includes(a));

    setMatrixState((prev) => ({
      ...prev,
      [selectedRole]: {
        ...(prev[selectedRole] || {}),
        [moduleId]: hasAll ? [] : allActionIds,
      },
    }));
    setSavedNotice(false);
  };

  const handleSaveMatrix = async () => {
    if (!canUpdate || !activeRole || activeRole.isSystem) return;
    setSaving(true);
    const saved = await onUpdateRolePermissions(selectedRole, rolePerms);
    setSaving(false);
    setSavedNotice(saved);
    if (saved) setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Matrice des Droits d'Accès & Privilèges
          </h2>
          <p className="text-xs text-slate-500">
            Contrôle granulaire des permissions par module et par action pour chaque profil.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedNotice && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-in fade-in">
              <Check className="w-4 h-4" /> Droits enregistrés avec succès
            </span>
          )}

          <button
            type="button"
            onClick={handleSaveMatrix}
            disabled={!canUpdate || !activeRole || activeRole.isSystem || saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Enregistrement…' : 'Enregistrer la Matrice'}</span>
          </button>
        </div>
      </div>

      {/* Rôle Selector Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200">
        {roles.map((r) => {
          const isActive = r.id === selectedRole;
          return (
            <button
              key={r.id}
              onClick={() => setSelectedRole(r.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Shield className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{r.nom}</span>
              {r.isSystem && <Lock className="w-3 h-3 text-slate-400" />}
            </button>
          );
        })}
      </div>

      {/* Info Banner du Rôle sélectionné */}
      <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
            {activeRole?.code.toUpperCase().slice(0, 2)}
          </div>
          <div>
            <h3 className="text-xs font-bold text-indigo-950 flex items-center gap-2">
              Profil actif : {activeRole?.nom}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${activeRole?.badgeColor}`}>
                {activeRole?.code}
              </span>
            </h3>
            <p className="text-[11px] text-indigo-700/80">Les autorisations cochées sont appliquées par l’API aux actions du rôle.</p>
          </div>
        </div>
        {activeRole?.isSystem && (
          <span className="text-[11px] font-semibold text-slate-500 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-xs">
            Rôle Système Protégé
          </span>
        )}
      </div>

      {/* Grille Matrice */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <th className="py-3 px-4 min-w-[240px]">Module Applicatif</th>
                {ACTIONS_PERMISSIONS.map((act) => (
                  <th key={act.id} className="py-3 px-3 text-center min-w-[100px]">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold ${act.color}`}>
                      {act.label}
                    </span>
                  </th>
                ))}
                <th className="py-3 px-3 text-center">Bascule</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MODULES_PERMISSIONS.map((mod) => {
                const currentActions = rolePerms[mod.id] || [];
                const allSelected = actionsFor(mod).every((a) => currentActions.includes(a.id));

                return (
                  <tr key={mod.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{mod.nom}</p>
                      <p className="text-[11px] text-slate-400">{mod.description}</p>
                    </td>

                    {ACTIONS_PERMISSIONS.map((act) => {
                      const isGranted = currentActions.includes(act.id);
                      if (mod.actions && !mod.actions.includes(act.id)) return <td key={act.id} className="py-3.5 px-3 text-center text-slate-300" aria-hidden="true">—</td>;
                      return (
                        <td key={act.id} className="py-3.5 px-3 text-center">
                          <label className="inline-flex items-center justify-center p-1.5 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                            <input
                              type="checkbox"
                              checked={isGranted}
                              disabled={!canUpdate || (activeRole?.isSystem && activeRole?.code === 'admin')}
                              onChange={() => handleToggle(mod.id, act.id)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                              aria-label={`${mod.nom} : ${act.label}`}
                            />
                          </label>
                        </td>
                      );
                    })}

                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleModuleRow(mod.id)}
                        disabled={!canUpdate || (activeRole?.isSystem && activeRole?.code === 'admin')}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition ${
                          allSelected
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        } disabled:opacity-40`}
                      >
                        {allSelected ? 'Tout autorisé' : 'Tout cocher'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
