import { Download, Search, SquarePen, Trash2, X } from 'lucide-react';
import TagSelect from '../../composant/TagSelect';
import ModalOverlay from '../../composant/ModalOverlay';


export function NotesFilter({ label, value, onChange, options, placeholder = 'Tous', multiple = false }) {
  return <TagSelect label={label} value={value} onChange={onChange} options={options} placeholder={placeholder} multiple={multiple} />;
}

export function PeriodFilter({ start, end, onStartChange, onEndChange }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase text-slate-500">Du</span><input type="date" value={start} max={end} onChange={(event) => onStartChange(event.target.value)} className="border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700" /></label>
      <label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase text-slate-500">Au</span><input type="date" value={end} min={start} onChange={(event) => onEndChange(event.target.value)} className="border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700" /></label>
    </div>
  );
}

export function NotesSearch({ value, onChange, placeholder = 'Rechercher un auditeur' }) {
  return <label className="relative block w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-700" /></label>;
}

export function NotesMetric({ label, value, tone = 'emerald', detail }) {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    rose: 'border-rose-200 bg-rose-50 text-rose-950',
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
    slate: 'border-slate-200 bg-white text-slate-900',
    blue: 'border-sky-200 bg-sky-50 text-sky-950',
  };
  return <div className={`border p-4 ${tones[tone]}`}><p className="text-[11px] font-bold uppercase text-current/70">{label}</p><p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>{detail && <p className="mt-1 text-xs text-current/70">{detail}</p>}</div>;
}

export function GradeBookTable({ rows, criteria, onChange, disabled = false }) {
  if (!rows.length) return <div className="px-5 py-12 text-center text-sm text-slate-500">Aucun auditeur inscrit dans ce groupe pour cette session.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] text-left text-sm">
        <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Auditeur</th><th className="px-4 py-3">Groupe / département</th>{criteria.map((criterion) => <th key={criterion.id} className="min-w-52 px-3 py-3 text-center">{criterion.libelle}<span className="mt-1 block text-emerald-700">/{Number(criterion.bareme).toFixed(2)}</span></th>)}<th className="px-4 py-3 text-center">Moyenne /4</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.enrollment.id} className="align-top hover:bg-emerald-50/30">
          <td className="px-4 py-3"><p className="font-semibold text-slate-800">{row.attendee.prenom} {row.attendee.nom}</p><p className="mt-1 font-mono text-[11px] text-slate-500">{row.attendee.matricule}</p><p className="mt-1 text-[11px] text-slate-500">{row.attendee.telephone || 'Téléphone non renseigné'}</p></td>
          <td className="px-4 py-3 text-xs text-slate-600"><p className="font-semibold text-slate-700">{row.group?.libelle || '—'}</p><p className="mt-1">{row.department?.libelle || '—'}</p></td>
          {criteria.map((criterion) => {
            const grade = row.grades[criterion.id] || {};
            return <td key={criterion.id} className="px-3 py-3"><input type="number" min="0" max={criterion.bareme} step="0.01" disabled={disabled} value={grade.note ?? ''} onChange={(event) => onChange(row.enrollment.id, criterion.id, 'note', event.target.value)} aria-label={`${criterion.libelle} pour ${row.attendee.prenom} ${row.attendee.nom}`} className="w-full border border-slate-300 px-2 py-2 text-center text-sm font-semibold outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100" placeholder={`0–${criterion.bareme}`} /><input type="text" maxLength="255" disabled={disabled} value={grade.observation || ''} onChange={(event) => onChange(row.enrollment.id, criterion.id, 'observation', event.target.value)} className="mt-1 w-full border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-emerald-700 disabled:bg-slate-100" placeholder="Observation" />{grade.note > Number(criterion.bareme) && <span className="mt-1 block text-[10px] font-semibold text-rose-700">Dépasse le barème.</span>}</td>;
          })}
          <td className="px-4 py-3 text-center font-bold text-emerald-800">{row.average4 === null ? '—' : `${row.average4.toFixed(2)} /4`}</td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}

