import { Search, Users } from 'lucide-react';
import { PresenceFilter, PresenceMetric, PresenceTable } from './PresenceComponents';

export default function ParGroupe({
  groups,
  selectedGroup,
  onSelectGroup,
  periodControls,
  search,
  onSearch,
  roster,
  rows,
  onStatusChange,
  onOpenProfile,
  onOpenAuditeur,
  canEdit,
}) {
  const present = rows.filter((row) => row.statut === 'present').length;
  const absent = rows.filter((row) => row.statut === 'absent').length;

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 border border-slate-200 bg-white p-4 lg:flex-row lg:items-end lg:justify-between">
        <PresenceFilter label="Groupe" value={selectedGroup} onChange={onSelectGroup} placeholder="Sélectionner un groupe" options={groups.map((group) => ({ value: String(group.id), label: `${group.code} · ${group.libelle}` }))} />
        {periodControls}
        <label className="relative block w-full lg:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Rechercher un auditeur" className="w-full border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-700" /></label>
      </section>
      {selectedGroup ? <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><PresenceMetric label="Auditeurs actifs" value={roster.length} tone="slate" /><PresenceMetric label="Pointages" value={rows.length} /><PresenceMetric label="Présences" value={present} tone="green" /><PresenceMetric label="Absents" value={absent} tone="red" /></section>
        <section className="border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-bold text-slate-900">Feuille de groupe · synthèse par auditeur</h2><p className="mt-1 text-xs text-slate-500">Les taux sont calculés sur les pointages présents dans la période choisie.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Auditeur</th><th className="px-4 py-3">Matricule</th><th className="px-4 py-3">Séances</th><th className="px-4 py-3">Présent</th><th className="px-4 py-3">Absent</th><th className="px-4 py-3">Permissionnaire</th><th className="px-4 py-3">Malade</th><th className="px-4 py-3">Congé</th><th className="px-4 py-3">Taux</th><th className="px-4 py-3" /></tr></thead>
            <tbody className="divide-y divide-slate-100">{roster.map((item) => <tr key={item.inscription.id}><td className="px-4 py-3 font-semibold text-slate-800">{item.person?.prenom} {item.person?.nom}</td><td className="px-4 py-3 font-mono text-xs text-slate-600">{item.person?.matricule}</td><td className="px-4 py-3 tabular-nums">{item.history.length}</td><td className="px-4 py-3 text-emerald-700">{item.present}</td><td className="px-4 py-3 text-rose-700">{item.absent}</td><td className="px-4 py-3">{item.permissionnaire}</td><td className="px-4 py-3">{item.malade}</td><td className="px-4 py-3">{item.conge}</td><td className="px-4 py-3 font-bold">{item.rate}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => onOpenAuditeur(item.person.id)} className="text-xs font-semibold text-teal-800 hover:text-teal-950">Historique</button></td></tr>)}</tbody>
          </table></div>
        </section>
        <section className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-bold text-slate-900">Tous les pointages du groupe</h2></div><PresenceTable rows={rows} onStatusChange={onStatusChange} onOpenProfile={onOpenProfile} canEdit={canEdit} /></section>
      </> : <div className="border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><Users className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">Sélectionnez un groupe pour afficher sa feuille de présence.</p></div>}
    </div>
  );
}