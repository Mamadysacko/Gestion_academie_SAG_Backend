import { useState } from 'react';
import FormDialog from '../../composant/FormDialog';
import SaveActions from '../../composant/SaveActions';
import { PERIOD_NAMES } from '../../utils/leave';

/**
 * Fenêtre de saisie de la période d'un congé ou d'une permission (même fenêtre pour les deux statuts).
 * Utilisée par la feuille de pointage, les historiques de présence et l'espace formateur.
 *
 *   kind        'conge' | 'permissionnaire'
 *   person      nom de l'auditeur
 *   date        date du pointage (la période doit la contenir)
 *   initial     { debut, fin } proposés
 *   onConfirm   ({ debut, fin }) appelé à l'enregistrement
 */
export default function LeaveDialog({ kind, person, date, initial, onConfirm, onClose }) {
  const name = PERIOD_NAMES[kind] || PERIOD_NAMES.conge;
  const [debut, setDebut] = useState(initial?.debut || date);
  const [fin, setFin] = useState(initial?.fin || date);
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (!debut || !fin) { setError('Renseignez la date de début et la date de fin.'); return; }
    if (fin < debut) { setError('La date de fin doit être égale ou postérieure à la date de début.'); return; }
    onConfirm({ debut, fin });
  };
  const input = 'mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold-light/50';

  return (
    <FormDialog
      titleId="leave-dialog-title"
      title={`Période de ${kind === 'conge' ? 'congé' : 'permission'}`}
      description={`${person} — les jours de cours compris dans cette période seront pointés « ${name} » automatiquement et la période apparaîtra dans la colonne Observation des rapports.`}
      size="max-w-md"
      onClose={onClose}
      footer={<SaveActions form="leave-form" onCancel={onClose} submitLabel={`Enregistrer ${kind === 'conge' ? 'le congé' : 'la permission'}`} />}
    >
      <form id="leave-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-slate-700">Du
            <input required type="date" autoFocus value={debut} max={date} onChange={(event) => { setDebut(event.target.value); setError(''); }} className={input} />
          </label>
          <label className="text-xs font-semibold text-slate-700">Au
            <input required type="date" value={fin} min={debut || date} onChange={(event) => { setFin(event.target.value); setError(''); }} className={input} />
          </label>
        </div>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
      </form>
    </FormDialog>
  );
}
