import { useState } from 'react';
import { CalendarClock, Plus, SquarePen, Trash2 } from 'lucide-react';
import { WEEKDAYS } from '../Salles/sallesHelpers';
import { TrainerFilter, TrainerMetric, TrainerStatus } from './FormateursComponents';

export default function AffectationsFormateur({
  schedules, trainers, groups, onNew, onEdit, onDelete,
  canCreate = false, canUpdate = false, canDelete = false,
}) {
  const [trainerIds, setTrainerIds] = useState([]);
  const [groupIds, setGroupIds] = useState([]);
  const [days, setDays] = useState([]);
  const visible = schedules.filter((schedule) => (
    (!trainerIds.length || trainerIds.includes(String(schedule.id_formateur)))
    && (!groupIds.length || groupIds.includes(String(schedule.id_groupe)))
    && (!days.length || days.includes(String(schedule.jour_semaine)))
  ));
  const activeCount = visible.filter((schedule) => Number(schedule.statut) === 1).length;
  const trainersAssigned = new Set(visible.map((schedule) => schedule.id_formateur)).size;
  const groupsCovered = new Set(visible.map((schedule) => schedule.id_groupe)).size;

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end gap-3 border border-slate-200 bg-white p-4">
        <TrainerFilter multiple label="Formateur" value={trainerIds} onChange={setTrainerIds} options={trainers.map((trainer) => ({ value: String(trainer.id), label: `${trainer.matricule} · ${trainer.prenom} ${trainer.nom}` }))} />
        <TrainerFilter multiple label="Groupe / classe" value={groupIds} onChange={setGroupIds} options={groups.map((group) => ({ value: String(group.id), label: `${group.code} · ${group.libelle}` }))} />
        <TrainerFilter multiple label="Jour" value={days} onChange={setDays} options={WEEKDAYS.map((item) => ({ value: String(item.value), label: item.label }))} />
        {canCreate && <button type="button" onClick={onNew} className="inline-flex items-center gap-2 bg-teal-800 px-3.5 py-2.5 text-xs font-semibold text-white"><Plus className="h-4 w-4" /> Nouvelle affectation</button>}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <TrainerMetric label="Créneaux actifs" value={activeCount} tone="teal" />
        <TrainerMetric label="Formateurs affectés" value={trainersAssigned} tone="slate" />
        <TrainerMetric label="Groupes couverts" value={groupsCovered} tone="green" />
      </section>

      <div className="border-l-2 border-sky-600 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-950">
        Un créneau relie un formateur à une salle et à un groupe pour le jour de cours du groupe. Les horaires sont ceux du groupe.
      </div>

      <section className="border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">Affectations formateur ↔ groupe</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Formateur</th>
                <th className="px-4 py-3">Formation / session</th>
                <th className="px-4 py-3">Groupe / niveau</th>
                <th className="px-4 py-3">Salle</th>
                <th className="px-4 py-3">Jour</th>
                <th className="px-4 py-3">Effectif actif</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((schedule) => (
                <tr key={schedule.id}>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-800">{schedule.trainer?.prenom} {schedule.trainer?.nom}</p>
                    <p className="mt-1 font-mono text-[10px] text-slate-500">{schedule.trainer?.matricule}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-700">{schedule.formationType?.libelle || 'Formation'}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{schedule.session?.libelle}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-700">{schedule.group?.libelle}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{schedule.level?.libelle}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">{schedule.room?.code} · {schedule.room?.libelle}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{schedule.day?.label}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{schedule.activeLearners ?? '—'}</td>
                  <td className="px-4 py-3"><TrainerStatus active={Number(schedule.statut) === 1} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {canUpdate && <button type="button" onClick={() => onEdit(schedule)} aria-label="Modifier l’affectation" className="p-2 text-slate-500 hover:bg-teal-50 hover:text-teal-800"><SquarePen className="h-4 w-4" /></button>}
                      {canDelete && <button type="button" onClick={() => onDelete(schedule)} aria-label="Supprimer l’affectation" className="p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && <div className="px-5 py-12 text-center"><CalendarClock className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-700">Aucune affectation ne correspond à ces filtres.</p></div>}
        </div>
      </section>
    </div>
  );
}
