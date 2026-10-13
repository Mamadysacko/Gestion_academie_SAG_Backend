import { CalendarDays, Check, Download, GraduationCap, MapPin, Search } from 'lucide-react';
import { dateToInput, formatDate } from './presenceHelpers';
import { PresenceFilter, PresenceMetric, PresenceTable } from './PresenceComponents';

export default function ParDate({
  data,
  sheets,
  hasYearSchedules,
  weekdayMismatchCount,
  selectedDate,
  onDateChange,
  selectedRoom,
  onRoomChange,
  selectedGroup,
  onGroupChange,
  selectedTrainer,
  onTrainerChange,
  groups,
  trainers,
  search,
  onSearch,
  onStatusChange,
  onOpenProfile,
  onMarkGroupPresent,
  onExport,
  canEdit,
}) {
  const rows = sheets.flatMap((sheet) => sheet.rows);
  const presentCount = rows.filter((row) => row.statut === 'present').length;
  const absentCount = rows.filter((row) => row.statut === 'absent').length;

  return (
    <div className="space-y-4">
      {weekdayMismatchCount > 0 && (
        <div role="alert" className="border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {weekdayMismatchCount} affectation{weekdayMismatchCount > 1 ? 's' : ''} active{weekdayMismatchCount > 1 ? 's' : ''} ne correspond{weekdayMismatchCount > 1 ? 'ent' : ''} pas au jour configuré pour le groupe. Le pointage est bloqué pour ces affectations ; corrigez leur jour dans les emplois du temps.
        </div>
      )}
      <section className="flex flex-col gap-4 border border-slate-200 bg-white p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase text-slate-500">Journée</span><input type="date" max={dateToInput(new Date())} value={selectedDate} onChange={(event) => onDateChange(event.target.value)} className="border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-700" /></label>
          <PresenceFilter label="Salle" value={selectedRoom} onChange={onRoomChange} placeholder="Toutes les salles" options={data.salles.map((salle) => ({ value: String(salle.id), label: `${salle.code} · ${salle.libelle}` }))} />
          <PresenceFilter label="Groupe" value={selectedGroup} onChange={onGroupChange} placeholder="Tous les groupes" options={groups.map((group) => ({ value: String(group.id), label: group.libelle }))} />
          <PresenceFilter label="Formateur" value={selectedTrainer} onChange={onTrainerChange} placeholder="Tous les formateurs" options={trainers.map((trainer) => ({ value: String(trainer.id), label: `${trainer.prenom} ${trainer.nom}` }))} />
        </div>
        <label className="relative block w-full lg:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Rechercher un auditeur" className="w-full border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-700" /></label>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PresenceMetric label="Auditeurs concernés" value={rows.length} detail={formatDate(selectedDate)} />
        <PresenceMetric label="Présents" value={presentCount} tone="green" />
        <PresenceMetric label="Absents" value={absentCount} tone="red" />
        <PresenceMetric label="Affectations" value={sheets.length} detail="groupes et salles du jour" tone="slate" />
      </section>

      {sheets.length ? sheets.map((sheet) => (
        <section key={sheet.emploi.id} className="border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <div><h2 className="text-sm font-bold text-slate-900">{sheet.groupe?.libelle || 'Groupe'}</h2><p className="mt-1 text-xs text-slate-500">{sheet.session?.libelle || 'Session'}</p></div>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-600"><MapPin className="h-3.5 w-3.5 text-teal-700" />{sheet.salle?.code} · {sheet.salle?.libelle} · {sheet.rows.length}/{sheet.salle?.capacite ?? '—'} places</span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-600"><GraduationCap className="h-3.5 w-3.5 text-teal-700" />{sheet.formateur?.prenom} {sheet.formateur?.nom}</span>
            </div>
            <button type="button" onClick={() => onMarkGroupPresent(sheet.rows)} disabled={!canEdit || !sheet.rows.length} className="inline-flex items-center justify-center gap-2 bg-teal-800 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-900 disabled:opacity-40"><Check className="h-4 w-4" /> Tous présents</button>
          </div>
          {sheet.rows.length
            ? <PresenceTable rows={sheet.rows} onStatusChange={onStatusChange} onOpenProfile={onOpenProfile} showDate={false} canEdit={canEdit} />
            : <p className="px-5 py-8 text-center text-sm text-amber-800">Aucun auditeur actif n’est inscrit dans ce groupe pour cette année scolaire.</p>}
        </section>
      )) : (
        <div className="border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><CalendarDays className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-3 text-sm font-bold text-slate-800">{hasYearSchedules ? 'Aucun emploi du temps ce jour' : 'Aucune affectation pour cette année scolaire'}</h2><p className="mt-1 text-sm text-slate-500">{hasYearSchedules ? 'Aucune affectation active n’est programmée à cette date selon le jour de semaine enregistré.' : 'Choisissez une autre année scolaire ou vérifiez les affectations actives, les groupes et les inscriptions.'}</p></div>
      )}
      <div className="flex justify-end"><button type="button" onClick={() => onExport(rows, `feuille-presence-${selectedDate}`)} disabled={!rows.length} className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Download className="h-4 w-4" /> Exporter la feuille du jour</button></div>
    </div>
  );
}