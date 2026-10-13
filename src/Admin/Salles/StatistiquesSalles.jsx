import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { getRoomOccupancy } from './sallesHelpers';
import { RoomFilter, RoomMetric, StatusBadge } from './SallesComponents';
import { getCurrentSchoolYear } from '../../utils/schoolYear';

export default function StatistiquesSalles({ data, rooms, years }) {
  const activeYear = getCurrentSchoolYear(years);
  const [yearId, setYearId] = useState('');
  const selectedYearId = yearId && years.some((item) => String(item.id) === yearId)
    ? yearId
    : String(activeYear?.id || '');
  const year = years.find((item) => String(item.id) === selectedYearId);
  const activeSchedules = data.emplois_du_temps.filter((schedule) => String(schedule.id_annee) === selectedYearId && Number(schedule.statut) === 1);
  const occupancyByRoom = useMemo(() => rooms.map((room) => ({
    room,
    ...getRoomOccupancy(room, activeSchedules, data.groupes, data.inscriptions),
  })), [activeSchedules, data.groupes, data.inscriptions, rooms]);

  const totalCapacity = rooms.reduce((sum, room) => sum + (Number(room.capacite) || 0), 0);
  const peakSeats = occupancyByRoom.reduce((sum, item) => sum + item.peakLearners, 0);
  const occupancyRate = totalCapacity ? Math.round((peakSeats / totalCapacity) * 100) : 0;
  const activeGroups = data.groupes.filter((group) => {
    const session = data.sessions.find((item) => item.id === group.id_session);
    return String(session?.id_annee) === selectedYearId && Number(group.statut) === 1;
  });
  const assignedGroupIds = new Set(activeSchedules.map((schedule) => schedule.id_groupe));
  const groupsWithoutRoom = activeGroups.filter((group) => !assignedGroupIds.has(group.id));
  return <div className="space-y-4">
    <section className="flex flex-col gap-3 border border-slate-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-bold text-slate-900">Indicateurs du parc de salles</p><p className="mt-1 text-xs text-slate-500">Occupation calculée sur le pic d’effectif par créneau actif de l’année sélectionnée.</p></div><RoomFilter label="Année scolaire" value={selectedYearId} onChange={setYearId} placeholder="Sélectionner" options={years.map((item) => ({ value: String(item.id), label: item.libelle }))} /></section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><RoomMetric label="Salles au catalogue" value={rooms.length} tone="slate" /><RoomMetric label="Disponibles" value={rooms.filter((room) => room.displayStatus === 'disponible').length} tone="green" /><RoomMetric label="Indisponibles" value={rooms.filter((room) => room.displayStatus === 'indisponible').length} tone="red" /></section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><RoomMetric label="Capacité totale" value={`${totalCapacity} places`} tone="teal" /><RoomMetric label="Capacité moyenne" value={`${rooms.length ? (totalCapacity / rooms.length).toFixed(1) : '0.0'} places`} /><RoomMetric label="Occupation estimée" value={`${occupancyRate} %`} detail={`${peakSeats} places au pic sur ${year?.libelle || 'l’année'}`} tone={occupancyRate > 85 ? 'amber' : 'blue'} /><RoomMetric label="Groupes sans salle" value={groupsWithoutRoom.length} detail={`sur ${activeGroups.length} groupes actifs`} tone={groupsWithoutRoom.length ? 'rose' : 'green'} /></section>
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-bold text-slate-900">Occupation par salle · année {year?.libelle}</h2></div><div className="divide-y divide-slate-100">{occupancyByRoom.map(({ room, peakLearners, activeLearners, groupCount, occupancyRate: rate }) => <div key={room.id} className="space-y-2 px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold text-slate-800">{room.code} · {room.libelle}</p><p className="mt-1 text-[10px] text-slate-500">{peakLearners}/{room.capacite ?? '—'} places au pic · {groupCount} groupe(s), {activeLearners} auditeur(s) affectés/semaine</p></div><span className="text-xs font-bold tabular-nums text-slate-700">{rate === null ? '—' : `${rate}%`}</span></div><div className="h-2 bg-slate-100"><div className={`h-full ${rate >= 85 ? 'bg-amber-600' : 'bg-teal-700'}`} style={{ width: `${rate ?? 0}%` }} /></div></div>)}</div></div>
      <div className="space-y-4">
        <div className="border border-slate-200 bg-white"><div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3"><BarChart3 className="h-4 w-4 text-teal-700" /><h2 className="text-sm font-bold text-slate-900">Utilisation des salles</h2></div><div className="divide-y divide-slate-100">{rooms.map((room) => <div key={room.id} className="flex items-center justify-between gap-3 px-4 py-3 text-xs"><span className="font-semibold text-slate-700">{room.code} · {room.libelle}</span><span className="tabular-nums text-slate-500">{room.groupCount} groupe(s) · {room.activeLearners} inscrit(s) · {room.statut}</span></div>)}</div></div>
        <div className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-bold text-slate-900">Groupes sans créneau de salle</h2></div><div className="divide-y divide-slate-100">{groupsWithoutRoom.length ? groupsWithoutRoom.map((group) => <div key={group.id} className="flex items-center justify-between gap-3 px-4 py-3"><div><p className="text-xs font-semibold text-slate-800">{group.libelle}</p><p className="mt-1 text-[10px] text-slate-500">{group.code} · capacité {group.capacite ?? '—'}</p></div><StatusBadge status="indisponible" /></div>) : <p className="px-4 py-8 text-center text-xs text-slate-500">Tous les groupes actifs ont au moins une salle affectée.</p>}</div></div>
      </div>
    </section>
  </div>;
}