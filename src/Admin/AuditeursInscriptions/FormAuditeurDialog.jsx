import { useState } from 'react';
import { X, UserPlus, Sparkles, AlertCircle } from 'lucide-react';
import ModalOverlay from '../../composant/ModalOverlay';

function createMatricule(yearLabel, auditeurs) {
  const year = String(yearLabel || new Date().getFullYear()).split('-')[0];
  const pattern = new RegExp(`^AUD-${year}-(\\d+)$`, 'i');
  const max = (auditeurs || []).reduce((highest, item) => {
    const match = String(item.matricule || '').match(pattern);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `AUD-${year}-${String(max + 1).padStart(3, '0')}`;
}

export default function FormAuditeurDialog({
  isOpen,
  onClose,
  onSave,
  auditeur = null,
  auditeurs = [],
  activeYear = null,
  typesEmployes = [],
}) {
  const isEditing = Boolean(auditeur?.id);

  const [form, setForm] = useState(() => {
    if (auditeur) {
      return {
        nom: auditeur.nom || '',
        prenom: auditeur.prenom || '',
        matricule: auditeur.matricule || '',
        sexe: auditeur.sexe || 'M',
        telephone: auditeur.telephone || '',
        email: auditeur.email || '',
        position: auditeur.position || '',
        id_type_employe: auditeur.id_type_employe ? String(auditeur.id_type_employe) : '',
      };
    }
    return {
      nom: '',
      prenom: '',
      matricule: createMatricule(activeYear?.libelle, auditeurs),
      sexe: 'M',
      telephone: '',
      email: '',
      position: '',
      id_type_employe: '',
    };
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.prenom.trim()) {
      setError('Le nom et le prénom de l’élève sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      const saved = await onSave({ ...form, id: auditeur?.id });
      if (saved) onClose();
    } catch (err) {
      setError(err.message || 'Une erreur est survenue lors de l’enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateMatricule = () => {
    setForm((prev) => ({
      ...prev,
      matricule: createMatricule(activeYear?.libelle, auditeurs),
    }));
  };

  return (
    <ModalOverlay onClose={() => { onClose(); }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auditeur-dialog-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-white shadow-xs">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 id="auditeur-dialog-title" className="text-base font-bold text-slate-900">
                {isEditing ? `Modifier l’auditeur : ${auditeur.nom} ${auditeur.prenom}` : 'Créer un nouvel auditeur'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing ? 'Mettez à jour les coordonnées et informations personnelles' : 'Fiche d’état civil et coordonnées de l’élève'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1 : État civil */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 mb-3">
              1. Informations personnelles
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom de famille <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Traoré"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Prénom(s) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Fatou"
                  value={form.prenom}
                  onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Matricule académique
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    required
                    placeholder="AUD-2026-XXX"
                    value={form.matricule}
                    onChange={(e) => setForm({ ...form, matricule: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                  {!isEditing && (
                    <button
                      type="button"
                      title="Générer un nouveau matricule"
                      onClick={handleGenerateMatricule}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                      Auto
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sexe
                  </label>
                  <select
                    value={form.sexe}
                    onChange={(e) => setForm({ ...form, sexe: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="M">Masculin (M)</option>
                    <option value="F">Féminin (F)</option>
                  </select>
                </div>

              </div>
            </div>
          </div>

          {/* Section 2 : Coordonnées */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 mb-3">
              2. Coordonnées & Contact
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  placeholder="ex: 07 00 00 02 01"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adresse e-mail
                </label>
                <input
                  type="email"
                  placeholder="ex: eleve@exemple.test"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
              </div>

            </div>
          </div>

          {/* Section 3 : Situation professionnelle */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 mb-3">
              3. Situation professionnelle
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  maxLength="100"
                  placeholder="ex: Chef de service, Agent…"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Type d’employé
                </label>
                <select
                  value={form.id_type_employe}
                  onChange={(e) => setForm({ ...form, id_type_employe: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                >
                  <option value="">Non renseigné</option>
                  {typesEmployes.map((type) => <option key={type.id} value={type.id}>{type.libelle}</option>)}
                </select>
                {!typesEmployes.length && <p className="mt-1 text-[11px] text-amber-700">Créez les types d’employés dans Paramètres.</p>}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-teal-700 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 transition disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : isEditing ? 'Enregistrer les modifications' : 'Créer l’auditeur'}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
