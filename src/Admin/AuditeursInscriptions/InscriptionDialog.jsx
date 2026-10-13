import { useState, useMemo, useEffect } from 'react';
import {
  X,
  GraduationCap,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Search,
  User,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';
import { formatDateFr } from './auditeursHelpers';
import { getCurrentSchoolYear } from '../../utils/schoolYear';

export default function InscriptionDialog({
  isOpen,
  onClose,
  onInscrire,
  onTransferer,
  auditeur = null,
  data,
  mode = 'inscription', // 'inscription' ou 'transfert'
}) {
  const activeYear = getCurrentSchoolYear(data?.annees || []);

  // État local de l'auditeur sélectionné (soit passé en prop, soit choisi dans la liste)
  const [selectedAuditeurId, setSelectedAuditeurId] = useState(auditeur?.id ? String(auditeur.id) : '');
  const [auditeurSearch, setAuditeurSearch] = useState('');
  const [dialogMode, setDialogMode] = useState(mode);
  const [selectedGroupeId, setSelectedGroupeId] = useState('');
  const [dateInscription, setDateInscription] = useState(() => new Date().toISOString().split('T')[0]);
  const [typeInscription, setTypeInscription] = useState('Nouvelle');
  const [statut, setStatut] = useState('Active');
  const [motif, setMotif] = useState('');
  const [error, setError] = useState('');

  // Synchronisation lors de l'ouverture
  useEffect(() => {
    if (auditeur) {
      setSelectedAuditeurId(String(auditeur.id));
    } else {
      setSelectedAuditeurId('');
    }
    setDialogMode(mode);
    setSelectedGroupeId('');
    setDateInscription(new Date().toISOString().split('T')[0]);
    setMotif('');
    setError('');
  }, [auditeur, mode, isOpen]);

  // Objet auditeur actif
  const currentAuditeur = useMemo(() => {
    if (!selectedAuditeurId || !data?.auditeurs) return null;
    return data.auditeurs.find((a) => String(a.id) === String(selectedAuditeurId)) || null;
  }, [selectedAuditeurId, data]);

  // Inscription active courante de l'élève pour l'année active
  const currentActiveEnrollment = useMemo(() => {
    if (!currentAuditeur || !data?.inscriptions) return null;
    return data.inscriptions.find(
      (i) =>
        Number(i.id_auditeur) === Number(currentAuditeur.id) &&
        Number(i.id_annee) === Number(activeYear?.id) &&
        i.statut === 'Active'
    );
  }, [currentAuditeur, data, activeYear]);

  // Anciennes inscriptions (années antérieures) pour déterminer si c'est une réinscription
  const hasPastEnrollments = useMemo(() => {
    if (!currentAuditeur || !data?.inscriptions) return false;
    return data.inscriptions.some(
      (i) =>
        Number(i.id_auditeur) === Number(currentAuditeur.id) &&
        Number(i.id_annee) !== Number(activeYear?.id)
    );
  }, [currentAuditeur, data, activeYear]);

  // Ajustement automatique du mode et du type lors de la sélection d'un auditeur
  useEffect(() => {
    if (currentActiveEnrollment) {
      // Déjà inscrit activement cette année : proposer le transfert par défaut
      setDialogMode('transfert');
      setTypeInscription('Transfert');
    } else {
      setDialogMode('inscription');
      setTypeInscription(hasPastEnrollments ? 'Réinscription' : 'Nouvelle');
    }
  }, [currentActiveEnrollment, hasPastEnrollments]);

  const currentGroup = useMemo(() => {
    if (!currentActiveEnrollment || !data?.groupes) return null;
    return data.groupes.find((g) => Number(g.id) === Number(currentActiveEnrollment.id_groupe));
  }, [currentActiveEnrollment, data]);

  // Classes disponibles pour l'année active
  const availableGroups = useMemo(() => {
    if (!data?.groupes) return [];
    return data.groupes.filter((g) => !g.id_annee || Number(g.id_annee) === Number(activeYear?.id));
  }, [data, activeYear]);

  // Calcul d'effectif actuel par classe pour afficher la capacité
  const getGroupOccupancy = (groupId) => {
    const count =
      data?.inscriptions?.filter(
        (i) =>
          Number(i.id_groupe) === Number(groupId) &&
          Number(i.id_annee) === Number(activeYear?.id) &&
          i.statut === 'Active'
      ).length || 0;
    const group = data?.groupes?.find((g) => Number(g.id) === Number(groupId));
    const capacity = group?.capacite || 20;
    return { count, capacity, isFull: count >= capacity };
  };

  if (!isOpen) return null;

  const isTransfer = dialogMode === 'transfert';

  // Liste filtrée des auditeurs pour la sélection rapide
  const filteredAuditeurs = (data?.auditeurs || []).filter((a) => {
    if (!auditeurSearch.trim()) return true;
    const term = auditeurSearch.trim().toLowerCase();
    const fullName = `${a.prenom} ${a.nom}`.toLowerCase();
    const mat = (a.matricule || '').toLowerCase();
    return fullName.includes(term) || mat.includes(term);
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!currentAuditeur) {
      setError('Veuillez sélectionner un auditeur.');
      return;
    }

    if (!selectedGroupeId) {
      setError('Veuillez sélectionner une classe.');
      return;
    }

    if (isTransfer) {
      if (!currentActiveEnrollment) {
        setError('Aucune inscription active en cours pour effectuer un transfert.');
        return;
      }
      if (Number(selectedGroupeId) === Number(currentActiveEnrollment?.id_groupe)) {
        setError('La nouvelle classe de destination doit être différente de la classe actuelle.');
        return;
      }
      try {
        onTransferer({
          id_auditeur: currentAuditeur.id,
          nouveau_id_groupe: Number(selectedGroupeId),
          date_transfert: dateInscription,
          motif: motif || 'Transfert de classe demandé',
        });
        onClose();
      } catch (err) {
        setError(err.message || 'Erreur lors du transfert.');
      }
    } else {
      // Inscription classique : vérifier la règle d'unicité active
      if (currentActiveEnrollment && statut === 'Active') {
        setError(
          `Règle d’unicité : Cet auditeur est déjà inscrit activement dans "${currentGroup?.libelle}". Veuillez utiliser le mode Transfert pour changer de classe.`
        );
        return;
      }

      try {
        onInscrire({
          id_auditeur: currentAuditeur.id,
          id_groupe: Number(selectedGroupeId),
          id_annee: activeYear?.id,
          date_inscription: dateInscription,
          type_inscription: typeInscription,
          statut,
          motif: motif || (typeInscription === 'Réinscription' ? 'Réinscription annuelle' : 'Nouvelle inscription'),
        });
        onClose();
      } catch (err) {
        setError(err.message || 'Erreur lors de l’inscription.');
      }
    }
  };

  const selectedOccupancy = selectedGroupeId ? getGroupOccupancy(Number(selectedGroupeId)) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inscription-dialog-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-xs ${
                isTransfer ? 'bg-purple-600' : 'bg-teal-700'
              }`}
            >
              {isTransfer ? <ArrowRightLeft className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
            </div>
            <div>
              <h2 id="inscription-dialog-title" className="text-base font-bold text-slate-900">
                {isTransfer ? 'Changer un auditeur de classe (Transfert)' : 'Inscrire un auditeur en classe'}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Année scolaire active :</span>
                <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-sm border border-teal-200">
                  {activeYear?.libelle || '2026-2027'}
                </span>
              </div>
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

        {/* Mode Selector Tabs (si l'auditeur est déjà inscrit) */}
        {currentActiveEnrollment && (
          <div className="flex border-b border-slate-100 bg-slate-50/40 px-6 pt-3">
            <button
              type="button"
              onClick={() => {
                setDialogMode('transfert');
                setError('');
              }}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-semibold transition ${
                dialogMode === 'transfert'
                  ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Transfert de classe (Recommandé)
            </button>
            <button
              type="button"
              onClick={() => {
                setDialogMode('inscription');
                setError('');
              }}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-semibold transition ${
                dialogMode === 'inscription'
                  ? 'border-teal-700 text-teal-800 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              Nouvelle inscription
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Sélection ou Affichage de l'Auditeur */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Auditeur (Élève) <span className="text-rose-600">*</span>
            </label>
            {auditeur ? (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold">
                    {auditeur.prenom?.charAt(0)}{auditeur.nom?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{auditeur.prenom} {auditeur.nom}</p>
                    <p className="font-mono text-[11px] text-slate-500">{auditeur.matricule} · Sexe : {auditeur.sexe}</p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                  Dossier sélectionné
                </span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <select
                  required
                  value={selectedAuditeurId}
                  onChange={(e) => setSelectedAuditeurId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                >
                  <option value="">-- Choisir un auditeur parmi la base --</option>
                  {filteredAuditeurs.map((a) => {
                    const activeInsc = data?.inscriptions?.find(
                      (i) =>
                        Number(i.id_auditeur) === Number(a.id) &&
                        Number(i.id_annee) === Number(activeYear?.id) &&
                        i.statut === 'Active'
                    );
                    const grp = activeInsc ? data?.groupes?.find((g) => Number(g.id) === Number(activeInsc.id_groupe)) : null;

                    return (
                      <option key={a.id} value={a.id}>
                        {a.nom} {a.prenom} ({a.matricule}) — {activeInsc ? `Déjà inscrit en ${grp?.libelle || 'classe'}` : 'Non inscrit cette année'}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-400">
                  Total : {data?.auditeurs?.length || 0} auditeurs répertoriés
                </p>
              </div>
            )}
          </div>

          {/* Current Status / Rule Alert Info Box */}
          {currentActiveEnrollment ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Règle d’unicité : Inscription active déjà existante ({activeYear?.libelle})</span>
              </div>
              <p>
                Classe actuelle : <strong>{currentGroup?.libelle}</strong> ({currentGroup?.formation})
              </p>
              <p className="text-[11px] text-amber-800">
                {isTransfer
                  ? 'Le transfert va clôturer l’inscription actuelle avec le statut « Transférée » et créer la nouvelle inscription en conservant tout l’historique.'
                  : 'Attention : Un auditeur ne peut pas être inscrit deux fois dans la même année scolaire. Utilisez le mode « Transfert » ci-dessus pour changer de classe.'}
              </p>
            </div>
          ) : currentAuditeur ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Cet élève est éligible pour une inscription directe dans l’année {activeYear?.libelle}.
                {hasPastEnrollments ? ' (Ancien auditeur détecté → Réinscription suggérée)' : ' (Nouvel arrivant)'}
              </span>
            </div>
          ) : null}

          {/* 2. Sélection de la Classe / Groupe */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isTransfer ? 'Nouvelle classe de destination' : 'Classe / Groupe d’affectation'} <span className="text-rose-600">*</span>
            </label>
            <select
              required
              value={selectedGroupeId}
              onChange={(e) => setSelectedGroupeId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
            >
              <option value="">-- Sélectionner une classe ({activeYear?.libelle}) --</option>
              {availableGroups.map((g) => {
                const occ = getGroupOccupancy(g.id);
                const isCurrent = Number(g.id) === Number(currentActiveEnrollment?.id_groupe);
                return (
                  <option key={g.id} value={g.id} disabled={isCurrent || occ.isFull}>
                    {g.libelle} — {g.formation} ({occ.count}/{occ.capacity} places) {occ.isFull ? '🔴 COMPLETE' : '🟢'} {isCurrent ? '(Classe actuelle)' : ''}
                  </option>
                );
              })}
            </select>

            {selectedOccupancy && (
              <div className="mt-2 flex items-center justify-between text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                <span>
                  Places pourvues : <strong>{selectedOccupancy.count} / {selectedOccupancy.capacity}</strong>
                </span>
                <span className={selectedOccupancy.isFull ? 'font-bold text-rose-600' : 'text-emerald-700 font-semibold'}>
                  {selectedOccupancy.capacity - selectedOccupancy.count} place(s) disponible(s)
                </span>
              </div>
            )}
          </div>

          {/* 3. Date & Type d'inscription */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date d’inscription <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                required
                value={dateInscription}
                onChange={(e) => setDateInscription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
            </div>

            {!isTransfer ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Type d’inscription <span className="text-rose-600">*</span>
                </label>
                <select
                  value={typeInscription}
                  onChange={(e) => setTypeInscription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                >
                  <option value="Nouvelle">Nouvelle inscription</option>
                  <option value="Réinscription">Réinscription (Ancien élève)</option>
                  <option value="Transfert">Transfert externe</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Type d’opération
                </label>
                <input
                  type="text"
                  disabled
                  value="Transfert interne de classe"
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-600 font-semibold"
                />
              </div>
            )}
          </div>

          {/* 4. Statut d'inscription */}
          {!isTransfer && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Statut initial d’inscription
              </label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
              >
                <option value="Active">Active (Permet le pointage et l’évaluation)</option>
                <option value="En attente">En attente (Dossier incomplet / justificatifs requis)</option>
              </select>
            </div>
          )}

          {/* 5. Motif / Remarque administrative */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motif / Observation administrative
            </label>
            <input
              type="text"
              placeholder={
                isTransfer
                  ? 'ex: Réorientation vers niveau supérieur suite à test'
                  : 'ex: Inscription rentrée 2026-2027 validée'
              }
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className={`rounded-lg px-5 py-2 text-xs font-semibold text-white shadow-xs transition ${
                isTransfer ? 'bg-purple-700 hover:bg-purple-800' : 'bg-teal-700 hover:bg-teal-800'
              }`}
            >
              {isTransfer ? 'Confirmer le transfert' : 'Valider l’inscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
