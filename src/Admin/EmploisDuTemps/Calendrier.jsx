import { useMemo, useState } from 'react';
import TagSelect from '../../composant/TagSelect';
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Clock, DoorOpen, UserRound, Users } from 'lucide-react';
import { JOURS, jourLabel } from './emploisHelpers';
import { detectConflicts } from './calendarHelpers';
import ModalOverlay from '../../composant/ModalOverlay';

const MODES = [
  { id: 'jour', label: 'Jour' },
  { id: 'semaine', label: 'Semaine' },
  { id: 'mois', label: 'Mois' },
];

const toIso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const parse = (iso) => new Date(`${iso}T00:00:00`);
const addDays = (iso, days) => { const date = parse(iso); date.setDate(date.getDate() + days); return toIso(date); };
const isoWeekday = (iso) => ((parse(iso).getDay() + 6) % 7) + 1;
const mondayOf = (iso) => addDays(iso, 1 - isoWeekday(iso));
const shortTime = (value) => String(value || '').slice(0, 5);
const longDate = (iso) => parse(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = (iso) => parse(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

/**
 * Calendrier centralisé des emplois du temps : chaque créneau hebdomadaire (groupe × salle × jour)
 * est projeté sur les dates réelles de sa session et de son année.
 */
export default function Calendrier({ data, isTrainer = false }) {
  const [mode, setMode] = useState('semaine');
  const [cursor, setCursor] = useState(toIso(new Date()));
  const [filters, setFilters] = useState({ session: '', group: '', room: '', trainer: '' });
  const [openSlot, setOpenSlot] = useState(null);

  const slots = useMemo(() => data.emplois_du_temps.filter((slot) => Number(slot.statut) === 1
    && (!filters.session || String(slot.id_session) === filters.session)
    && (!filters.group || String(slot.id_groupe) === filters.group)
    && (!filters.room || String(slot.id_salle) === filters.room)
    && (!filters.trainer || String(slot.id_formateur) === filters.trainer)), [data.emplois_du_temps, filters]);

  const occurrencesOn = (iso) => {
    const weekday = isoWeekday(iso);
    if (weekday > 5) return [];
    return slots
      .filter((slot) => Number(slot.jour_semaine) === weekday
        && (!slot.session_date_debut || (iso >= slot.session_date_debut && iso <= slot.session_date_fin))
        && (!slot.annee_date_debut || (iso >= slot.annee_date_debut && iso <= slot.annee_date_fin)))
      .sort((a, b) => String(a.heure_debut).localeCompare(String(b.heure_debut)) || String(a.salle_code).localeCompare(String(b.salle_code)));
  };

  const learnersOf = (slot) => data.inscriptions
    .filter((item) => Number(item.id_emploi_du_temps) === Number(slot.id) && item.statut === 'active')
    .sort((a, b) => `${a.auditeur_nom}`.localeCompare(`${b.auditeur_nom}`, 'fr'));

  const conflicts = useMemo(() => detectConflicts(data), [data]);
  const conflictIds = new Set(conflicts.flatMap((item) => item.slotIds));

  const step = mode === 'jour' ? 1 : mode === 'semaine' ? 7 : null;
  const move = (direction) => {
    if (step) { setCursor(addDays(cursor, step * direction)); return; }
    const date = parse(cursor);
    date.setDate(1);
    date.setMonth(date.getMonth() + direction);
    setCursor(toIso(date));
  };

  const weekStart = mondayOf(cursor);
  const weekDays = JOURS.map((day, index) => ({ ...day, iso: addDays(weekStart, index) }));
  const monthWeeks = useMemo(() => {
    const first = parse(cursor);
    first.setDate(1);
    const firstIso = toIso(first);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    const weeks = [];
    for (let start = mondayOf(firstIso); start <= toIso(last); start = addDays(start, 7)) {
      weeks.push(JOURS.map((_, index) => addDays(start, index)));
    }
    return { weeks, month: first.getMonth() };
  }, [cursor]);

  const title = mode === 'jour' ? longDate(cursor)
    : mode === 'semaine' ? `Semaine du ${shortDate(weekStart)} au ${shortDate(addDays(weekStart, 4))}`
      : parse(cursor).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value, ...(key === 'session' ? { group: '' } : {}) }));
  const freeRooms = (iso) => {
    const used = new Set(occurrencesOn(iso).map((slot) => Number(slot.id_salle)));
    return data.salles.filter((room) => room.statut === 'disponible' && !used.has(Number(room.id)));
  };

  const renderSlotCard = (slot, compact = false) => {
    const count = Number(slot.inscrits_actifs) || 0;
    const capacity = slot.salle_capacite == null ? null : Number(slot.salle_capacite);
    const flagged = conflictIds.has(Number(slot.id));
    return (
      <button type="button" onClick={() => setOpenSlot(slot)} className={`w-full border-l-4 p-2 text-left text-xs transition hover:shadow ${flagged ? 'border-rose-500 bg-rose-50' : 'border-teal-600 bg-teal-50/70'}`}>
        <span className="flex items-center gap-1 font-semibold text-slate-900"><Clock className="h-3 w-3" />{shortTime(slot.heure_debut)}–{shortTime(slot.heure_fin)}{flagged && <AlertTriangle className="ml-auto h-3.5 w-3.5 text-rose-600" />}</span>
        <span className="mt-0.5 block font-bold text-slate-800">{slot.groupe_code} · {slot.salle_code}</span>
        {!compact && <>
          <span className="block truncate text-slate-600">{slot.formateur_prenom} {slot.formateur_nom}</span>
          <span className="block text-slate-500">{slot.session_code} · {count}{capacity ? `/${capacity}` : ''} auditeur(s)</span>
        </>}
      </button>
    );
  };

  const groupsOptions = data.groupes.filter((group) => !filters.session || String(group.id_session) === filters.session);

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 border border-slate-200 bg-white p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex border border-slate-300" role="tablist" aria-label="Vue du calendrier">{MODES.map((item) => <button key={item.id} type="button" role="tab" aria-selected={mode === item.id} onClick={() => setMode(item.id)} className={`px-3 py-2 text-xs font-semibold ${mode === item.id ? 'bg-teal-800 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>{item.label}</button>)}</div>
          <button type="button" onClick={() => move(-1)} aria-label="Période précédente" className="border border-slate-300 bg-white p-2"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => setCursor(toIso(new Date()))} className="border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">Aujourd’hui</button>
          <button type="button" onClick={() => move(1)} aria-label="Période suivante" className="border border-slate-300 bg-white p-2"><ChevronRight className="h-4 w-4" /></button>
          <h2 className="ml-2 text-base font-bold capitalize text-slate-900">{title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select label="Session" value={filters.session} onChange={(value) => setFilter('session', value)} options={data.sessions.map((item) => ({ value: item.id, label: `${item.code} · ${item.libelle}` }))} />
          <Select label="Groupe" value={filters.group} onChange={(value) => setFilter('group', value)} options={groupsOptions.map((item) => ({ value: item.id, label: `${item.code} · ${item.libelle}` }))} />
          <Select label="Salle" value={filters.room} onChange={(value) => setFilter('room', value)} options={data.salles.map((item) => ({ value: item.id, label: `${item.code} · ${item.libelle}` }))} />
          {!isTrainer && <Select label="Formateur" value={filters.trainer} onChange={(value) => setFilter('trainer', value)} options={data.formateurs.map((item) => ({ value: item.id, label: `${item.prenom} ${item.nom}` }))} />}
        </div>
      </section>

      {!isTrainer && conflicts.length > 0 && (
        <details className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" open>
          <summary className="flex cursor-pointer items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" />{conflicts.length} conflit(s) ou incohérence(s) détecté(s)</summary>
          <ul className="mt-2 space-y-1 text-xs">{conflicts.map((item, index) => <li key={index}><span className="font-semibold">{item.type} :</span> {item.message}</li>)}</ul>
        </details>
      )}

      {mode === 'jour' && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="space-y-2 border border-slate-200 bg-white p-4">
            {occurrencesOn(cursor).map((slot) => {
              const learners = learnersOf(slot);
              return (
                <article key={slot.id} className={`border-l-4 p-3 ${conflictIds.has(Number(slot.id)) ? 'border-rose-500 bg-rose-50' : 'border-teal-600 bg-slate-50'}`}>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                    <span className="inline-flex items-center gap-1 font-bold text-slate-900"><Clock className="h-4 w-4" />{shortTime(slot.heure_debut)}–{shortTime(slot.heure_fin)}</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-4 w-4 text-slate-400" />{slot.groupe_code} · {slot.groupe_libelle}</span>
                    <span className="inline-flex items-center gap-1"><DoorOpen className="h-4 w-4 text-slate-400" />{slot.salle_code} · {slot.salle_libelle}</span>
                    <span className="inline-flex items-center gap-1"><UserRound className="h-4 w-4 text-slate-400" />{slot.formateur_prenom} {slot.formateur_nom}</span>
                    <span className="text-xs text-slate-500">{slot.session_code} · {slot.session_libelle}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{learners.length} auditeur(s){slot.salle_capacite ? ` / ${slot.salle_capacite} places` : ''} : {learners.map((item) => `${item.auditeur_nom} ${item.auditeur_prenom}`).join(', ') || 'aucun'}</p>
                </article>
              );
            })}
            {!occurrencesOn(cursor).length && <Empty text={isoWeekday(cursor) > 5 ? 'Week-end : aucun cours.' : 'Aucun cours ce jour avec ces filtres.'} />}
          </section>
          {!isTrainer && <aside className="border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-slate-900">Disponibilités du jour</h3>
            <p className="mt-1 text-xs text-slate-500">Salles disponibles sans cours :</p>
            <ul className="mt-2 space-y-1 text-xs">{freeRooms(cursor).map((room) => <li key={room.id} className="flex justify-between"><span>{room.code} · {room.libelle}</span><span className="text-slate-500">{room.capacite ?? '—'} pl.</span></li>)}</ul>
            {isoWeekday(cursor) <= 5 && !freeRooms(cursor).length && <p className="mt-2 text-xs text-amber-700">Toutes les salles sont occupées.</p>}
          </aside>}
        </div>
      )}

      {mode === 'semaine' && (
        <section className="grid gap-2 overflow-x-auto md:grid-cols-5">
          {weekDays.map((day) => (
            <div key={day.iso} className={`min-w-44 border bg-white ${day.iso === toIso(new Date()) ? 'border-teal-500' : 'border-slate-200'}`}>
              <button type="button" onClick={() => { setCursor(day.iso); setMode('jour'); }} className="w-full border-b border-slate-200 bg-slate-50 px-3 py-2 text-left"><span className="block text-xs font-bold uppercase text-slate-700">{day.label}</span><span className="text-[11px] text-slate-500">{shortDate(day.iso)} · {freeRooms(day.iso).length} salle(s) libre(s)</span></button>
              <div className="space-y-1.5 p-2">{occurrencesOn(day.iso).map((slot) => <div key={slot.id}>{renderSlotCard(slot)}</div>)}{!occurrencesOn(day.iso).length && <p className="py-4 text-center text-[11px] text-slate-400">Aucun cours</p>}</div>
            </div>
          ))}
        </section>
      )}

      {mode === 'mois' && (
        <section className="overflow-x-auto border border-slate-200 bg-white">
          <div className="grid min-w-[720px] grid-cols-5 border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600">{JOURS.map((day) => <div key={day.id} className="px-2 py-2">{day.label}</div>)}</div>
          {monthWeeks.weeks.map((week) => (
            <div key={week[0]} className="grid min-w-[720px] grid-cols-5 border-b border-slate-100">
              {week.map((iso) => {
                const items = occurrencesOn(iso);
                const outside = parse(iso).getMonth() !== monthWeeks.month;
                return (
                  <button key={iso} type="button" onClick={() => { setCursor(iso); setMode('jour'); }} className={`min-h-24 border-r border-slate-100 p-1.5 text-left align-top hover:bg-teal-50/50 ${outside ? 'bg-slate-50/70 text-slate-400' : ''} ${iso === toIso(new Date()) ? 'ring-2 ring-inset ring-teal-500' : ''}`}>
                    <span className="text-xs font-bold">{parse(iso).getDate()}</span>
                    <span className="mt-1 flex flex-wrap gap-1">{items.slice(0, 6).map((slot) => <span key={slot.id} className={`px-1 text-[10px] font-semibold ${conflictIds.has(Number(slot.id)) ? 'bg-rose-100 text-rose-800' : 'bg-teal-100 text-teal-900'}`}>{slot.groupe_code}·{slot.salle_code}</span>)}{items.length > 6 && <span className="text-[10px] text-slate-500">+{items.length - 6}</span>}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </section>
      )}

      {openSlot && (
        <ModalOverlay onClose={() => { setOpenSlot(null); }}>
          <section role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-slate-200 bg-white p-5 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900">{openSlot.groupe_code} · {openSlot.groupe_libelle}</h2>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <dt className="text-slate-500">Session</dt><dd>{openSlot.session_code} · {openSlot.session_libelle}</dd>
              <dt className="text-slate-500">Jour / horaires</dt><dd>{jourLabel(openSlot.jour_semaine)} · {shortTime(openSlot.heure_debut)}–{shortTime(openSlot.heure_fin)}</dd>
              <dt className="text-slate-500">Salle</dt><dd>{openSlot.salle_code} · {openSlot.salle_libelle} ({openSlot.salle_capacite ?? '—'} places)</dd>
              <dt className="text-slate-500">Formateur</dt><dd>{openSlot.formateur_prenom} {openSlot.formateur_nom}</dd>
            </dl>
            {conflicts.filter((item) => item.slotIds.includes(Number(openSlot.id))).map((item, index) => <p key={index} className="mt-2 border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">{item.type} : {item.message}</p>)}
            <h3 className="mt-4 text-xs font-bold uppercase text-slate-500">Auditeurs ({learnersOf(openSlot).length})</h3>
            <ul className="mt-1 divide-y divide-slate-100 text-sm">{learnersOf(openSlot).map((item) => <li key={item.id} className="flex justify-between py-1"><span>{item.auditeur_nom} {item.auditeur_prenom}</span><span className="font-mono text-xs text-slate-500">{item.auditeur_matricule}</span></li>)}</ul>
            <div className="mt-4 flex justify-end"><button type="button" onClick={() => setOpenSlot(null)} className="border border-slate-300 px-3 py-2 text-xs font-semibold">Fermer</button></div>
          </section>
        </ModalOverlay>
      )}
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return <TagSelect label={label} value={value} onChange={onChange} options={options.map((option) => ({ ...option, value: String(option.value) }))} placeholder="Tous" className="min-w-40" />;
}

function Empty({ text }) {
  return <div className="py-10 text-center"><CalendarDays className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm text-slate-500">{text}</p></div>;
}
