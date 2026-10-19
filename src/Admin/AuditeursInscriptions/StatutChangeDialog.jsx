import { useState } from 'react';
import { X, RefreshCw, AlertCircle } from 'lucide-react';
import { STATUT_CONFIG } from './auditeursHelpers';
import ModalOverlay from '../../composant/ModalOverlay';

export default function StatutChangeDialog({
  isOpen,
  onClose,
  onChangeStatut,
  inscription,
  auditeur,
  groupe,
}) {
  const [nouveauStatut, setNouveauStatut] = useState(inscription?.statut || 'Active');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen || !inscription) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onChangeStatut(inscription.id, nouveauStatut);
      onClose();
    } catch (err) {
      setError(err.message || 'Erreur lors du changement de statut.');
    } finally {
      setSaving(false);
    }
  };

  const statutsDisponibles = [
    { id: 'Active', desc: 'L’auditeur est actuellement inscrit et peut être pointé.' },
    { id: 'Terminée', desc: 'Le parcours lié à cette inscription est terminé.' },
    { id: 'Abandonnée', desc: 'L’auditeur a interrompu ce parcours.' },
    { id: 'Annulée', desc: 'L’inscription a été annulée.' },
  ];

  return (
    <ModalOverlay onClose={() => { onClose(); }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="statut-dialog-title"
        className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600 text-white shadow-xs">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h2 id="statut-dialog-title" className="text-base font-bold text-slate-900">
                Modifier le statut d’inscription
              </h2>
              <p className="text-xs text-slate-500">
                {auditeur?.nom} {auditeur?.prenom} · {groupe?.libelle || 'Classe'}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Status */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
            <span className="text-slate-600">Statut actuel :</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-bold ${STATUT_CONFIG[inscription.statut]?.bg} ${STATUT_CONFIG[inscription.statut]?.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${STATUT_CONFIG[inscription.statut]?.dot}`} />
              {inscription.statut}
            </span>
          </div>

          {/* New Status Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nouveau statut <span className="text-rose-600">*</span>
            </label>
            <div className="grid gap-2">
              {statutsDisponibles.map((s) => {
                const isSelected = nouveauStatut === s.id;
                const cfg = STATUT_CONFIG[s.id];
                return (
                  <label
                    key={s.id}
                    className={`flex items-start gap-3 rounded-lg border p-2.5 cursor-pointer transition ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/40 ring-1 ring-teal-600'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="statut"
                      value={s.id}
                      checked={isSelected}
                      disabled={saving}
                      onChange={() => setNouveauStatut(s.id)}
                      className="mt-0.5 text-teal-600 focus:ring-teal-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{s.id}</span>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg?.dot}`} />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{s.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-slate-500">Le schéma actuel enregistre le statut, sans date de changement ni motif d’audit.</p>

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
              {saving ? 'Enregistrement…' : 'Enregistrer le statut'}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
