import { useMemo, useState } from 'react';
import { Download, Printer, Search, X } from 'lucide-react';
import { exportNotesCsv } from './notesHelpers';
import { NotesFilter, NotesTable } from './NotesComponents';
import { useConfirm } from '../../composant/confirmContext';
import { printPage } from '../../utils/print';
import ModalOverlay from '../../composant/ModalOverlay';

const SORT_OPTIONS = [
  { value: 'name', label: 'Nom de l’auditeur' },
  { value: 'note', label: 'Note' },
  { value: 'evaluation', label: 'Évaluation' },
  { value: 'date', label: 'Date' },
  { value: 'group', label: 'Groupe' },
];

export default function ListeNotes({
  rows,
  sessions,
  groups,
  rooms,
  evaluations,
  onSave,
  onDelete,
  canUpdate = false,
  canDelete = false,
  saving = false,
}) {
  const confirm = useConfirm();
  const [filters, setFilters] = useState({ session: '', group: '', room: '', evaluation: '', search: '' });
  const [sort, setSort] = useState({ key: 'date', direction: 'desc' });
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ note: '', observation: '' });
  const [error, setError] = useState('');
  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const visibleRows = useMemo(() => {
    const term = filters.search.trim().toLocaleLowerCase('fr');
    const filtered = rows.filter((row) => {
      const name = `${row.attendee?.matricule || ''} ${row.attendee?.prenom || ''} ${row.attendee?.nom || ''}`.toLocaleLowerCase('fr');
      return (!filters.session || String(row.session?.id) === filters.session)
        && (!filters.group || String(row.group?.id) === filters.group)
        && (!filters.room || String(row.room?.id) === filters.room)
        && (!filters.evaluation || String(row.evaluation?.id) === filters.evaluation)
        && (!term || `${name} ${row.criterion?.libelle || ''} ${row.evaluation?.libelle || ''}`.toLocaleLowerCase('fr').includes(term));
    });

    return filtered.sort((a, b) => {
      const values = {
        name: `${a.attendee?.nom || ''} ${a.attendee?.prenom || ''}`.localeCompare(`${b.attendee?.nom || ''} ${b.attendee?.prenom || ''}`, 'fr'),
        note: (Number(a.note) || -1) - (Number(b.note) || -1),
        evaluation: (a.evaluation?.libelle || '').localeCompare(b.evaluation?.libelle || '', 'fr'),
        date: (a.evaluation?.date_evaluation || '').localeCompare(b.evaluation?.date_evaluation || ''),
        group: (a.group?.libelle || '').localeCompare(b.group?.libelle || '', 'fr'),
      }[sort.key];
      return sort.direction === 'asc' ? values : -values;
    });
  }, [filters, rows, sort]);

  const openEdit = (row) => {
    setEditing(row);
    setDraft({ note: row.note == null ? '' : String(row.note), observation: row.observation || '' });
    setError('');
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    const parsed = draft.note === '' ? null : Number(draft.note);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0 || parsed > Number(editing.criterion.bareme))) {
      setError(`La note doit être comprise entre 0 et ${editing.criterion.bareme}.`);
      return;
    }
    if (await onSave({ ...editing, note: parsed, observation: draft.observation })) setEditing(null);
  };

  const remove = async (row) => {
    if (canDelete && await confirm(`Supprimer la note de ${row.attendee?.prenom} ${row.attendee?.nom} pour « ${row.criterion?.libelle} » ?`)) onDelete(row);
  };

  const changeSort = (event) => {
    const key = event.target.value;
    setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
  };

  return (
    <div className="space-y-4">
      <section className="space-y-4 border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <NotesFilter label="Session" value={filters.session} onChange={(value) => setFilters((current) => ({ ...current, session: value, group: '', room: '', evaluation: '' }))} options={sessions.map((session) => ({ value: String(session.id), label: `${session.code} · ${session.libelle}` }))} />
            <NotesFilter label="Groupe" value={filters.group} onChange={(value) => update('group', value)} options={groups.filter((group) => !filters.session || String(group.id_session) === filters.session).map((group) => ({ value: String(group.id), label: `${group.code} · ${group.libelle}` }))} />
            <NotesFilter label="Salle" value={filters.room} onChange={(value) => update('room', value)} options={rooms.map((room) => ({ value: String(room.id), label: `${room.code} · ${room.libelle}` }))} />
            <NotesFilter label="Évaluation" value={filters.evaluation} onChange={(value) => update('evaluation', value)} options={evaluations.filter((evaluation) => !filters.session || String(evaluation.id_session) === filters.session).map((evaluation) => ({ value: String(evaluation.id), label: `Évaluation ${evaluation.numero} · ${evaluation.libelle}` }))} />
            <label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase text-slate-500">Trier par</span><select value={sort.key} onChange={changeSort} className="w-full border border-slate-300 bg-white px-3 py-2.5 text-sm">{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label} · {sort.direction === 'asc' ? 'croissant' : 'décroissant'}</option>)}</select></label>
          </div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => exportNotesCsv(visibleRows, 'liste-notes')} disabled={!visibleRows.length} className="inline-flex items-center gap-2 border border-slate-300 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Download className="h-4 w-4" /> Excel / CSV</button><button type="button" onClick={() => printPage('Liste des notes')} className="inline-flex items-center gap-2 border border-slate-300 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Printer className="h-4 w-4" /> PDF / imprimer</button></div>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-end lg:justify-between"><label className="relative block w-full lg:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={filters.search} onChange={(event) => update('search', event.target.value)} placeholder="Nom, matricule, critère, évaluation" className="w-full border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-700" /></label></div>
      </section>
      <section className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-bold text-slate-900">Notes trouvées <span className="ml-1 font-normal text-slate-500">{visibleRows.length}</span></h2></div><NotesTable rows={visibleRows} onEdit={canUpdate ? openEdit : undefined} onDelete={canDelete ? remove : undefined} /></section>

      {editing && <ModalOverlay onClose={() => { if (!saving) setEditing(null); }}><section role="dialog" aria-modal="true" aria-labelledby="edit-grade-title" className="w-full max-w-lg border border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-200 p-5"><div><h2 id="edit-grade-title" className="text-base font-bold text-slate-900">Modifier la note</h2><p className="mt-1 text-xs text-slate-500">{editing.attendee?.prenom} {editing.attendee?.nom} · {editing.criterion?.libelle}</p></div><button type="button" disabled={saving} onClick={() => setEditing(null)} aria-label="Fermer" className="p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"><X className="h-4 w-4" /></button></div><form onSubmit={submitEdit} className="space-y-4 p-5"><label className="block text-xs font-semibold text-slate-700">Note sur {Number(editing.criterion?.bareme).toFixed(2)}<input type="number" min="0" max={editing.criterion?.bareme} step="0.01" value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm" /></label><label className="block text-xs font-semibold text-slate-700">Observation<textarea maxLength="255" value={draft.observation} onChange={(event) => setDraft((current) => ({ ...current, observation: event.target.value }))} rows="3" className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm" /></label>{error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}<div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={saving} onClick={() => setEditing(null)} className="border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40">Annuler</button><button type="submit" disabled={saving} className="bg-emerald-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div></form></section></ModalOverlay>}
    </div>
  );
}