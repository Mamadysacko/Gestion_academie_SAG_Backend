import { useState } from 'react';
import { X, Shield, Check } from 'lucide-react';
import { MODULES_PERMISSIONS, ACTIONS_PERMISSIONS, actionsFor } from './utilisateursData';
import ModalOverlay from '../../composant/ModalOverlay';

export default function ModalRole({ isOpen, onClose, onSave, editingRole }) {
  const [formData, setFormData] = useState(() => {
    if (editingRole) {
      return {
        code: editingRole.code || '',
        nom: editingRole.nom || '',
        permissions: editingRole.permissions || {},
      };
    }
    return {
      code: '',
      nom: '',
      permissions: Object.fromEntries(MODULES_PERMISSIONS.map((module) => [module.id, module.actions ? [] : ['read']])),
    };
  });
  const [errors, setErrors] = useState({});

  const togglePermission = (moduleId, actionId) => {
    setFormData((prev) => {
      const current = prev.permissions[moduleId] || [];
      const has = current.includes(actionId);
      const updated = has ? current.filter((a) => a !== actionId) : [...current, actionId];
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [moduleId]: updated,
        },
      };
    });
  };

  const toggleAllModule = (moduleId) => {
    setFormData((prev) => {
      const current = prev.permissions[moduleId] || [];
      const allActions = actionsFor(MODULES_PERMISSIONS.find((m) => m.id === moduleId)).map((a) => a.id);
      const isAll = allActions.every((a) => current.includes(a));
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [moduleId]: isAll ? [] : allActions,
        },
      };
    });
  };

  const validate = () => {
    const err = {};
    if (!formData.code.trim()) err.code = 'Le code du rôle est obligatoire (ex: comptable)';
    if (!formData.nom.trim()) err.nom = 'Le libellé complet est obligatoire';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClose={() => onClose} closeOnBackdrop={false}>
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                {editingRole ? `Modifier le Rôle : ${editingRole.nom}` : 'Créer un Nouveau Rôle'}
              </h2>
              <p className="text-xs text-slate-500">Configuration des privilèges et accès aux modules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Identifiants Rôle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Libellé du Rôle <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Responsable des Admissions"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                className={`w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none transition ${
                  errors.nom ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-purple-600'
                }`}
              />
              {errors.nom && <p className="text-[10px] text-rose-500 mt-1 font-semibold">{errors.nom}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Code Système (Unique) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: admissions"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                disabled={editingRole?.isSystem}
                className={`w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none font-mono transition ${
                  editingRole?.isSystem ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'border-slate-200 focus:border-purple-600'
                }`}
              />
              {errors.code && <p className="text-[10px] text-rose-500 mt-1 font-semibold">{errors.code}</p>}
            </div>
          </div>

          {/* Configuration des Permissions */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Droits d'Accès aux Modules
              </label>
              <span className="text-[11px] text-slate-400">Cochez les privilèges accordés</span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Module</th>
                    {ACTIONS_PERMISSIONS.map((act) => (
                      <th key={act.id} className="py-2.5 px-2 text-center">{act.label.split(' ')[0]}</th>
                    ))}
                    <th className="py-2.5 px-2 text-center">Tout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MODULES_PERMISSIONS.map((mod) => {
                    const modPerms = formData.permissions[mod.id] || [];
                    const isAll = actionsFor(mod).every((a) => modPerms.includes(a.id));
                    return (
                      <tr key={mod.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-800">{mod.nom}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{mod.description}</p>
                        </td>
                        {ACTIONS_PERMISSIONS.map((act) => {
                          const checked = modPerms.includes(act.id);
                          if (mod.actions && !mod.actions.includes(act.id)) return <td key={act.id} className="py-2.5 px-2 text-center text-slate-300" aria-hidden="true">—</td>;
                          return (
                            <td key={act.id} className="py-2.5 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={editingRole?.isSystem}
                                onChange={() => togglePermission(mod.id, act.id)}
                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleAllModule(mod.id)}
                            disabled={editingRole?.isSystem}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded transition ${
                              isAll ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {isAll ? 'Tous' : 'Aucun'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{editingRole ? 'Enregistrer les modifications' : 'Créer le rôle'}</span>
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
