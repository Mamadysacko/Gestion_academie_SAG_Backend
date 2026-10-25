import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CalendarCheck, CalendarClock, CalendarDays, CalendarX, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, DoorOpen, Gauge, Layers, Loader2, MoveRight, UserRound, Users, X,
} from 'lucide-react';
import TagSelect from '../../composant/TagSelect';
import ModalOverlay from '../../composant/ModalOverlay';
import { emploisApi, planificationApi } from '../../config/apiService';
import { useLiveRefresh } from '../../composant/useLiveRefresh';
import { useConfirm } from '../../composant/confirmContext';
import { JOURS, jourLabel, passagesLabel, trainerForRoom } from './emploisHelpers';
import {
  addDays, buildColorScale, isoWeekday, layoutColumns, longDate, minutes, mondayOf, parseIso, sessionsOn,
  shortDate, shortTime, toIso,
} from './calendarModel';

const MODES = [
  { id: 'jour', label: 'Jour' },
  { id: 'semaine', label: 'Semaine' },
  { id: 'mois', label: 'Mois' },
  { id: 'salles', label: 'Occupation des salles' },
];
const HOUR_PX = 52;

/**
 * Calendrier des emplois du temps.
 * Chaque créneau hebdomadaire (groupe × salle × jour) est projeté sur les dates réelles de sa session ;
 * les salles d'un même groupe au même horaire forment une seule séance. Les indicateurs, conflits et
 * l'occupation des salles viennent de l'API (/planification/synthese), recalculés après chaque modification.
 */
