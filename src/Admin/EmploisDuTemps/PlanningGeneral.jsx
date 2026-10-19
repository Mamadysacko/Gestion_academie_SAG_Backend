import { useMemo, useState } from 'react';
import { CalendarDays, Download, Search, MapPin, UserRound, Users } from 'lucide-react';
import { JOURS, jourLabel } from './emploisHelpers';
import ScheduleActions from './ScheduleActions';
import { exportTable } from '../../utils/exportExcel';

export default function PlanningGeneral({
  data, year, canUpdate, canDelete, onEdit, onToggleStatus, onDelete,
}) {
  const [query, setQuery] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  const schedules = useMemo(() => data.emplois_du_temps
    .filter((item) => statusFilter === 'all' || Number(item.statut) === Number(statusFilter === 'active'))
    .filter((item) => !dayFilter || Number(item.jour_semaine) === Number(dayFilter))
    .filter((item) => {
      const searchable = [
        item.groupe_code, item.groupe_libelle, item.session_code, item.session_libelle,
        item.formateur_nom, item.formateur_prenom, item.salle_code, item.salle_libelle,
      ].join(' ').toLocaleLowerCase('fr');
      return searchable.includes(query.trim().toLocaleLowerCase('fr'));
    })
    .slice()
    .sort((a, b) => a.jour_semaine - b.jour_semaine || String(a.groupe_code).localeCompare(String(b.groupe_code), 'fr')),
  [data.emplois_du_temps, dayFilter, query, statusFilter]);

  const exportCsv = () => {
    const headers = ['Année scolaire', 'Jour', 'Groupe', 'Session', 'Formateur', 'Salle', 'Inscrits actifs', 'Statut'];
    const lines = schedules.map((item) => [
      item.annee_libelle || year?.libelle || '',
      jourLabel(item.jour_semaine),
      `${item.groupe_code || ''} ${item.groupe_libelle || ''}`.trim(),
      `${item.session_code || ''} ${item.session_libelle || ''}`.trim(),
      `${item.formateur_prenom || ''} ${item.formateur_nom || ''}`.trim(),
      `${item.salle_code || ''} ${item.salle_libelle || ''}`.trim(),
      item.inscrits_actifs ?? 0,
      Number(item.statut) === 1 ? 'Actif' : 'Inactif',
    ]);
    exportTable({
      filename: `emplois-du-temps-${year?.libelle || 'academie'}`,
      title: 'Emplois du temps hebdomadaires',
      subtitle: year?.libelle ? `Année scolaire ${year.libelle}` : undefined,
      headings: headers,
      rows: lines,
    });
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">{year?.libelle || 'Toutes les années accessibles'}</p><h2 className="mt-1 text-xl font-bold text-slate-900">Planning hebdomadaire</h2><p className="mt-1 text-sm text-slate-600">Les créneaux sont affichés par jour, avec les relations réelles aux groupes, formateurs, salles et sessions.</p></div>
        <button type="button" onClick={exportCsv} disabled={!schedules.length} className="inline-flex items-center justify-center gap-2 border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Download size={16} />Exporter CSV</button>
      </header>

      <div className="grid gap-3 sm:grid-cols-[minmax(200px,1fr)_190px_160px]">
        <label className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher groupe, formateur, salle…" className="w-full border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-700" /></label>
        <select value={dayFilter} onChange={(event) => setDayFilter(event.target.value)} aria-label="Filtrer par jour" className="border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">Tous les jours</option>{JOURS.map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}</select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrer par statut" className="border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="active">Créneaux actifs</option><option value="0">Inactifs</option><option value="all">Tous les statuts</option></select>
      </div>

      <div className="border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3"><h3 className="text-sm font-bold text-slate-800">Affectations</h3><span className="text-xs text-slate-500">{schedules.length} résultat(s)</span></div>
        {schedules.length ? (
          <div className="divide-y divide-slate-100">
            {schedules.map((item) => (
              <article key={item.id} className="grid gap-3 p-4 lg:grid-cols-[110px_minmax(0,1fr)_150px] lg:items-center">
                <div><span className="inline-flex rounded-md bg-teal-50 px-2.5 py-1.5 text-sm font-bold text-teal-900">{jourLabel(item.jour_semaine)}</span><p className="mt-1 text-xs text-slate-500">{item.annee_libelle || year?.libelle || '—'}</p></div>
                <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{item.groupe_code} · {item.groupe_libelle}</p><p className="truncate text-xs text-slate-500">{item.session_code} · {item.session_libelle}</p></div>
                  <div className="space-y-1 text-xs text-slate-600">
                    <p className="flex items-center gap-2"><UserRound size={14} className="shrink-0 text-slate-400" />{item.formateur_prenom} {item.formateur_nom}{item.formateur_matricule ? ` · ${item.formateur_matricule}` : ''}</p>
                    <p className="flex items-center gap-2"><MapPin size={14} className="shrink-0 text-slate-400" />{item.salle_code} · {item.salle_libelle}{item.salle_capacite ? ` · ${item.salle_capacite} places` : ''}</p>
                    <p className="flex items-center gap-2"><Users size={14} className="shrink-0 text-slate-400" />{item.inscrits_actifs ?? 0} inscription(s) active(s)</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 lg:justify-end">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${Number(item.statut) === 1 ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{Number(item.statut) === 1 ? 'Actif' : 'Inactif'}</span>
                  <ScheduleActions schedule={item} canUpdate={canUpdate} canDelete={canDelete} onEdit={onEdit} onToggleStatus={onToggleStatus} onDelete={onDelete} />
                </div>
              </article>
            ))}
          </div>
        ) : <div className="p-12 text-center"><CalendarDays size={34} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">Aucune affectation trouvée</p><p className="mt-1 text-xs text-slate-500">Modifiez les filtres ou créez un créneau pour cette année scolaire.</p></div>}
      </div>
    </div>
  );
}
