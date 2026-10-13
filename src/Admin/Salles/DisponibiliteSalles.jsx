import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { RoomMetric, StatusBadge } from './SallesComponents';

const STATUS_TABS = [
  { id: 'disponible', label: 'Disponibles', icon: CheckCircle2, tone: 'green' },
  { id: 'indisponible', label: 'Indisponibles', icon: XCircle, tone: 'red' },
];

export default function DisponibiliteSalles({ rooms }) {
  const [activeStatus, setActiveStatus] = useState('disponible');
  const filtered = rooms.filter((room) => room.statut === activeStatus);

  return <div className="space-y-4">
    <section className="grid gap-3 sm:grid-cols-2">
      <RoomMetric label="Disponibles" value={rooms.filter((room) => room.statut === 'disponible').length} tone="green" />
      <RoomMetric label="Indisponibles" value={rooms.filter((room) => room.statut === 'indisponible').length} tone="red" />
    </section>
    <nav aria-label="État des salles" className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {STATUS_TABS.map((tab) => {
        const Icon = tab.icon;
        const active = tab.id === activeStatus;
        const count = rooms.filter((room) => room.statut === tab.id).length;
        return <button key={tab.id} type="button" onClick={() => setActiveStatus(tab.id)} aria-current={active ? 'page' : undefined} className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-xs font-semibold ${active ? 'border-teal-700 text-teal-900' : 'border-transparent text-slate-500 hover:border-slate-300'}`}><Icon className="h-4 w-4" />{tab.label}<span className="tabular-nums text-[10px] text-slate-400">{count}</span></button>;
      })}
    </nav>
    <p className="border-l-2 border-sky-600 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-950">Les statuts affichés proviennent directement de `salles.statut`. La base ne définit pas d’état « maintenance » distinct.</p>
    <section className="border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-bold text-slate-900">{STATUS_TABS.find((tab) => tab.id === activeStatus)?.label} <span className="ml-1 font-normal text-slate-500">{filtered.length}</span></h2></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Salle</th><th className="px-4 py-3">Capacité</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Affectations actives</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{filtered.map((room) => <tr key={room.id}>
            <td className="px-4 py-3"><p className="font-mono text-xs font-bold text-slate-800">{room.code}</p><p className="mt-1 text-xs text-slate-600">{room.libelle}</p></td>
            <td className="px-4 py-3 tabular-nums">{room.capacite ?? 'Non précisée'}</td>
            <td className="px-4 py-3"><StatusBadge status={room.statut} /></td>
            <td className="px-4 py-3 text-xs text-slate-600">{room.groupCount ? `${room.groupCount} groupe(s) · ${room.activeLearners ?? 'effectif non accessible'}` : 'Aucune affectation active'}</td>
          </tr>)}</tbody>
        </table>
        {!filtered.length && <p className="px-5 py-12 text-center text-sm text-slate-500">Aucune salle dans cet état.</p>}
      </div>
    </section>
  </div>;
}
