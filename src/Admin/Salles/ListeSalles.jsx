import { useMemo, useState } from 'react';
import { Download, Printer, Search, SquarePen, Trash2 } from 'lucide-react';
import { exportRoomsCsv, ROOM_STATUSES } from './sallesHelpers';
import { RoomFilter } from './SallesComponents';

const PAGE_SIZES = [10, 20, 50];
const SORTABLE_COLUMNS = [
  { key: 'code', label: 'Code' },
  { key: 'libelle', label: 'Nom de la salle' },
  { key: 'capacite', label: 'Capacité' },
  { key: 'displayStatus', label: 'Statut' },
  { key: 'groupCount', label: 'Groupes affectés' },
  { key: 'trainerLabel', label: 'Formateur attitré' },
];

export default function ListeSalles({
  rooms, onNew, onEdit, onDelete, onStatusChange,
  canCreate = false, canUpdate = false, canDelete = false, canExport = false,
}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState({ key: 'code', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredRooms = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('fr');
    const filtered = rooms.filter((room) => (
      (!term || `${room.code} ${room.libelle}`.toLocaleLowerCase('fr').includes(term))
      && (!status || room.displayStatus === status)
    ));
    return filtered.sort((first, second) => {
      const left = first[sort.key];
      const right = second[sort.key];
      const order = typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left ?? '').localeCompare(String(right ?? ''), 'fr', { numeric: true, sensitivity: 'base' });
      return sort.direction === 'asc' ? order : -order;
    });
  }, [rooms, search, sort, status]);

  const pageCount = Math.max(1, Math.ceil(filteredRooms.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filteredRooms.slice(start, start + pageSize);

  const sortBy = (key) => {
    setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
    setPage(1);
  };

  return <div className="space-y-4">
    <section className="flex flex-col gap-4 border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <label className="relative block"><span className="mb-1.5 block text-[11px] font-bold uppercase text-slate-500">Recherche code ou nom</span><Search className="absolute left-3 top-9 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Ex. A-101" className="w-full border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-700" /></label>
          <RoomFilter label="Statut" value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={ROOM_STATUSES} />
        </div>
        <div className="flex flex-wrap gap-2">{canExport && <button type="button" onClick={() => exportRoomsCsv(filteredRooms)} disabled={!filteredRooms.length} className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Download className="h-4 w-4" /> Excel / CSV</button>}<button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Printer className="h-4 w-4" /> PDF / imprimer</button>{canCreate && <button type="button" onClick={onNew} className="bg-teal-800 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-teal-900">Nouvelle salle</button>}</div>
      </div>
    </section>

    <section className="border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"><p className="text-sm font-bold text-slate-900">Registre des salles <span className="ml-1 font-normal text-slate-500">{filteredRooms.length}</span></p><label className="flex items-center gap-2 text-xs text-slate-500">Lignes<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="border border-slate-300 bg-white px-2 py-1.5 text-xs">{PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></label></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr>{SORTABLE_COLUMNS.map((column) => <th key={column.key} className="px-4 py-3"><button type="button" onClick={() => sortBy(column.key)} className="font-bold hover:text-slate-900">{column.label}{sort.key === column.key ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}</button></th>)}<th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{pageRows.map((room) => <tr key={room.id} className="hover:bg-slate-50/70"><td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{room.code}</td><td className="px-4 py-3 font-semibold text-slate-800">{room.libelle}</td><td className="px-4 py-3 tabular-nums text-slate-700">{room.capacite ?? '—'}</td><td className="px-4 py-3"><select disabled={!canUpdate} aria-label={`Changer le statut de ${room.libelle}`} value={room.displayStatus} onChange={(event) => onStatusChange(room, event.target.value)} className="border border-transparent bg-transparent p-1 outline-none focus:border-slate-300 disabled:cursor-default">{ROOM_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></td><td className="px-4 py-3 text-xs text-slate-600">{room.groupCount ? `${room.groupCount} groupe(s)` : 'Aucun groupe'}</td><td className="px-4 py-3 text-xs text-slate-600">{room.trainerLabel || 'Sans formateur'}</td><td className="px-4 py-3"><div className="flex justify-end gap-1">{canUpdate && <button type="button" onClick={() => onEdit(room)} aria-label={`Modifier ${room.libelle}`} title="Modifier" className="p-2 text-slate-500 hover:bg-teal-50 hover:text-teal-800"><SquarePen className="h-4 w-4" /></button>}{canDelete && <button type="button" onClick={() => onDelete(room)} aria-label={`Supprimer ${room.libelle}`} title="Supprimer" className="p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>}</div></td></tr>)}</tbody></table>
      {!pageRows.length && <p className="px-5 py-12 text-center text-sm text-slate-500">Aucune salle ne correspond à ces filtres.</p>}</div>
      <footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-500"><span>{filteredRooms.length ? `Résultats ${start + 1}–${Math.min(start + pageSize, filteredRooms.length)} sur ${filteredRooms.length}` : 'Aucun résultat'}</span><div className="flex gap-2"><button type="button" disabled={currentPage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="border border-slate-300 px-3 py-1.5 disabled:opacity-40">Précédent</button><span className="px-2 py-1.5">{currentPage} / {pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="border border-slate-300 px-3 py-1.5 disabled:opacity-40">Suivant</button></div></footer>
    </section>
  </div>;
}