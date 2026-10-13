import { useMemo, useState } from 'react';
import { CalendarDays, DoorOpen, Search, UserRound, Users } from 'lucide-react';
import { groupLabel, jourLabel } from './emploisHelpers';
import ScheduleActions from './ScheduleActions';
import { formatShortDate, nextCourseDates } from '../AuditeursInscriptions/affectationHelpers';

/**
 * Planning par groupe : un groupe = un jour de cours, réparti sur plusieurs salles.
 * Chaque salle a son formateur attitré et ses propres auditeurs.
 */
export default function PlanningGroupe({ data, year, canUpdate, canDelete, onEdit, onToggleStatus, onDelete }) {
  const [query, setQuery] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const sessions = useMemo(() => data.sessions.filter((session) => !year || Number(session.id_annee) === Number(year.id)), [data.sessions, year]);
  const groups = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('fr');
    return data.groupes
      .filter((group) => sessions.some((session) => Number(session.id) === Number(group.id_session)))
      .filter((group) => !sessionId || String(group.id_session) === sessionId)
      .filter((group) => !term || groupLabel(group).toLocaleLowerCase('fr').includes(term))
      .sort((a, b) => a.jour_semaine - b.jour_semaine || groupLabel(a).localeCompare(groupLabel(b), 'fr', { numeric: true }));
  }, [data.groupes, query, sessionId, sessions]);

  const selected = groups.find((group) => String(group.id) === selectedId) || groups[0] || null;
  const session = selected ? data.sessions.find((item) => Number(item.id) === Number(selected.id_session)) : null;
  const rooms = selected
    ? data.emplois_du_temps
      .filter((schedule) => Number(schedule.id_groupe) === Number(selected.id))
      .sort((a, b) => String(a.salle_code).localeCompare(String(b.salle_code), 'fr', { numeric: true }))
      .map((schedule) => ({
        ...schedule,
        learners: data.inscriptions
          .filter((item) => Number(item.id_emploi_du_temps) === Number(schedule.id) && item.statut === 'active')
          .sort((a, b) => `${a.auditeur_nom} ${a.auditeur_prenom}`.localeCompare(`${b.auditeur_nom} ${b.auditeur_prenom}`, 'fr')),
      }))
    : [];
  const totalLearners = rooms.reduce((sum, room) => sum + room.learners.length, 0);
  const dates = selected ? nextCourseDates(selected.jour_semaine, session) : [];

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-teal-700">{year?.libelle || 'Toutes les années accessibles'}</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">Planning par groupe</h2>
        <p className="mt-1 text-sm text-slate-600">Un groupe a un jour de cours et occupe une ou plusieurs salles ; chaque salle a son formateur et ses auditeurs.</p>
      </header>
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border border-slate-200 bg-white">
          <div className="space-y-2 border-b border-slate-200 p-3">
            <select aria-label="Session" value={sessionId} onChange={(event) => { setSessionId(event.target.value); setSelectedId(''); }} className="w-full border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="">Toutes les sessions</option>
              {sessions.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.libelle}</option>)}
            </select>
            <label className="relative block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un groupe…" className="w-full border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-700" />
            </label>
          </div>
          <div className="max-h-[560px] overflow-y-auto p-2">
            {groups.map((group) => {
              const count = data.emplois_du_temps.filter((item) => Number(item.id_groupe) === Number(group.id) && Number(item.statut) === 1).length;
              const isSelected = Number(group.id) === Number(selected?.id);
              return (
                <button key={group.id} type="button" onClick={() => setSelectedId(String(group.id))} aria-pressed={isSelected} className={`mb-1 flex w-full items-center gap-3 border p-3 text-left ${isSelected ? 'border-teal-300 bg-teal-50' : 'border-transparent hover:bg-slate-50'}`}>
                  <span className={`rounded-full p-2 ${isSelected ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-500'}`}><Users size={17} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{groupLabel(group)}</span><span className="block text-xs text-slate-500">{jourLabel(group.jour_semaine)}</span></span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-600" title="Salles actives">{count}</span>
                </button>
              );
            })}
            {!groups.length && <p className="p-4 text-center text-sm text-slate-500">Aucun groupe pour cette année.</p>}
          </div>
        </aside>

        <section className="min-w-0 border border-slate-200 bg-white">
          {selected ? (
            <>
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{groupLabel(selected)}</h3>
                  <p className="mt-1 text-sm text-slate-600">{session ? `${session.code} · ${session.libelle}` : 'Session non renseignée'}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-teal-900"><CalendarDays size={15} />Tous les {jourLabel(selected.jour_semaine).toLocaleLowerCase('fr')}s{dates.length ? <span className="font-normal text-slate-600"> · prochaines séances {dates.map(formatShortDate).join(', ')}</span> : null}</p>
                </div>
                <span className="inline-flex items-center gap-2 self-start rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-900"><DoorOpen size={14} />{rooms.length} salle(s) · {totalLearners} auditeur(s)</span>
              </div>
              <div className="grid gap-4 p-4 xl:grid-cols-2">
                {rooms.map((room) => {
                  const capacity = room.salle_capacite == null ? null : Number(room.salle_capacite);
                  const rate = capacity ? Math.min(100, Math.round((room.learners.length / capacity) * 100)) : null;
                  return (
                    <article key={room.id} className={`border p-4 ${Number(room.statut) === 1 ? 'border-slate-200' : 'border-dashed border-slate-300 opacity-70'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-bold text-slate-900"><DoorOpen size={16} className="text-teal-700" />{room.salle_code} · {room.salle_libelle}</p>
                          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><UserRound size={15} className="text-slate-400" />{room.formateur_prenom} {room.formateur_nom}</p>
                        </div>
                        <ScheduleActions schedule={room} canUpdate={canUpdate} canDelete={canDelete} onEdit={onEdit} onToggleStatus={onToggleStatus} onDelete={onDelete} />
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-slate-500"><span>{room.learners.length}{capacity ? ` / ${capacity}` : ''} auditeur(s)</span><span>{Number(room.statut) === 1 ? 'Actif' : 'Inactif'}</span></div>
                        {rate !== null && <div className="mt-1 h-1.5 bg-slate-100"><div className={`h-1.5 ${rate >= 100 ? 'bg-rose-600' : 'bg-teal-600'}`} style={{ width: `${rate}%` }} /></div>}
                      </div>
                      <ul className="mt-3 max-h-56 divide-y divide-slate-100 overflow-y-auto border-t border-slate-100 text-sm">
                        {room.learners.map((learner) => (
                          <li key={learner.id} className="flex justify-between gap-3 py-1.5"><span className="truncate text-slate-800">{learner.auditeur_nom} {learner.auditeur_prenom}</span><span className="shrink-0 font-mono text-xs text-slate-500">{learner.auditeur_matricule}</span></li>
                        ))}
                        {!room.learners.length && <li className="py-3 text-center text-xs text-slate-500">Aucun auditeur actif dans cette salle.</li>}
                      </ul>
                    </article>
                  );
                })}
                {!rooms.length && <div className="p-12 text-center xl:col-span-2"><DoorOpen size={32} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">Aucune salle affectée</p><p className="mt-1 text-xs text-slate-500">Utilisez « Nouvelle affectation » pour attribuer des salles à ce groupe.</p></div>}
              </div>
            </>
          ) : <p className="p-12 text-center text-sm text-slate-500">Aucun groupe disponible.</p>}
        </section>
      </div>
    </div>
  );
}
