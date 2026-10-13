import { useMemo } from 'react';
import { BarChart3, CalendarDays, DoorOpen, UserRound, Users } from 'lucide-react';
import { JOURS, jourLabel, roomLabel, trainerLabel } from './emploisHelpers';

function Metric({ icon: Icon, label, value, note }) {
  return (
    <article className="border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><Icon size={18} className="text-teal-800" /></div>
      <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </article>
  );
}

export default function Statistiques({ data, year }) {
  const activeSchedules = useMemo(() => data.emplois_du_temps.filter((item) => Number(item.statut) === 1), [data.emplois_du_temps]);
  const activeTrainerIds = new Set(activeSchedules.map((item) => Number(item.id_formateur)));
  const activeRoomIds = new Set(activeSchedules.map((item) => Number(item.id_salle)));
  const totalAvailableRoomDays = data.salles.filter((room) => room.statut === 'disponible').length * JOURS.length;
  const availableRoomIds = new Set(data.salles.filter((room) => room.statut === 'disponible').map((room) => Number(room.id)));
  const occupiedRoomDays = new Set(activeSchedules
    .filter((item) => availableRoomIds.has(Number(item.id_salle)))
    .map((item) => `${item.id_salle}:${item.jour_semaine}`)).size;
  const roomOccupancy = totalAvailableRoomDays ? Math.round((occupiedRoomDays / totalAvailableRoomDays) * 100) : null;
  const dailyCounts = JOURS.map((day) => ({
    ...day,
    count: activeSchedules.filter((item) => Number(item.jour_semaine) === day.id).length,
  }));
  const maximumDayCount = Math.max(1, ...dailyCounts.map((item) => item.count));

  const trainersWorkload = data.formateurs
    .filter((item) => activeTrainerIds.has(Number(item.id)))
    .map((trainer) => ({
      id: trainer.id,
      label: trainerLabel(trainer),
      count: activeSchedules.filter((item) => Number(item.id_formateur) === Number(trainer.id)).length,
    }))
    .sort((a, b) => b.count - a.count);
  const roomsOccupancy = data.salles
    .filter((item) => activeRoomIds.has(Number(item.id)))
    .map((room) => ({
      id: room.id,
      label: roomLabel(room),
      count: activeSchedules.filter((item) => Number(item.id_salle) === Number(room.id)).length,
      days: new Set(activeSchedules.filter((item) => Number(item.id_salle) === Number(room.id)).map((item) => item.jour_semaine)).size,
      capacity: room.capacite,
    }))
    .sort((a, b) => b.days - a.days);

  return (
    <div className="space-y-6">
      <header><p className="text-xs font-bold uppercase tracking-widest text-teal-700">{year?.libelle || 'Toutes les années accessibles'}</p><h2 className="mt-1 text-xl font-bold text-slate-900">Indicateurs de planification</h2><p className="mt-1 text-sm text-slate-600">Indicateurs calculés depuis les affectations et ressources réelles. Le schéma ne contient aucune durée horaire.</p></header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicateurs">
        <Metric icon={CalendarDays} label="Créneaux actifs" value={activeSchedules.length} note="Affectations hebdomadaires actives" />
        <Metric icon={Users} label="Groupes planifiés" value={new Set(activeSchedules.map((item) => Number(item.id_groupe))).size} note="Groupes ayant au moins un créneau actif" />
        <Metric icon={UserRound} label="Formateurs mobilisés" value={activeTrainerIds.size} note={`Sur ${data.formateurs.length} formateur(s) chargé(s)`} />
        <Metric icon={DoorOpen} label="Salles utilisées" value={`${activeRoomIds.size} / ${data.salles.length}`} note={roomOccupancy === null ? 'Aucune salle disponible référencée' : `${roomOccupancy}% des journées-salle disponibles occupées`} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="border border-slate-200 bg-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><BarChart3 size={17} className="text-teal-800" />Répartition des créneaux par jour</h3>
          <p className="mt-1 text-xs text-slate-500">Nombre de groupes planifiés chaque jour de la semaine.</p>
          <div className="mt-5 space-y-4">
            {dailyCounts.map((day) => (
              <div key={day.id}>
                <div className="mb-1 flex justify-between text-xs"><span className="font-medium text-slate-700">{jourLabel(day.id)}</span><span className="tabular-nums text-slate-500">{day.count}</span></div>
                <div className="h-2.5 overflow-hidden bg-slate-100"><div className="h-full bg-teal-700 transition-all" style={{ width: `${(day.count / maximumDayCount) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-900">Charge hebdomadaire des formateurs</h3>
          <p className="mt-1 text-xs text-slate-500">Nombre de créneaux enregistrés par formateur (pas une durée en heures).</p>
          <div className="mt-4 max-h-64 divide-y divide-slate-100 overflow-y-auto">
            {trainersWorkload.map((trainer) => <div key={trainer.id} className="flex items-center justify-between py-3 text-sm"><span className="font-medium text-slate-700">{trainer.label}</span><span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-900">{trainer.count} créneau(x)</span></div>)}
            {!trainersWorkload.length && <p className="py-8 text-center text-sm text-slate-500">Aucun formateur planifié pour cette année.</p>}
          </div>
        </section>

        <section className="border border-slate-200 bg-white p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-900">Occupation des salles</h3>
          <p className="mt-1 text-xs text-slate-500">Le ratio utilise les jours de semaine disponibles, car les heures ne sont pas représentées dans la table emplois_du_temps.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {roomsOccupancy.map((room) => (
              <article key={room.id} className="border border-slate-200 p-4">
                <p className="truncate text-sm font-bold text-slate-800">{room.label}</p>
                <p className="mt-1 text-xs text-slate-500">{room.days}/5 jours occupés · {room.count} affectation(s){room.capacity ? ` · capacité ${room.capacity}` : ''}</p>
                <div className="mt-3 h-2 overflow-hidden bg-slate-100"><div className="h-full bg-indigo-600" style={{ width: `${Math.min(100, (room.days / JOURS.length) * 100)}%` }} /></div>
              </article>
            ))}
            {!roomsOccupancy.length && <p className="py-8 text-sm text-slate-500">Aucune salle utilisée pour cette année.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