export function NotesTable({ rows, onEdit, onDelete }) {
  if (!rows.length) return <div className="px-5 py-12 text-center text-sm text-slate-500">Aucune note pour ces filtres.</div>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Auditeur</th><th className="px-4 py-3">Groupe</th><th className="px-4 py-3">Évaluation / session</th><th className="px-4 py-3">Critère / barème</th><th className="px-4 py-3">Note</th><th className="px-4 py-3">Salle</th><th className="px-4 py-3">Enseignant</th><th className="px-4 py-3">Observation</th>{(onEdit || onDelete) && <th className="px-4 py-3 text-right">Actions</th>}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id_note} className="hover:bg-slate-50/70"><td className="px-4 py-3"><p className="font-semibold text-slate-800">{row.attendee?.prenom} {row.attendee?.nom}</p><p className="mt-1 font-mono text-[10px] text-slate-500">{row.attendee?.matricule}</p></td><td className="px-4 py-3 text-xs text-slate-700">{row.group?.libelle || '—'}</td><td className="px-4 py-3"><p className="text-xs font-semibold text-slate-800">Évaluation {row.evaluation?.numero} · {row.evaluation?.libelle}</p><p className="mt-1 text-[10px] text-slate-500">{row.session?.libelle}</p></td><td className="px-4 py-3 text-xs">{row.criterion?.libelle} <span className="text-slate-400">/{Number(row.criterion?.bareme).toFixed(2)}</span></td><td className="px-4 py-3 font-bold tabular-nums text-emerald-800">{row.note == null ? 'Non saisie' : `${Number(row.note).toFixed(2)} / ${Number(row.criterion?.bareme).toFixed(2)}`}</td><td className="px-4 py-3 text-xs text-slate-600">{row.room ? `${row.room.code} · ${row.room.libelle}` : "—"}</td><td className="px-4 py-3 text-xs text-slate-700">{row.trainer ? `${row.trainer.prenom} ${row.trainer.nom}` : '—'}</td><td className="max-w-48 px-4 py-3 text-xs text-slate-500">{row.observation || '—'}</td>{(onEdit || onDelete) && <td className="px-4 py-3"><div className="flex justify-end gap-1">{onEdit && <button type="button" onClick={() => onEdit(row)} aria-label="Modifier la note" title="Modifier" className="p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-800"><SquarePen className="h-4 w-4" /></button>}{onDelete && <button type="button" onClick={() => onDelete(row)} aria-label="Supprimer la note" title="Supprimer" className="p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>}</div></td>}</tr>)}</tbody></table></div>;
}

export function GradeEditDialog({ grade, onClose, onSave }) {
  if (!grade) return null;
  const valid = grade.note === '' || (Number.isFinite(Number(grade.note)) && Number(grade.note) >= 0 && Number(grade.note) <= Number(grade.criterion?.bareme));
  return <ModalOverlay onClose={() => { onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="grade-edit-title" className="w-full max-w-lg border border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-200 p-5"><div><h2 id="grade-edit-title" className="text-base font-bold text-slate-900">Modifier une note</h2><p className="mt-1 text-xs text-slate-500">{grade.attendee?.prenom} {grade.attendee?.nom} · {grade.criterion?.libelle}</p></div><button type="button" onClick={onClose} aria-label="Fermer" className="p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><form onSubmit={(event) => { event.preventDefault(); if (valid) onSave(grade); }} className="space-y-4 p-5"><label className="block text-xs font-semibold text-slate-700">Note sur {Number(grade.criterion?.bareme).toFixed(2)}<input type="number" min="0" max={grade.criterion?.bareme} step="0.01" value={grade.note ?? ''} onChange={(event) => onSave({ ...grade, note: event.target.value, preview: true })} className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm" /></label><label className="block text-xs font-semibold text-slate-700">Observation<textarea maxLength="255" value={grade.observation || ''} onChange={(event) => onSave({ ...grade, observation: event.target.value, preview: true })} rows="3" className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm" /></label>{!valid && <p role="alert" className="text-xs font-semibold text-rose-700">La note doit être comprise entre 0 et le barème.</p>}<div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700">Annuler</button><button type="submit" disabled={!valid} className="bg-emerald-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">Enregistrer</button></div></form></section></ModalOverlay>;
}

export function NotesExportButton({ rows, onExport, label = 'Exporter Excel' }) {
  return <button type="button" onClick={() => onExport(rows)} disabled={!rows.length} className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><Download className="h-4 w-4" />{label}</button>;
}