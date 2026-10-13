import { useMemo, useState } from 'react';
import { CalendarDays, Plus, SquarePen, Trash2 } from 'lucide-react';
import { WEEKDAYS } from './sallesHelpers';
import { RoomFilter, RoomMetric } from './SallesComponents';
import { getCurrentSchoolYear } from '../../utils/schoolYear';

export default function AffectationsSalles({
  assignments, years, sessions = [], rooms, groups, onNew, onEdit, onDelete,
  canCreate = false, canUpdate = false, canDelete = false,
}) {
  const [yearId, setYearId] = useState('');
  const selectedYearId = yearId && years.some((year) => String(year.id) === yearId)
    ? yearId
    : String(getCurrentSchoolYear(years)?.id || '');
  const [sessionIds, setSessionIds] = useState([]);
  const [roomIds, setRoomIds] = useState([]);
  const [groupIds, setGroupIds] = useState([]);
  const [weekdays, setWeekdays] = useState([]);

  const visible = useMemo(() => assignments
    .filter((assignment) => String(assignment.id_annee) === selectedYearId)
    .filter((assignment) => !sessionIds.length || sessionIds.includes(String(assignment.group?.id_session)))
    .filter((assignment) => !roomIds.length || roomIds.includes(String(assignment.id_salle)))
    .filter((assignment) => !groupIds.length || groupIds.includes(String(assignment.id_groupe)))
    .filter((assignment) => !weekdays.length || weekdays.includes(String(assignment.jour_semaine)))
    .sort((a, b) => a.jour_semaine - b.jour_semaine || a.room?.code.localeCompare(b.room?.code || '') || a.group?.libelle.localeCompare(b.group?.libelle || '')),
  [assignments, groupIds, roomIds, selectedYearId, sessionIds, weekdays]);

  const roomCount = new Set(visible.map((item) => item.id_salle)).size;
  const groupCount = new Set(visible.map((item) => item.id_groupe)).size;
  const activeCount = visible.filter((item) => Number(item.statut) === 1).length;

  return <div className="space-y-4">
    <section className="flex flex-col gap-3 border border-slate-200 bg-white p-4 lg:flex-row lg:items-end lg:justify-between"><div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"><RoomFilter label="Année scolaire" value={selectedYearId} onChange={(value) => { setYearId(value); setSessionIds([]); }} placeholder="Sélectionner" options={years.map((year) => ({ value: String(year.id), label: year.libelle }))} /><RoomFilter multiple label="Session" value={sessionIds} onChange={(value) => { setSessionIds(value); setGroupIds([]); }} placeholder="Toutes" options={sessions.filter((session) => String(session.id_annee) === selectedYearId).map((session) => ({ value: String(session.id), label: `${session.code} · ${session.libelle}` }))} /><RoomFilter multiple label="Salle" value={roomIds} onChange={setRoomIds} options={rooms.map((room) => ({ value: String(room.id), label: `${room.code} · ${room.libelle}` }))} /><RoomFilter multiple label="Groupe" value={groupIds} onChange={setGroupIds} options={groups.filter((group) => !sessionIds.length || sessionIds.includes(String(group.id_session))).map((group) => ({ value: String(group.id), label: group.libelle }))} /><RoomFilter multiple label="Jour" value={weekdays} onChange={setWeekdays} options={WEEKDAYS.map((day) => ({ value: String(day.value), label: day.label }))} /></div>{canCreate && <button type="button" onClick={onNew} className="inline-flex items-center justify-center gap-2 bg-teal-800 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-teal-900"><Plus className="h-4 w-4" /> Nouvelle affectation</button>}</section>
    <section className="grid gap-3 sm:grid-cols-3"><RoomMetric label="Créneaux actifs" value={activeCount} tone="teal" /><RoomMetric label="Salles mobilisées" value={roomCount} tone="slate" /><RoomMetric label="Groupes affectés" value={groupCount} tone="green" /></section>
    <section className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-bold text-slate-900">Affectations hebdomadaires · {years.find((year) => String(year.id) === selectedYearId)?.libelle}</h2><p className="mt-1 text-xs text-slate-500">Un créneau associe un groupe, une salle et un formateur à un jour de la semaine.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Jour</th><th className="px-4 py-3">Salle</th><th className="px-4 py-3">Capacité</th><th className="px-4 py-3">Groupe / session</th><th className="px-4 py-3">Formateur</th><th className="px-4 py-3">Effectif actif</th><th className="px-4 py-3">Créneau</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((item) => <tr key={item.id} className="hover:bg-slate-50/70"><td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700"><CalendarDays className="h-3.5 w-3.5 text-teal-700" />{WEEKDAYS.find((day) => day.value === item.jour_semaine)?.label}</span></td><td className="px-4 py-3"><p className="font-mono text-xs font-bold text-slate-800">{item.room?.code}</p><p className="mt-1 text-xs text-slate-500">{item.room?.libelle}</p></td><td className="px-4 py-3 tabular-nums text-slate-700">{item.room?.capacite ?? '—'}</td><td className="px-4 py-3"><p className="text-xs font-semibold text-slate-800">{item.group?.libelle}</p><p className="mt-1 text-[10px] text-slate-500">{item.session?.code} · {item.session?.libelle}</p></td><td className="px-4 py-3 text-xs text-slate-700">{item.trainer?.prenom} {item.trainer?.nom}</td><td className="px-4 py-3 tabular-nums text-slate-700">{item.activeLearners ?? '—'}</td><td className="px-4 py-3 text-xs text-slate-600">{Number(item.statut) === 1 ? 'Actif' : 'Inactif'}</td><td className="px-4 py-3"><div className="flex justify-end gap-1">{canUpdate && <button type="button" onClick={() => onEdit(item)} aria-label="Modifier l’affectation" className="p-2 text-slate-500 hover:bg-teal-50 hover:text-teal-800"><SquarePen className="h-4 w-4" /></button>}{canDelete && <button type="button" onClick={() => onDelete(item)} aria-label="Supprimer l’affectation" className="p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>}</div></td></tr>)}</tbody></table>{!visible.length && <p className="px-5 py-12 text-center text-sm text-slate-500">Aucun créneau ne correspond à ces filtres.</p>}</div></section>
  </div>;
}