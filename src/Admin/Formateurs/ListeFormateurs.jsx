import { useMemo, useState } from 'react';
import { Download, Eye, Search, SquarePen, Trash2, UserX } from 'lucide-react';
import { exportTrainerCsv } from './formateursHelpers';
import { TrainerFilter, TrainerStatus } from './FormateursComponents';

export default function ListeFormateurs({
  trainers, workloads, onEdit, onViewSchedule, onToggleStatus, onDelete,
  canUpdate = false, canDelete = false, canReadSchedule = true,
}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const workloadById = new Map(workloads.map((item) => [item.trainer.id, item]));
  const visible = useMemo(() => trainers.filter((trainer) => {
    const term = search.trim().toLocaleLowerCase('fr');
    return (!term || `${trainer.matricule} ${trainer.nom} ${trainer.prenom} ${trainer.telephone || ''} ${trainer.email || ''}`.toLocaleLowerCase('fr').includes(term))
      && (!status || String(Number(trainer.actif)) === status);
  }).sort((first, second) => `${first.nom} ${first.prenom}`.localeCompare(`${second.nom} ${second.prenom}`, 'fr')), [search, status, trainers]);

  const exportList = () => exportTrainerCsv(visible.map((trainer) => ({
    trainer,
    ...(canReadSchedule ? workloadById.get(trainer.id) : { schedules: null, groups: null }),
  })), 'liste-formateurs');

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 border border-slate-200 bg-white p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-wrap items-end gap-3">
          <label className="relative block w-full sm:max-w-sm">
            <span className="mb-1.5 block text-[11px] font-bold uppercase text-slate-500">Recherche formateur</span>
            <Search className="absolute left-3 top-9 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, prénom, matricule ou téléphone" className="w-full border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-700" />
          </label>
          <TrainerFilter label="Statut" value={status} onChange={setStatus} options={[{ value: '1', label: 'Actif' }, { value: '0', label: 'Inactif' }]} />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={exportList} disabled={!visible.length} className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Download className="h-4 w-4" /> Excel / CSV</button>
          <button type="button" onClick={() => window.print()} className="border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">PDF / imprimer</button>
        </div>
      </section>

      <section className="border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">Comptes formateurs <span className="ml-1 font-normal text-slate-500">{visible.length}</span></h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
              <tr><th className="px-4 py-3">Matricule</th><th className="px-4 py-3">Formateur</th><th className="px-4 py-3">Salle</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Créneaux</th><th className="px-4 py-3">Groupes</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((trainer) => {
                const workload = workloadById.get(trainer.id);
                return (
                  <tr key={trainer.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{trainer.matricule}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{trainer.prenom} {trainer.nom}</p>
                      {trainer.adresse && <p className="mt-1 text-[10px] text-slate-500">{trainer.adresse}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{trainer.salle_code ? `${trainer.salle_code} · ${trainer.salle_libelle || ''}` : 'Non attribuée'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600"><p>{trainer.telephone || 'Téléphone non renseigné'}</p><p className="mt-1">{trainer.email || 'E-mail non renseigné'}</p></td>
                    <td className="px-4 py-3"><TrainerStatus active={Number(trainer.actif) === 1} /></td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{canReadSchedule ? workload?.schedules ?? 0 : '—'}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{canReadSchedule ? workload?.groups ?? 0 : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {canReadSchedule && <button type="button" onClick={() => onViewSchedule(trainer)} title="Voir le planning" aria-label={`Voir le planning de ${trainer.prenom} ${trainer.nom}`} className="p-2 text-slate-500 hover:bg-sky-50 hover:text-sky-800"><Eye className="h-4 w-4" /></button>}
                        {canUpdate && <>
                          <button type="button" onClick={() => onEdit(trainer)} title="Modifier" aria-label="Modifier le formateur" className="p-2 text-slate-500 hover:bg-teal-50 hover:text-teal-800"><SquarePen className="h-4 w-4" /></button>
                          <button type="button" onClick={() => onToggleStatus(trainer)} title={Number(trainer.actif) === 1 ? 'Désactiver' : 'Activer'} aria-label={Number(trainer.actif) === 1 ? 'Désactiver' : 'Activer'} className="p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-800"><UserX className="h-4 w-4" /></button>
                        </>}
                        {canDelete && <button type="button" onClick={() => onDelete(trainer)} title="Supprimer" aria-label={`Supprimer ${trainer.prenom} ${trainer.nom}`} className="p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-800"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!visible.length && <p className="px-5 py-12 text-center text-sm text-slate-500">Aucun formateur ne correspond aux filtres.</p>}
        </div>
      </section>
    </div>
  );
}
