import { useMemo, useState } from 'react';
import { CalendarClock, Plus, Search, SquarePen, Trash2, X } from 'lucide-react';
import { WEEKDAYS } from '../Salles/sallesHelpers';
import { TrainerMetric, TrainerStatus } from './FormateursComponents';
import { ChipGroup } from '../../composant/ListPicker';

const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase();

export default function AffectationsFormateur({
  schedules, onNew, onEdit, onDelete,
  canCreate = false, canUpdate = false, canDelete = false,
}) {
  const [query, setQuery] = useState('');
  const [days, setDays] = useState([]);

  const visible = useMemo(() => {
    const term = normalize(query.trim());
    return schedules.filter((schedule) => (
      (!days.length || days.includes(String(schedule.jour_semaine)))
      && (!term || normalize([
        schedule.trainer?.prenom, schedule.trainer?.nom, schedule.trainer?.matricule,
        schedule.group?.code, schedule.group?.libelle, schedule.session?.libelle,
        schedule.room?.code, schedule.room?.libelle, schedule.formationType?.libelle,
      ].join(' ')).includes(term))
    ));
  }, [days, query, schedules]);

  const activeCount = visible.filter((schedule) => Number(schedule.statut) === 1).length;
  const trainersAssigned = new Set(visible.map((schedule) => schedule.id_formateur)).size;
  const groupsCovered = new Set(visible.map((schedule) => schedule.id_groupe)).size;

  const actions = (schedule) => (
    <div className="flex justify-end gap-1">
      {canUpdate && <button type="button" onClick={() => onEdit(schedule)} aria-label="Modifier l’affectation" className="rounded-lg p-2 text-slate-500 hover:bg-teal-50 hover:text-teal-800"><SquarePen className="h-4 w-4" /></button>}
      {canDelete && <button type="button" onClick={() => onDelete(schedule)} aria-label="Supprimer l’affectation" className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>}
    </div>
  );

  return (
    <div className="space-y-4">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-md">
            <span className="sr-only">Rechercher une affectation</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un formateur, un groupe, une salle…"
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-9 text-sm outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold-light/50"
            />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Effacer la recherche" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>}
          </label>
          {canCreate && (
            <button type="button" onClick={onNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-charcoal px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-gold">
              <Plus className="h-4 w-4" /> Nouvelle affectation
            </button>
          )}
        </div>
        <ChipGroup label="Jour" multiple allLabel="Tous" value={days} onChange={setDays} options={WEEKDAYS.map((item) => ({ value: String(item.value), label: item.label }))} />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <TrainerMetric label="Créneaux actifs" value={activeCount} tone="teal" />
        <TrainerMetric label="Formateurs affectés" value={trainersAssigned} tone="slate" />
        <TrainerMetric label="Groupes couverts" value={groupsCovered} tone="green" />
      </section>

      <div className="rounded-r-xl border-l-4 border-brand-gold bg-brand-gold-light/25 px-4 py-3 text-xs leading-5 text-slate-800">
        Un créneau relie un formateur à une salle et à un groupe pour le jour de cours du groupe. Les horaires sont ceux du groupe.
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">Affectations formateur ↔ groupe</h2>
        </div>

        {/* Mobile : cartes */}
        <ul className="divide-y divide-slate-100 md:hidden">
          {visible.map((schedule) => (
            <li key={schedule.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{schedule.trainer?.prenom} {schedule.trainer?.nom}</p>
                  <p className="font-mono text-[10px] text-slate-500">{schedule.trainer?.matricule}</p>
                </div>
                <TrainerStatus active={Number(schedule.statut) === 1} />
              </div>
              <p className="text-xs text-slate-700"><strong>{schedule.group?.libelle}</strong> · {schedule.level?.libelle}</p>
              <p className="text-xs text-slate-500">{schedule.formationType?.libelle || 'Formation'} · {schedule.session?.libelle}</p>
              <p className="text-xs text-slate-600">{schedule.room?.code} · {schedule.room?.libelle} · {schedule.day?.label} · {schedule.activeLearners ?? '—'} inscrit(s)</p>
              {(canUpdate || canDelete) && actions(schedule)}
            </li>
          ))}
        </ul>

        {/* Ordinateur : tableau */}
        <div className="hidden overflow-x-auto md:block">
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
                <tr key={schedule.id} className="hover:bg-slate-50/70">
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
                  <td className="px-4 py-3">{actions(schedule)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && <div className="px-5 py-12 text-center"><CalendarClock className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-700">Aucune affectation ne correspond à ces filtres.</p></div>}
      </section>
    </div>
  );
}
