import { useMemo, useState } from 'react';
import { CalendarDays, Plus, Search, SquarePen, Trash2, X } from 'lucide-react';
import { WEEKDAYS } from './sallesHelpers';
import { RoomMetric } from './SallesComponents';
import { ChipGroup } from '../../composant/ListPicker';
import { getCurrentSchoolYear } from '../../utils/schoolYear';

const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase();
const dayLabel = (value) => WEEKDAYS.find((day) => day.value === Number(value))?.label;

export default function AffectationsSalles({
  assignments, years, rooms = [], onNew, onEdit, onDelete,
  canCreate = false, canUpdate = false, canDelete = false,
}) {
  const [yearId, setYearId] = useState('');
  const selectedYearId = yearId && years.some((year) => String(year.id) === yearId)
    ? yearId
    : String(getCurrentSchoolYear(years)?.id || '');
  const [weekdays, setWeekdays] = useState([]);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const term = normalize(query.trim());
    return assignments
      .filter((assignment) => String(assignment.id_annee) === selectedYearId)
      .filter((assignment) => !weekdays.length || weekdays.includes(String(assignment.jour_semaine)))
      .filter((assignment) => !term || normalize([
        assignment.room?.code, assignment.room?.libelle, assignment.group?.code, assignment.group?.libelle,
        assignment.session?.code, assignment.session?.libelle, assignment.trainer?.prenom, assignment.trainer?.nom,
      ].join(' ')).includes(term))
      .sort((a, b) => a.jour_semaine - b.jour_semaine || a.room?.code.localeCompare(b.room?.code || '') || a.group?.libelle.localeCompare(b.group?.libelle || ''));
  }, [assignments, query, selectedYearId, weekdays]);

  const roomCount = new Set(visible.map((item) => item.id_salle)).size;
  const groupCount = new Set(visible.map((item) => item.id_groupe)).size;
  const activeCount = visible.filter((item) => Number(item.statut) === 1).length;
  const yearLabel = years.find((year) => String(year.id) === selectedYearId)?.libelle;

  const actions = (item) => (
    <div className="flex justify-end gap-1">
      {canUpdate && <button type="button" onClick={() => onEdit(item)} aria-label="Modifier l’affectation" className="rounded-lg p-2 text-slate-500 hover:bg-teal-50 hover:text-teal-800"><SquarePen className="h-4 w-4" /></button>}
      {canDelete && <button type="button" onClick={() => onDelete(item)} aria-label="Supprimer l’affectation" className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>}
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
              placeholder="Rechercher une salle, un groupe, une session, un formateur…"
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
        <div className="grid gap-4 sm:grid-cols-2">
          <ChipGroup label="Année scolaire" required value={selectedYearId} onChange={setYearId} options={years.map((year) => ({ value: String(year.id), label: year.libelle }))} />
          <ChipGroup label="Jour" multiple allLabel="Tous" value={weekdays} onChange={setWeekdays} options={WEEKDAYS.map((day) => ({ value: String(day.value), label: day.label }))} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <RoomMetric label="Créneaux actifs" value={activeCount} tone="teal" />
        <RoomMetric label={`Salles mobilisées sur ${rooms.length}`} value={roomCount} tone="slate" />
        <RoomMetric label="Groupes affectés" value={groupCount} tone="green" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">Affectations hebdomadaires · {yearLabel}</h2>
          <p className="mt-1 text-xs text-slate-500">Un créneau associe un groupe, une salle et un formateur à un jour de la semaine.</p>
        </div>

        {/* Mobile : cartes */}
        <ul className="divide-y divide-slate-100 md:hidden">
          {visible.map((item) => (
            <li key={item.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{item.group?.libelle}</p>
                  <p className="text-xs text-slate-500">{item.session?.code} · {item.session?.libelle}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-gold-light/40 px-2.5 py-1 text-xs font-bold text-brand-bordeaux"><CalendarDays className="h-3.5 w-3.5" />{dayLabel(item.jour_semaine)}</span>
              </div>
              <p className="text-xs text-slate-700"><span className="font-mono font-bold">{item.room?.code}</span> · {item.room?.libelle}{item.room?.capacite ? ` · ${item.room.capacite} places` : ''}</p>
              <p className="text-xs text-slate-600">{item.trainer?.prenom} {item.trainer?.nom} · {item.activeLearners ?? '—'} inscrit(s) · {Number(item.statut) === 1 ? 'Actif' : 'Inactif'}</p>
              {(canUpdate || canDelete) && actions(item)}
            </li>
          ))}
        </ul>

        {/* Ordinateur : tableau */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Jour</th><th className="px-4 py-3">Salle</th><th className="px-4 py-3">Capacité</th><th className="px-4 py-3">Groupe / session</th><th className="px-4 py-3">Formateur</th><th className="px-4 py-3">Effectif actif</th><th className="px-4 py-3">Créneau</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700"><CalendarDays className="h-3.5 w-3.5 text-teal-700" />{dayLabel(item.jour_semaine)}</span></td>
                  <td className="px-4 py-3"><p className="font-mono text-xs font-bold text-slate-800">{item.room?.code}</p><p className="mt-1 text-xs text-slate-500">{item.room?.libelle}</p></td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{item.room?.capacite ?? '—'}</td>
                  <td className="px-4 py-3"><p className="text-xs font-semibold text-slate-800">{item.group?.libelle}</p><p className="mt-1 text-[10px] text-slate-500">{item.session?.code} · {item.session?.libelle}</p></td>
                  <td className="px-4 py-3 text-xs text-slate-700">{item.trainer?.prenom} {item.trainer?.nom}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{item.activeLearners ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{Number(item.statut) === 1 ? 'Actif' : 'Inactif'}</td>
                  <td className="px-4 py-3">{actions(item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && <p className="px-5 py-12 text-center text-sm text-slate-500">Aucun créneau ne correspond à ces filtres.</p>}
      </section>
    </div>
  );
}
