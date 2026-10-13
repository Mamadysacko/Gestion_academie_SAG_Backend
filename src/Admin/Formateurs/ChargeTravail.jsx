import { useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { getWorkloadByTrainer } from './formateursHelpers';
import { TrainerFilter, TrainerMetric, TrainerStatus } from './FormateursComponents';

export default function ChargeTravail({ data, schedules }) {
  const [status, setStatus] = useState('');
  const workloads = useMemo(() => getWorkloadByTrainer(data, schedules)
    .filter((item) => !status || String(Number(item.trainer.actif)) === status)
    .sort((first, second) => second.schedules - first.schedules),
  [data, schedules, status]);
  const totalSchedules = workloads.reduce((sum, item) => sum + item.schedules, 0);
  const totalGroups = workloads.reduce((sum, item) => sum + item.groups, 0);
  const maxSchedules = Math.max(1, ...workloads.map((item) => item.schedules));

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end justify-between gap-3 border border-slate-200 bg-white p-4">
        <div>
          <p className="text-sm font-bold text-slate-900">Affectations hebdomadaires</p>
          <p className="mt-1 text-xs text-slate-500">Le planning enregistre des jours récurrents, sans heures de début ni de fin.</p>
        </div>
        <TrainerFilter label="Statut du compte" value={status} onChange={setStatus} options={[{ value: '1', label: 'Actif' }, { value: '0', label: 'Inactif' }]} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <TrainerMetric label="Créneaux actifs" value={totalSchedules} tone="teal" />
        <TrainerMetric label="Formateurs concernés" value={workloads.filter((item) => item.schedules > 0).length} tone="slate" />
        <TrainerMetric label="Groupes couverts" value={totalGroups} tone="green" />
      </section>

      <section className="border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">Créneaux par formateur</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
              <tr><th className="px-4 py-3">Formateur</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Créneaux hebdomadaires</th><th className="px-4 py-3">Groupes</th><th className="px-4 py-3">Répartition</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workloads.map((item) => (
                <tr key={item.trainer.id}>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-800">{item.trainer.prenom} {item.trainer.nom}</p>
                    <p className="mt-1 font-mono text-[10px] text-slate-500">{item.trainer.matricule}</p>
                  </td>
                  <td className="px-4 py-3"><TrainerStatus active={Number(item.trainer.actif) === 1} /></td>
                  <td className="px-4 py-3 font-bold tabular-nums text-slate-800">{item.schedules}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{item.groups}</td>
                  <td className="w-64 px-4 py-3">
                    <div className="h-2 bg-slate-100">
                      <div className="h-full bg-teal-700" style={{ width: `${Math.round((item.schedules / maxSchedules) * 100)}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!workloads.length && <p className="px-4 py-10 text-center text-sm text-slate-500">Aucun formateur pour ce filtre.</p>}
        </div>
      </section>

      <div className="flex items-start gap-2 border-l-2 border-sky-600 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-900">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
        Les indicateurs portent uniquement sur le nombre de créneaux et de groupes. Aucune durée ni charge horaire n’est déduite.
      </div>
    </div>
  );
}
