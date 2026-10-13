import { useState } from 'react';
import { X, User, Mail, Phone, Lock, Shield, Eye, EyeOff, RefreshCw, Check } from 'lucide-react';

function generateRandomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default function ModalUtilisateur({ isOpen, onClose, onSave, editingUser, roles, defaultRoleCode }) {
  const defaultRole = defaultRoleCode
    ? roles.find((role) => role.code === defaultRoleCode)
    : roles[0];
  const [formData, setFormData] = useState(() => ({
    nom: editingUser?.nom || '',
    prenom: editingUser?.prenom || '',
    email: editingUser?.email || '',
    telephone: editingUser?.telephone || '',
    password: editingUser ? '' : generateRandomPassword(),
    role_id: editingUser?.role_id || defaultRole?.id || '',
    matricule: editingUser?.formateur_matricule || '',
    actif: editingUser?.actif ?? 1,
  }));
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const handleGeneratePassword = () => {
    setFormData((prev) => ({ ...prev, password: generateRandomPassword() }));
    setShowPassword(true);
  };

  const validate = () => {
    const err = {};
    const selectedRole = roles.find((r) => Number(r.id) === Number(formData.role_id));
    if (!formData.nom.trim()) err.nom = 'Le nom est obligatoire';
    if (!formData.prenom.trim()) err.prenom = 'Le prénom est obligatoire';
    if (!selectedRole) err.role_id = 'Sélectionnez un rôle valide';
    if (selectedRole?.code === 'formateur' && !formData.matricule.trim()) {
      err.matricule = 'Le matricule est obligatoire pour un formateur';
    }
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      err.email = 'Format d’email invalide';
    }
    if (!formData.email.trim() && !formData.telephone.trim()) {
      err.telephone = 'Un email ou un téléphone est requis pour se connecter';
    }
    if (!editingUser && !formData.password) {
      err.password = 'Le mot de passe initial est requis';
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const selectedRole = roles.find((r) => Number(r.id) === Number(formData.role_id));
    const payload = {
      ...formData,
      role_id: Number(formData.role_id),
      role_code: selectedRole?.code,
      role_nom: selectedRole?.nom,
      avatar: (formData.prenom.charAt(0) + formData.nom.charAt(0)).toUpperCase(),
    };

    onSave(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                {editingUser ? 'Modifier le Compte Utilisateur' : 'Créer un Nouvel Utilisateur'}
              </h2>
              <p className="text-xs text-slate-500">
                {editingUser ? 'Mise à jour des informations et rôles' : 'Attribution des identifiants et permissions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nom */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nom <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Kouassi"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                className={`w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none transition ${
                  errors.nom ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-indigo-600'
                }`}
              />
              {errors.nom && <p className="text-[10px] text-rose-500 mt-1 font-semibold">{errors.nom}</p>}
            </div>

            {/* Prénom */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Prénom <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Jean-Marc"
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                className={`w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none transition ${
                  errors.prenom ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-indigo-600'
                }`}
              />
              {errors.prenom && <p className="text-[10px] text-rose-500 mt-1 font-semibold">{errors.prenom}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Adresse E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required={!formData.telephone.trim()}
                  placeholder="nom@academie.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border outline-none transition ${
                    errors.email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-indigo-600'
                  }`}
                />
              </div>
              {errors.email && <p className="text-[10px] text-rose-500 mt-1 font-semibold">{errors.email}</p>}
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Numéro de Téléphone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  placeholder="0700000001"
                  required={!formData.email.trim()}
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-600 transition"
                />
                {errors.telephone && <p className="text-[10px] text-rose-500 mt-1 font-semibold">{errors.telephone}</p>}
              </div>
            </div>
          </div>

          {/* Rôle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Rôle & Droits d’accès <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                required
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: Number(e.target.value) })}
                className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-600 bg-white cursor-pointer"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nom} ({r.code})
                  </option>
                ))}
              </select>
            </div>
            {errors.role_id && <p className="mt-1 text-[10px] font-semibold text-rose-500">{errors.role_id}</p>}
          </div>

          {roles.find((role) => Number(role.id) === Number(formData.role_id))?.code === 'formateur' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Matricule formateur <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={50}
                required
                placeholder="Ex. FORM-2026-001"
                value={formData.matricule}
                onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                className={`w-full text-xs px-3.5 py-2.5 rounded-xl border outline-none transition ${
                  errors.matricule ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-indigo-600'
                }`}
              />
              {errors.matricule && <p className="text-[10px] text-rose-500 mt-1 font-semibold">{errors.matricule}</p>}
              <p className="text-[10px] text-slate-500 mt-1">
                Un profil formateur lié au compte sera créé automatiquement avec ces informations.
              </p>
            </div>
          )}

          {/* Mot de passe */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                {editingUser ? 'Nouveau Mot de Passe (Optionnel)' : 'Mot de Passe Initial *'}
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Générer un mot de passe fort</span>
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={editingUser ? 'Laisser vide pour ne pas modifier' : 'Mot de passe sécurisé'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full text-xs pl-9 pr-10 py-2.5 rounded-xl border outline-none font-mono transition ${
                  errors.password ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-indigo-600 bg-white'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-[10px] text-rose-500 font-semibold">{errors.password}</p>}
          </div>

          {/* Options de sécurité & statut */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100/70 transition">
              <input
                type="checkbox"
                checked={formData.actif === 1}
                onChange={(e) => setFormData({ ...formData, actif: e.target.checked ? 1 : 0 })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Compte Actif</span>
                <span className="text-[10px] text-slate-400">Permet à l'utilisateur de se connecter</span>
              </div>
            </label>

          </div>

          {/* Footer Actions */}
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
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{editingUser ? 'Mettre à jour' : 'Créer l’utilisateur'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
