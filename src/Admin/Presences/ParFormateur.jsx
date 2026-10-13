import { GraduationCap } from 'lucide-react';
import { formatRate } from './presenceHelpers';
import { PeriodFilters, PresenceFilter, PresenceMetric, PresenceTable } from './PresenceComponents';

export default function ParFormateur({
  trainers,
  selectedTrainer,
  onSelectTrainer,
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
  const trainer = trainers.find((item) => String(item.id) === selectedTrainer);

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 border border-slate-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
        <PresenceFilter label="Formateur" value={selectedTrainer} onChange={onSelectTrainer} placeholder="Sélectionner un formateur" options={trainers.map((item) => ({ value: String(item.id), label: `${item.matricule} · ${item.prenom} ${item.nom}` }))} />
        <PeriodFilters start={periodStart} end={periodEnd} onStartChange={onPeriodStartChange} onEndChange={onPeriodEndChange} rows={rows} onExport={() => onExport(rows, `presences-formateur-${trainer?.matricule || 'formateur'}`)} />
      </section>
      {trainer ? <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><PresenceMetric label="Pointages" value={rows.length} tone="slate" /><PresenceMetric label="Présences" value={present} tone="green" /><PresenceMetric label="Absents" value={absent} tone="red" /><PresenceMetric label="Taux de présence" value={formatRate(present, rows.length)} /></section>
        <section className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-bold text-slate-900">Pointages de {trainer.prenom} {trainer.nom}</h2><p className="mt-1 text-xs text-slate-500">{trainer.matricule} · {trainer.email || 'E-mail non renseigné'} · {trainer.telephone || 'Téléphone non renseigné'}</p></div><PresenceTable rows={rows} onStatusChange={onStatusChange} onOpenProfile={onOpenProfile} canEdit={canEdit} /></section>
      </> : <div className="border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><GraduationCap className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">Sélectionnez un formateur et une période.</p></div>}
    </div>
  );
}