import { STATUS_LABELS, STATUS_OPTIONS, formatRate } from './presenceHelpers';
import { PeriodFilters, PresenceMetric, PresenceTable } from './PresenceComponents';

export default function Statistiques({
  periodStart,
  periodEnd,
  onPeriodStartChange,
  onPeriodEndChange,
  rows,
  summary,
  groupStatistics,
  onExport,
  onStatusChange,
  onOpenProfile,
  canEdit,
}) {
  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 border border-slate-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-bold text-slate-900">Indicateurs d’assiduité</p><p className="mt-1 text-xs text-slate-500">Calculés sur les pointages enregistrés dans la période choisie.</p></div><PeriodFilters start={periodStart} end={periodEnd} onStartChange={onPeriodStartChange} onEndChange={onPeriodEndChange} rows={rows} onExport={() => onExport(rows, `presences-${periodStart}-${periodEnd}`)} /></section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><PresenceMetric label="Pointages enregistrés" value={summary.total} tone="slate" /><PresenceMetric label="Taux de présence" value={summary.rate} /><PresenceMetric label="Présents" value={summary.present} tone="green" /><PresenceMetric label="Absents" value={summary.absent} tone="red" /><PresenceMetric label="Permissionnaires / malades / congés" value={summary.permissionnaire + summary.malade + summary.conge} tone="amber" /></section>
      <section className="grid gap-4 xl:grid-cols-2">
        <div className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-bold text-slate-900">Taux par groupe</h2></div><div className="space-y-4 p-4">{groupStatistics.length ? groupStatistics.map((item) => <div key={item.groupe.id}><div className="mb-1.5 flex justify-between gap-4 text-xs"><span className="truncate font-semibold text-slate-700">{item.groupe.libelle}</span><span className="shrink-0 tabular-nums text-slate-500">{item.rate} % · {item.rows} pointages</span></div><div className="h-2 bg-slate-100"><div className="h-full bg-teal-700" style={{ width: `${item.rate}%` }} /></div></div>) : <p className="py-8 text-center text-sm text-slate-500">Aucun pointage sur cette période.</p>}</div></div>
        <div className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-bold text-slate-900">Répartition des statuts</h2></div><div className="divide-y divide-slate-100">{STATUS_OPTIONS.map((status) => { const count = rows.filter((row) => row.statut === status.value).length; return <div key={status.value} className="flex items-center justify-between px-4 py-3 text-sm"><span className="text-slate-700">{STATUS_LABELS[status.value]}</span><span className="font-bold tabular-nums text-slate-900">{count}<span className="ml-2 text-xs font-normal text-slate-400">{formatRate(count, summary.total)}</span></span></div>; })}</div></div>
      </section>
      <section className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-bold text-slate-900">Détail des pointages de la période</h2></div><PresenceTable rows={rows} onStatusChange={onStatusChange} onOpenProfile={onOpenProfile} canEdit={canEdit} /></section>
    </div>
  );
}