export default function Calendrier({ data, year, isTrainer = false, canUpdate = false, onChanged }) {
  const confirm = useConfirm();
  const [mode, setMode] = useState('semaine');
  const [cursor, setCursor] = useState(toIso(new Date()));
  const [filters, setFilters] = useState({ formation: '', session: '', group: '', room: '', trainer: '' });
  const [colorMode, setColorMode] = useState('formation');
  const [openSeance, setOpenSeance] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState('');
  const [alternatives, setAlternatives] = useState(null);

  const today = toIso(new Date());
  const loadSummary = useCallback(() => {
    if (isTrainer) return Promise.resolve();
    return planificationApi.synthese({ id_annee: year?.id, id_session: filters.session, date: today })
      .then((response) => { setSummary(response.data); setSummaryError(''); })
      .catch((error) => setSummaryError(error.message || 'Indicateurs indisponibles.'));
  }, [filters.session, isTrainer, today, year?.id]);
  useEffect(() => { loadSummary(); }, [loadSummary]);
  useLiveRefresh(loadSummary, { intervalMs: 0, enabled: !isTrainer });

  const active = useMemo(() => data.emplois_du_temps.filter((slot) => Number(slot.statut) === 1), [data.emplois_du_temps]);
  const slots = useMemo(() => active.filter((slot) => (!filters.formation || String(slot.id_type_formation) === filters.formation)
    && (!filters.session || String(slot.id_session) === filters.session)
    && (!filters.group || String(slot.id_groupe) === filters.group)
    && (!filters.room || String(slot.id_salle) === filters.room)
    && (!filters.trainer || String(slot.id_formateur) === filters.trainer)), [active, filters]);
  // L'échelle de couleurs est calculée sur TOUS les créneaux : un filtre ne repeint jamais les autres.
  const scale = useMemo(() => buildColorScale(active, colorMode), [active, colorMode]);

  const conflicts = useMemo(() => (summary?.conflits || []), [summary]);
  const conflictIds = useMemo(() => new Set(conflicts.filter((c) => c.gravite === 'erreur').flatMap((c) => c.ids || [])), [conflicts]);
  const seanceHasConflict = (seance) => seance.rows.some((row) => conflictIds.has(Number(row.id)));

  const setFilter = (key, value) => setFilters((current) => ({
    ...current, [key]: value,
    ...(key === 'formation' ? { session: '', group: '' } : {}),
    ...(key === 'session' ? { group: '' } : {}),
  }));

  const step = mode === 'jour' ? 1 : 7;
  const move = (direction) => {
    if (mode === 'mois') {
      const date = parseIso(cursor);
      date.setDate(1);
      date.setMonth(date.getMonth() + direction);
      setCursor(toIso(date));
    } else {
      setCursor(addDays(cursor, step * direction));
    }
  };
  const weekStart = mondayOf(cursor);
  const weekDays = JOURS.map((day, index) => ({ ...day, iso: addDays(weekStart, index) }));
  const title = mode === 'jour' ? longDate(cursor)
    : mode === 'mois' ? parseIso(cursor).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      : `Semaine du ${shortDate(weekStart)} au ${shortDate(addDays(weekStart, 4))}`;

  // Plage horaire affichée : ajustée aux séances, au moins 07:00–18:00.
  const [dayStart, dayEnd] = useMemo(() => {
    let start = 7 * 60;
    let end = 18 * 60;
    slots.forEach((slot) => { start = Math.min(start, minutes(slot.heure_debut)); end = Math.max(end, minutes(slot.heure_fin)); });
    return [Math.floor(start / 60) * 60, Math.ceil(end / 60) * 60];
  }, [slots]);
  const hours = Array.from({ length: (dayEnd - dayStart) / 60 }, (_, index) => dayStart / 60 + index);

  const rooms = useMemo(() => data.salles
    .filter((room) => !filters.room || String(room.id) === filters.room)
    .slice()
    .sort((a, b) => String(a.code).localeCompare(String(b.code), 'fr', { numeric: true })), [data.salles, filters.room]);

  const sessionOptions = data.sessions.filter((item) => !filters.formation || String(item.id_type_formation) === filters.formation);
  const groupOptions = data.groupes.filter((item) => (!filters.session || String(item.id_session) === filters.session)
    && (!filters.formation || sessionOptions.some((session) => Number(session.id) === Number(item.id_session))));

  const learnersOf = (row) => data.inscriptions
    .filter((item) => item.statut === 'active' && Number(item.id_groupe) === Number(row.id_groupe) && Number(item.id_salle) === Number(row.id_salle))
    .sort((a, b) => `${a.auditeur_nom}`.localeCompare(`${b.auditeur_nom}`, 'fr'));

  const showAlternatives = async (conflict) => {
    const rowId = conflict.ids?.[0];
    setAlternatives({ loading: true, conflict });
    try {
      const response = await planificationApi.alternatives(rowId ? { id_emploi_du_temps: rowId } : { id_groupe: conflict.id_groupe });
      setAlternatives({ loading: false, conflict, rowId, data: response.data });
    } catch (error) {
      setAlternatives({ loading: false, conflict, error: error.message });
    }
  };

  const applyMove = async (row, change, label) => {
    if (!(await confirm({ title: 'Déplacer ce créneau ?', message: `${row.groupe_code} · ${row.salle_code} (${jourLabel(row.jour_semaine)})\n→ ${label}\nLes disponibilités sont revérifiées à l’enregistrement.`, tone: 'warning' }))) return false;
    const roomId = change.id_salle ?? row.id_salle;
    // Un formateur reste dans sa salle : changer de salle, c'est aussi changer de formateur (le titulaire).
    const trainerId = change.id_formateur
      ?? (Number(roomId) !== Number(row.id_salle) ? trainerForRoom(roomId, data.formateurs)?.id : row.id_formateur);
    await emploisApi.update(row.id, {
      id_annee: row.id_annee, id_groupe: row.id_groupe, id_salle: roomId,
      id_formateur: trainerId ?? row.id_formateur, jour_semaine: change.jour_semaine ?? row.jour_semaine, statut: 1,
    });
    await Promise.all([onChanged?.(), loadSummary()]);
    return true;
  };

  const totals = summary?.totaux;
  const visibleConflicts = conflicts.filter((item) => !filters.session || (item.sessions || []).includes(Number(filters.session)));

  return (
    <div className="space-y-4">
      {!isTrainer && (
        <section aria-label="Indicateurs du calendrier" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Kpi icon={CalendarDays} label="Séances programmées" value={totals?.seances_programmees} hint="sur toute la période des sessions" />
          <Kpi icon={CalendarCheck} label="Réalisées" value={totals?.seances_realisees} hint="jusqu’à hier" />
          <Kpi icon={CalendarClock} label="Restantes" value={totals?.seances_restantes} hint="à partir d’aujourd’hui" />
          <Kpi icon={Layers} label="Passages planifiés" value={totals ? `${totals.passages_planifies} / ${totals.passages_requis}` : null} hint={totals?.seances_manquantes ? `${totals.seances_manquantes} séance(s) manquante(s)` : 'groupes × passages par semaine'} />
          <Kpi icon={Gauge} label="Occupation des salles" value={summary ? `${summary.occupation.taux_occupation} %` : null} hint={summary ? `${summary.occupation.cellules_occupees} jour-salle sur ${summary.occupation.cellules_disponibles}` : ''} />
          <Kpi icon={totals?.conflits ? CalendarX : CheckCircle2} label="Conflits" value={totals?.conflits} hint={totals?.avertissements ? `${totals.avertissements} avertissement(s)` : 'aucun avertissement'} status={totals?.conflits ? 'critical' : 'good'} />
        </section>
      )}
      {summaryError && <p role="alert" className="border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">{summaryError}</p>}

      <section className="space-y-3 border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex border border-slate-300" role="tablist" aria-label="Vue du calendrier">{MODES.filter((item) => !isTrainer || item.id !== 'salles').map((item) => <button key={item.id} type="button" role="tab" aria-selected={mode === item.id} onClick={() => setMode(item.id)} className={`px-3 py-2 text-xs font-semibold ${mode === item.id ? 'bg-teal-800 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>{item.label}</button>)}</div>
            {mode !== 'salles' && <>
              <button type="button" onClick={() => move(-1)} aria-label="Période précédente" className="border border-slate-300 bg-white p-2 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => setCursor(today)} className="border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50">Aujourd’hui</button>
              <button type="button" onClick={() => move(1)} aria-label="Période suivante" className="border border-slate-300 bg-white p-2 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
              <h2 className={`ml-1 text-base font-bold text-slate-900 ${mode === 'semaine' ? '' : 'first-letter:uppercase'}`}>{title}</h2>
            </>}
            {mode === 'salles' && <h2 className="ml-1 text-base font-bold text-slate-900">Semaine type · salles × jours</h2>}
          </div>
          <div className="inline-flex items-center gap-2 text-xs text-slate-600">
            <span>Couleurs par</span>
            <div className="inline-flex border border-slate-300">{[['formation', 'formation'], ['groupe', 'groupe']].map(([id, label]) => <button key={id} type="button" aria-pressed={colorMode === id} onClick={() => setColorMode(id)} className={`px-2.5 py-1.5 font-semibold ${colorMode === id ? 'bg-slate-800 text-white' : 'bg-white hover:bg-slate-50'}`}>{label}</button>)}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select label="Formation" value={filters.formation} onChange={(value) => setFilter('formation', value)} options={data.types_formations.map((item) => ({ value: item.id, label: item.libelle }))} />
          <Select label="Session" value={filters.session} onChange={(value) => setFilter('session', value)} options={sessionOptions.map((item) => ({ value: item.id, label: `${item.code} · ${item.libelle}` }))} />
          <Select label="Groupe" value={filters.group} onChange={(value) => setFilter('group', value)} options={groupOptions.map((item) => ({ value: item.id, label: `${item.code} · ${passagesLabel(item)}` }))} />
          <Select label="Salle" value={filters.room} onChange={(value) => setFilter('room', value)} options={data.salles.map((item) => ({ value: item.id, label: `${item.code} · ${item.libelle}` }))} />
          {!isTrainer && <Select label="Formateur" value={filters.trainer} onChange={(value) => setFilter('trainer', value)} options={data.formateurs.map((item) => ({ value: item.id, label: `${item.prenom} ${item.nom}` }))} />}
          {Object.values(filters).some(Boolean) && <button type="button" onClick={() => setFilters({ formation: '', session: '', group: '', room: '', trainer: '' })} className="self-end border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Réinitialiser</button>}
        </div>
        <Legend items={scale.legend} />
      </section>

      {!isTrainer && visibleConflicts.length > 0 && (
        <details className={`border p-4 text-sm ${visibleConflicts.some((c) => c.gravite === 'erreur') ? 'border-rose-200 bg-rose-50 text-rose-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`} open={visibleConflicts.some((c) => c.gravite === 'erreur')}>
          <summary className="flex cursor-pointer items-center gap-2 font-bold"><AlertTriangle className={`h-4 w-4 ${visibleConflicts.some((c) => c.gravite === 'erreur') ? 'text-rose-700' : 'text-amber-700'}`} />{visibleConflicts.filter((c) => c.gravite === 'erreur').length} conflit(s) et {visibleConflicts.filter((c) => c.gravite !== 'erreur').length} avertissement(s)</summary>
          <ul className="mt-2 space-y-1.5 text-xs">
            {visibleConflicts.map((item, index) => (
              <li key={index} className="flex flex-wrap items-center gap-2">
                <span className={`border px-1.5 py-0.5 text-[10px] font-bold uppercase ${item.gravite === 'erreur' ? 'border-rose-300 bg-white text-rose-800' : 'border-amber-300 bg-white text-amber-800'}`}>{item.gravite === 'erreur' ? 'Conflit' : 'À compléter'}</span>
                <span className="flex-1">{item.message}</span>
                {canUpdate && (item.ids?.length > 0 || item.id_groupe) && <button type="button" onClick={() => showAlternatives(item)} className="border border-rose-300 bg-white px-2 py-1 font-semibold text-slate-800 hover:bg-rose-100">Créneaux alternatifs</button>}
              </li>
            ))}
          </ul>
        </details>
      )}

      {mode === 'semaine' && (
        <section className="overflow-x-auto border border-slate-200 bg-white" aria-label="Semaine">
          <div className="grid min-w-[860px]" style={{ gridTemplateColumns: '56px repeat(5, minmax(0, 1fr))' }}>
            <div className="border-b border-slate-200 bg-slate-50" />
            {weekDays.map((day) => {
              const count = sessionsOn(slots, day.iso).length;
              return (
                <button key={day.iso} type="button" onClick={() => { setCursor(day.iso); setMode('jour'); }} className={`border-b border-l border-slate-200 px-3 py-2 text-left hover:bg-teal-50/60 ${day.iso === today ? 'bg-teal-50' : 'bg-slate-50'}`}>
                  <span className="block text-xs font-bold uppercase text-slate-800">{day.label} <span className="font-semibold text-slate-500">{shortDate(day.iso)}</span></span>
                  <span className="text-[11px] text-slate-500">{count} séance(s)</span>
                </button>
              );
            })}
            <div className="relative" style={{ height: hours.length * HOUR_PX }}>
              {hours.map((hour, index) => <span key={hour} className="absolute right-2 -translate-y-1/2 text-[10px] text-slate-500" style={{ top: index * HOUR_PX }}>{String(hour).padStart(2, '0')}:00</span>)}
            </div>
            {weekDays.map((day) => (
              <div key={day.iso} className="relative border-l border-slate-200" style={{ height: hours.length * HOUR_PX }}>
                {hours.map((hour, index) => <div key={hour} className="absolute inset-x-0 border-t border-slate-100" style={{ top: index * HOUR_PX }} />)}
                {layoutColumns(sessionsOn(slots, day.iso)).map((seance) => {
                  const top = ((minutes(seance.heure_debut) - dayStart) / 60) * HOUR_PX;
                  const height = Math.max(28, ((minutes(seance.heure_fin) - minutes(seance.heure_debut)) / 60) * HOUR_PX - 2);
                  return (
                    <div key={seance.key} className="absolute px-0.5" style={{ top, height, left: `${(seance.column / seance.columns) * 100}%`, width: `${100 / seance.columns}%` }}>
                      <SeanceCard seance={seance} color={scale.colorOf(seance.sample)} conflict={seanceHasConflict(seance)} onOpen={() => setOpenSeance(seance)} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      )}

      {mode === 'jour' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="overflow-x-auto border border-slate-200 bg-white" aria-label="Journée par salle">
            {isoWeekday(cursor) > 5 ? <Empty text="Week-end : aucun cours." /> : (
              <div className="min-w-[720px]">
                <div className="grid border-b border-slate-200 bg-slate-50 text-[10px] text-slate-500" style={{ gridTemplateColumns: `140px repeat(${hours.length}, minmax(0, 1fr))` }}>
                  <span className="px-2 py-1.5 font-bold uppercase text-slate-600">Salle</span>
                  {hours.map((hour) => <span key={hour} className="border-l border-slate-200 px-1 py-1.5">{String(hour).padStart(2, '0')}:00</span>)}
                </div>
                {rooms.map((room) => {
                  const roomSlots = slots.filter((slot) => Number(slot.id_salle) === Number(room.id));
                  const seances = sessionsOn(roomSlots, cursor);
                  return (
                    <div key={room.id} className="grid border-b border-slate-100" style={{ gridTemplateColumns: '140px minmax(0, 1fr)' }}>
                      <div className="px-2 py-2 text-xs"><span className="font-bold text-slate-800">{room.code}</span><span className="block truncate text-slate-500">{room.statut !== 'disponible' ? 'Indisponible' : seances.length ? `${seances.length} séance(s)` : 'Libre'}</span></div>
                      <div className={`relative h-12 border-l border-slate-200 ${room.statut !== 'disponible' ? 'bg-slate-100' : ''}`}>
                        {seances.map((seance) => {
                          const left = ((minutes(seance.heure_debut) - dayStart) / (dayEnd - dayStart)) * 100;
                          const width = ((minutes(seance.heure_fin) - minutes(seance.heure_debut)) / (dayEnd - dayStart)) * 100;
                          return <div key={seance.key} className="absolute inset-y-1 px-px" style={{ left: `${left}%`, width: `${width}%` }}><SeanceCard compact seance={seance} color={scale.colorOf(seance.sample)} conflict={seanceHasConflict(seance)} onOpen={() => setOpenSeance(sessionsOn(slots, cursor).find((item) => item.id_groupe === seance.id_groupe && item.heure_debut === seance.heure_debut) || seance)} /></div>;
                        })}
                      </div>
                    </div>
                  );
                })}
                {!rooms.length && <Empty text="Aucune salle avec ces filtres." />}
              </div>
            )}
          </section>
          <aside className="space-y-3 border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-slate-900">Séances du jour</h3>
            <ul className="space-y-1.5 text-xs">{sessionsOn(slots, cursor).map((seance) => <li key={seance.key}><button type="button" onClick={() => setOpenSeance(seance)} className="flex w-full items-center gap-2 text-left hover:underline"><Dot color={scale.colorOf(seance.sample)} /><span className="font-semibold text-slate-800">{shortTime(seance.heure_debut)}–{shortTime(seance.heure_fin)}</span><span className="truncate text-slate-600">{seance.session_code} · {seance.groupe_code} · {seance.rows.length} salle(s)</span></button></li>)}</ul>
            {!sessionsOn(slots, cursor).length && <p className="text-xs text-slate-500">Aucune séance ce jour avec ces filtres.</p>}
            {!isTrainer && isoWeekday(cursor) <= 5 && <>
              <h3 className="border-t border-slate-100 pt-3 text-sm font-bold text-slate-900">Salles libres toute la journée</h3>
              <FreeRooms rooms={data.salles} slots={active} iso={cursor} />
            </>}
          </aside>
        </div>
      )}

      {mode === 'mois' && <MonthView cursor={cursor} slots={slots} today={today} colorOf={scale.colorOf} hasConflict={seanceHasConflict} onPick={(iso) => { setCursor(iso); setMode('jour'); }} />}

      {mode === 'salles' && <OccupationView occupation={summary?.occupation} filters={filters} colorOf={scale.colorOf} conflictIds={conflictIds} />}

      {openSeance && (
        <SeanceDialog
          seance={openSeance}
          color={scale.colorOf(openSeance.sample)}
          conflicts={conflicts}
          learnersOf={learnersOf}
          rooms={data.salles}
          canUpdate={canUpdate && !isTrainer}
          onMove={async (row, change, label) => { if (await applyMove(row, change, label)) setOpenSeance(null); }}
          onClose={() => setOpenSeance(null)}
        />
      )}

      {alternatives && (
        <ModalOverlay onClose={() => setAlternatives(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="alt-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto border border-slate-200 bg-white p-5 shadow-2xl">
            <header className="flex items-start justify-between gap-3"><div><h2 id="alt-title" className="text-base font-bold text-slate-900">Créneaux alternatifs</h2><p className="mt-1 text-xs text-slate-600">{alternatives.conflict.message}</p></div><button type="button" onClick={() => setAlternatives(null)} aria-label="Fermer"><X size={18} /></button></header>
            {alternatives.loading && <p className="mt-4 flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Recherche des disponibilités…</p>}
            {alternatives.error && <p role="alert" className="mt-4 text-sm text-rose-700">{alternatives.error}</p>}
            {alternatives.data && <AlternativesList data={alternatives.data} row={active.find((slot) => Number(slot.id) === Number(alternatives.rowId))} onPick={async (row, change, label) => { try { if (await applyMove(row, change, label)) setAlternatives(null); } catch (error) { setAlternatives((current) => ({ ...current, error: error.message })); } }} />}
          </section>
        </ModalOverlay>
      )}
    </div>
  );
}

/* ── Composants ──────────────────────────────────────────────────────────── */

function Kpi({ icon: Icon, label, value, hint, status }) {
  const tone = status === 'critical' ? 'text-rose-700' : status === 'good' ? 'text-emerald-700' : 'text-teal-800';
  return (
    <div className="border border-slate-200 bg-white p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><Icon className={`h-3.5 w-3.5 ${tone}`} aria-hidden="true" />{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value ?? '—'}</p>
      {hint && <p className="truncate text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function Dot({ color }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />;
}

function Legend({ items }) {
  if (!items.length) return null;
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-xs text-slate-700" aria-label="Légende">
      {items.map((item) => <li key={item.key} className="inline-flex items-center gap-1.5"><Dot color={item.color} />{item.label}</li>)}
      <li className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 border-2 border-rose-600 bg-rose-50" aria-hidden="true" />Conflit</li>
      <li className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 border border-dashed border-slate-400" aria-hidden="true" />Salle libre</li>
    </ul>
  );
}

function SeanceCard({ seance, color, conflict, onOpen, compact = false }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${seance.session_code} · ${seance.groupe_code} — ${shortTime(seance.heure_debut)}–${shortTime(seance.heure_fin)} — ${seance.rows.length} salle(s)`}
      className={`flex h-full w-full flex-col overflow-hidden border-l-4 px-2 py-1 text-left text-[11px] shadow-sm transition hover:shadow-md ${conflict ? 'border-y border-r border-y-rose-300 border-r-rose-300 bg-rose-50' : 'bg-white ring-1 ring-slate-200'}`}
      style={{ borderLeftColor: conflict ? '#c82927' : color }}
    >
      <span className="flex items-center gap-1 font-bold text-slate-900">
        {conflict && <AlertTriangle className="h-3 w-3 shrink-0 text-rose-700" aria-label="Conflit" />}
        <span className="truncate">{seance.groupe_code}</span>
        {!compact && <span className="ml-auto shrink-0 font-normal text-slate-500">{shortTime(seance.heure_debut)}–{shortTime(seance.heure_fin)}</span>}
      </span>
      {!compact && <>
        <span className="truncate text-slate-600">{seance.session_code} · {seance.formation_libelle}</span>
        <span className="truncate text-slate-500"><DoorOpen className="mr-0.5 inline h-3 w-3" />{seance.rows.length === 1 ? seance.rows[0].salle_code : `${seance.rows.length} salles`} · <Users className="mr-0.5 inline h-3 w-3" />{seance.inscrits}</span>
      </>}
    </button>
  );
}

function MonthView({ cursor, slots, today, colorOf, hasConflict, onPick }) {
  const first = parseIso(cursor);
  first.setDate(1);
  const month = first.getMonth();
  const last = toIso(new Date(first.getFullYear(), month + 1, 0));
  const weeks = [];
  for (let start = mondayOf(toIso(first)); start <= last; start = addDays(start, 7)) {
    weeks.push(JOURS.map((_, index) => addDays(start, index)));
  }
  return (
    <section className="overflow-x-auto border border-slate-200 bg-white" aria-label="Mois">
      <div className="grid min-w-[760px] grid-cols-5 border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600">{JOURS.map((day) => <div key={day.id} className="px-2 py-2">{day.label}</div>)}</div>
      {weeks.map((week) => (
        <div key={week[0]} className="grid min-w-[760px] grid-cols-5 border-b border-slate-100">
          {week.map((iso) => {
            const seances = sessionsOn(slots, iso);
            const outside = parseIso(iso).getMonth() !== month;
            return (
              <button key={iso} type="button" onClick={() => onPick(iso)} className={`min-h-28 border-r border-slate-100 p-1.5 text-left align-top hover:bg-teal-50/50 ${outside ? 'bg-slate-50/70 text-slate-400' : ''} ${iso === today ? 'ring-2 ring-inset ring-teal-600' : ''}`}>
                <span className="flex items-center justify-between text-xs font-bold"><span>{parseIso(iso).getDate()}</span>{seances.length > 0 && <span className="font-normal text-slate-500">{seances.length} séance(s)</span>}</span>
                <span className="mt-1 flex flex-col gap-0.5">
                  {seances.slice(0, 4).map((seance) => <span key={seance.key} className={`flex items-center gap-1 truncate px-1 text-[10px] font-semibold ${hasConflict(seance) ? 'bg-rose-100 text-rose-900' : 'text-slate-700'}`}><Dot color={colorOf(seance.sample)} />{shortTime(seance.heure_debut)} {seance.groupe_code} · {seance.rows.length} s.</span>)}
                  {seances.length > 4 && <span className="px-1 text-[10px] text-slate-500">+{seances.length - 4} autre(s)</span>}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </section>
  );
}

function OccupationView({ occupation, filters, colorOf, conflictIds }) {
  if (!occupation) return <div className="flex items-center justify-center gap-2 border border-slate-200 bg-white p-10 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Chargement de l’occupation…</div>;
  const rows = occupation.salles.filter((room) => !filters.room || String(room.id) === filters.room);
  const matches = (item) => (!filters.formation || String(item.id_formation) === filters.formation)
    && (!filters.session || String(item.id_session) === filters.session)
    && (!filters.group || String(item.id_groupe) === filters.group)
    && (!filters.trainer || String(item.id_formateur) === filters.trainer);
  return (
    <section className="overflow-x-auto border border-slate-200 bg-white" aria-label="Occupation des salles">
      <table className="w-full min-w-[860px] border-collapse text-xs">
        <caption className="px-3 py-2 text-left text-slate-600">Sessions en cours ou à venir. Une cellule = une salle un jour de la semaine ; plusieurs séances y figurent si elles ont lieu à des horaires ou périodes différents.</caption>
        <thead className="bg-slate-50 text-[11px] uppercase text-slate-600">
          <tr><th scope="col" className="w-48 px-3 py-2 text-left">Salle</th>{JOURS.map((day) => <th key={day.id} scope="col" className="border-l border-slate-200 px-2 py-2 text-left">{day.label}</th>)}<th scope="col" className="border-l border-slate-200 px-2 py-2 text-right">Jours occupés</th></tr>
        </thead>
        <tbody>
          {rows.map((room) => (
            <tr key={room.id} className="border-t border-slate-100 align-top">
              <th scope="row" className="px-3 py-2 text-left font-normal">
                <span className="font-bold text-slate-900">{room.code}</span> <span className="text-slate-500">{room.capacite ? `${room.capacite} pl.` : ''}</span>
                <span className="block text-[11px] text-slate-500">{room.formateur || 'Sans formateur'}</span>
                {room.formation_proprietaire && <span className="mt-0.5 inline-block border border-slate-300 px-1 text-[10px] text-slate-600">Dédiée · {room.formation_proprietaire}</span>}
              </th>
              {JOURS.map((day) => {
                const items = (room.jours[day.id] || []).filter(matches);
                const unavailable = room.statut !== 'disponible';
                return (
                  <td key={day.id} className={`border-l border-slate-100 px-1.5 py-1.5 ${unavailable ? 'bg-slate-100' : ''}`}>
                    {unavailable && <span className="text-[11px] text-slate-500">Indisponible</span>}
                    {!unavailable && !items.length && <span className="block border border-dashed border-slate-300 px-1.5 py-1 text-[11px] text-slate-400">Libre</span>}
                    <div className="space-y-1">
                      {items.map((item) => {
                        const conflict = conflictIds.has(Number(item.id));
                        return (
                          <div key={item.id} className={`border-l-4 px-1.5 py-0.5 ${conflict ? 'bg-rose-50 ring-1 ring-rose-300' : 'bg-slate-50'}`} style={{ borderLeftColor: conflict ? '#c82927' : colorOf({ id_groupe: item.id_groupe, id_type_formation: item.id_formation }) }}>
                            <span className="flex items-center gap-1 font-semibold text-slate-800">{conflict && <AlertTriangle className="h-3 w-3 text-rose-700" aria-label="Conflit" />}{item.session_code} · {item.groupe_code}</span>
                            <span className="text-[10px] text-slate-500">{shortTime(item.heure_debut)}–{shortTime(item.heure_fin)} · {shortDate(item.date_debut)}→{shortDate(item.date_fin)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                );
              })}
              <td className="border-l border-slate-100 px-2 py-2 text-right font-semibold tabular-nums text-slate-700">{room.jours_occupes} / 5</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <Empty text="Aucune salle." />}
    </section>
  );
}

function FreeRooms({ rooms, slots, iso }) {
  const busy = new Set(slots.filter((slot) => sessionsOn([slot], iso).length).map((slot) => Number(slot.id_salle)));
  const free = rooms.filter((room) => room.statut === 'disponible' && !busy.has(Number(room.id)));
  if (!free.length) return <p className="text-xs text-amber-800">Toutes les salles disponibles sont occupées.</p>;
  return <ul className="grid grid-cols-2 gap-1 text-xs">{free.map((room) => <li key={room.id} className="border border-dashed border-slate-300 px-1.5 py-1"><span className="font-semibold text-slate-800">{room.code}</span> <span className="text-slate-500">{room.capacite ?? '—'} pl.</span></li>)}</ul>;
}

function SeanceDialog({ seance, color, conflicts, learnersOf, rooms, canUpdate, onMove, onClose }) {
  const [moving, setMoving] = useState(null);
  const ids = new Set(seance.rows.map((row) => Number(row.id)));
  const related = conflicts.filter((item) => (item.ids || []).some((id) => ids.has(Number(id))));
  return (
    <ModalOverlay onClose={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="seance-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-5" style={{ borderTop: `4px solid ${color}` }}>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">{seance.formation_libelle} · {seance.session_code}</p>
            <h2 id="seance-title" className="text-lg font-bold text-slate-900">{seance.groupe_code} · {seance.groupe_libelle}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" />{longDate(seance.iso)}</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{shortTime(seance.heure_debut)}–{shortTime(seance.heure_fin)}</span>
              <span className="inline-flex items-center gap-1"><Layers className="h-4 w-4" />Passages : {passagesLabel({ passages: seance.sample.groupe_passages, jour_semaine: seance.sample.groupe_jour_semaine })}{seance.sample.session_passages_semaine ? ` (${seance.sample.session_passages_semaine} prévu(s))` : ''}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </header>
        {related.length > 0 && <div className="space-y-1 border-b border-rose-200 bg-rose-50 p-4 text-xs text-rose-900">{related.map((item, index) => <p key={index} className="flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />{item.message}</p>)}</div>}
        <div className="divide-y divide-slate-100">
          {seance.rows.map((row) => {
            const learners = learnersOf(row);
            return (
              <article key={row.id} className="p-4">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                  <span className="inline-flex items-center gap-1 font-bold text-slate-900"><DoorOpen className="h-4 w-4 text-slate-400" />{row.salle_code} · {row.salle_libelle}</span>
                  <span className="inline-flex items-center gap-1 text-slate-700"><UserRound className="h-4 w-4 text-slate-400" />{row.formateur_prenom} {row.formateur_nom}</span>
                  <span className="text-xs text-slate-500">{Number(row.inscrits_actifs) || 0}{row.salle_capacite ? ` / ${row.salle_capacite}` : ''} auditeur(s)</span>
                  {row.origine && row.origine !== 'manuelle' && <span className="border border-slate-200 px-1.5 text-[10px] uppercase text-slate-500">{row.origine === 'reprise' ? 'repris' : 'généré'}</span>}
                  {canUpdate && <button type="button" onClick={() => setMoving(moving === row.id ? null : row.id)} className="ml-auto inline-flex items-center gap-1 border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"><MoveRight className="h-3.5 w-3.5" />Déplacer</button>}
                </div>
                {learners.length > 0 && <p className="mt-1.5 text-xs text-slate-600">{learners.map((item) => `${item.auditeur_nom} ${item.auditeur_prenom}`).join(', ')}</p>}
                {moving === row.id && <MoveForm row={row} rooms={rooms} onSubmit={(change, label) => onMove(row, change, label)} />}
              </article>
            );
          })}
        </div>
      </section>
    </ModalOverlay>
  );
}

/** Déplacement manuel d'un créneau : vérification serveur en direct avant enregistrement. */
function MoveForm({ row, rooms, onSubmit }) {
  const [day, setDay] = useState(String(row.jour_semaine));
  const [room, setRoom] = useState(String(row.id_salle));
  const [check, setCheck] = useState({ loading: false });
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setCheck({ loading: true });
      planificationApi.verifier({ id_groupe: row.id_groupe, id_salle: Number(room), jour_semaine: Number(day), exclude_id: row.id })
        .then((response) => { if (active) setCheck({ loading: false, result: response.data }); })
        .catch((err) => { if (active) setCheck({ loading: false, error: err.message }); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [day, room, row.id, row.id_groupe]);
  const unchanged = day === String(row.jour_semaine) && room === String(row.id_salle);
  const target = rooms.find((item) => String(item.id) === room);
  const ok = check.result?.disponible;
  return (
    <div className="mt-3 space-y-2 border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold text-slate-700">Jour<select value={day} onChange={(event) => setDay(event.target.value)} className="mt-1 block border border-slate-300 bg-white px-2 py-1.5 text-sm">{JOURS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-700">Salle<select value={room} onChange={(event) => setRoom(event.target.value)} className="mt-1 block border border-slate-300 bg-white px-2 py-1.5 text-sm">{rooms.filter((item) => item.statut === 'disponible' || String(item.id) === room).map((item) => <option key={item.id} value={item.id}>{item.code} · {item.libelle}</option>)}</select></label>
        <button type="button" disabled={unchanged || !ok} onClick={async () => { setError(''); try { await onSubmit({ jour_semaine: Number(day), id_salle: Number(room) },`${jourLabel(day)} · ${target?.code || ''}`); } catch (err) { setError(err.message); } }} className="bg-teal-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-40">Enregistrer le déplacement</button>
      </div>
      {check.loading && <p className="flex items-center gap-1 text-xs text-slate-600"><Loader2 className="h-3.5 w-3.5 animate-spin" />Vérification…</p>}
      {!check.loading && check.result && !unchanged && (ok
        ? <p className="flex items-center gap-1 text-xs text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" />Disponible : {jourLabel(day)} {check.result.heure_debut}–{check.result.heure_fin}{check.result.nouveau_passage ? ' (nouveau passage du groupe)' : ''}.</p>
        : <ul className="space-y-0.5 text-xs text-rose-800">{check.result.conflits.map((item, index) => <li key={index} className="flex gap-1"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{item.message}</li>)}</ul>)}
      {(check.error || error) && <p role="alert" className="text-xs text-rose-800">{check.error || error}</p>}
    </div>
  );
}

function AlternativesList({ data, row, onPick }) {
  const hasAny = data.autres_salles.length || data.autres_jours.length || data.autres_horaires.length;
  return (
    <div className="mt-4 space-y-4 text-sm">
      {data.autres_salles.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase text-slate-500">Autres salles libres le {jourLabel(data.jour_semaine).toLocaleLowerCase('fr')}</h3>
          <ul className="mt-1 grid gap-1 sm:grid-cols-2">{data.autres_salles.map((item) => (
            <li key={item.id_salle} className="flex items-center justify-between gap-2 border border-slate-200 px-2 py-1.5">
              <span><span className="font-semibold">{item.salle_code}</span> <span className="text-xs text-slate-500">{item.formateur}</span></span>
              {row && <button type="button" onClick={() => onPick(row, { id_salle: item.id_salle, id_formateur: item.id_formateur }, `Salle ${item.salle_code}`)} className="text-xs font-semibold text-teal-800 hover:underline">Utiliser</button>}
            </li>
          ))}</ul>
        </div>
      )}
      {data.autres_jours.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase text-slate-500">Autres jours (toutes les salles du groupe libres)</h3>
          <ul className="mt-1 flex flex-wrap gap-2">{data.autres_jours.map((item) => (
            <li key={item.jour_semaine} className="flex items-center gap-2 border border-slate-200 px-2 py-1.5">
              <span className="font-semibold">{jourLabel(item.jour_semaine)}</span><span className="text-xs text-slate-500">{item.heure_debut}–{item.heure_fin}</span>
              {row && <button type="button" onClick={() => onPick(row, { jour_semaine: item.jour_semaine }, jourLabel(item.jour_semaine))} className="text-xs font-semibold text-teal-800 hover:underline">Déplacer ce créneau</button>}
            </li>
          ))}</ul>
          <p className="mt-1 text-[11px] text-slate-500">Pour déplacer tout le passage du groupe (toutes ses salles), modifiez ses jours de passage dans l’onglet Planification automatique.</p>
        </div>
      )}
      {data.autres_horaires.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase text-slate-500">Autres créneaux horaires le même jour</h3>
          <ul className="mt-1 flex flex-wrap gap-2">{data.autres_horaires.map((item) => <li key={item.heure_debut} className="border border-slate-200 px-2 py-1.5">{item.heure_debut}–{item.heure_fin}</li>)}</ul>
        </div>
      )}
      {!hasAny && <p className="border border-amber-200 bg-amber-50 p-3 text-amber-900">{data.message}</p>}
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return <TagSelect label={label} value={value} onChange={onChange} options={options.map((option) => ({ ...option, value: String(option.value) }))} placeholder="Tous" className="min-w-40" />;
}

function Empty({ text }) {
  return <div className="py-10 text-center"><CalendarDays className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm text-slate-500">{text}</p></div>;
}
