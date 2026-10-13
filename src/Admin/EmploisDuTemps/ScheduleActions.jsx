import { Ban, Pencil, RotateCcw, Trash2 } from 'lucide-react';

export default function ScheduleActions({ schedule, canUpdate, canDelete, onEdit, onToggleStatus, onDelete }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {canUpdate && (
        <>
          <button type="button" onClick={() => onEdit(schedule)} title="Modifier l’affectation" aria-label="Modifier l’affectation" className="rounded-md p-2 text-slate-600 hover:bg-teal-50 hover:text-teal-800"><Pencil size={15} /></button>
          <button type="button" onClick={() => onToggleStatus(schedule)} title={Number(schedule.statut) === 1 ? 'Désactiver le créneau' : 'Réactiver le créneau'} aria-label={Number(schedule.statut) === 1 ? 'Désactiver le créneau' : 'Réactiver le créneau'} className="rounded-md p-2 text-slate-600 hover:bg-amber-50 hover:text-amber-800">
            {Number(schedule.statut) === 1 ? <Ban size={15} /> : <RotateCcw size={15} />}
          </button>
        </>
      )}
      {canDelete && <button type="button" onClick={() => onDelete(schedule)} title="Supprimer définitivement" aria-label="Supprimer définitivement" className="rounded-md p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={15} /></button>}
    </div>
  );
}
