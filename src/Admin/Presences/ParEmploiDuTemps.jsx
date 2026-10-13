import { ClipboardCheck } from 'lucide-react';
import { PeriodFilters, PresenceFilter, PresenceMetric, PresenceTable } from './PresenceComponents';

export default function ParEmploiDuTemps({
  schedules,
  selectedSchedule,
  onSelectSchedule,
  periodStart,
  periodEnd,
  onPeriodStartChange,
  onPeriodEndChange,
  rows,
  onExport,
  onStatusChange,
  onOpenProfile,
  canEdit,
}) {
  const present = rows.filter((row) => row.statut === 'present').length;
  const absent = rows.filter((row) => row.statut === 'absent').length;
  const schedule = schedules.find((item) => String(item.emploi.id) === selectedSchedule);

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 border border-slate-200 bg-white p-4 lg:flex-row lg:items-end lg:justify-between">
        <PresenceFilter label="Affectation" value={selectedSchedule} onChange={onSelectSchedule} placeholder="Sélectionner un emploi du temps" options={schedules.map((item) => ({ value: String(item.emploi.id), label: `${item.groupe?.code} · ${item.salle?.code} · ${item.formateur?.prenom} ${item.formateur?.nom}` }))} />
        <PeriodFilters start={periodStart} end={periodEnd} onStartChange={onPeriodStartChange} onEndChange={onPeriodEndChange} rows={rows} onExport={() => onExport(rows, `presences-affectation-${selectedSchedule || 'emploi'}`)} />
      </section>
      {schedule ? <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><PresenceMetric label="Pointages" value={rows.length} tone="slate" /><PresenceMetric label="Présences" value={present} tone="green" /><PresenceMetric label="Absents" value={absent} tone="red" /><PresenceMetric label="Effectif inscrit" value={schedule.inscriptionsCount} detail={`${schedule.salle?.capacite ?? '—'} places en salle`} /></section>
        <section className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-bold text-slate-900">Historique lié à l’affectation</h2><p className="mt-1 text-xs text-slate-500">{schedule.groupe?.libelle} · {schedule.session?.libelle} · {schedule.salle?.libelle} · {schedule.formateur?.prenom} {schedule.formateur?.nom}</p></div><PresenceTable rows={rows} onStatusChange={onStatusChange} onOpenProfile={onOpenProfile} canEdit={canEdit} /></section>
      </> : <div className="border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><ClipboardCheck className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">Sélectionnez une affectation pour consulter ses pointages.</p></div>}
    </div>
  );
}