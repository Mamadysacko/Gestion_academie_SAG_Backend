import { useState } from 'react';
import TagSelect from '../../composant/TagSelect';
import { MapPin, X } from 'lucide-react';
import { ROOM_STATUSES, WEEKDAYS } from './sallesHelpers';
import { getCurrentSchoolYear } from '../../utils/schoolYear';

export function RoomFilter({ label, value, onChange, options, placeholder = 'Tous', multiple = false }) {
  return <TagSelect label={label} value={value} onChange={onChange} options={options} placeholder={placeholder} multiple={multiple} />;
}

export function RoomMetric({ label, value, detail, tone = 'teal' }) {
  const tones = { teal: 'border-teal-200 bg-teal-50 text-teal-950', green: 'border-emerald-200 bg-emerald-50 text-emerald-950', red: 'border-rose-200 bg-rose-50 text-rose-950', rose: 'border-rose-200 bg-rose-50 text-rose-950', amber: 'border-amber-200 bg-amber-50 text-amber-950', blue: 'border-sky-200 bg-sky-50 text-sky-950', slate: 'border-slate-200 bg-white text-slate-900' };
  return <div className={`border p-4 ${tones[tone]}`}><p className="text-[11px] font-bold uppercase text-current/70">{label}</p><p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>{detail && <p className="mt-1 text-xs text-current/70">{detail}</p>}</div>;
}

export function StatusBadge({ status }) {
  const labels = { disponible: 'Disponible', indisponible: 'Indisponible', maintenance: 'En maintenance' };
  const classes = { disponible: 'border-emerald-200 bg-emerald-50 text-emerald-800', indisponible: 'border-slate-200 bg-slate-100 text-slate-700', maintenance: 'border-amber-200 bg-amber-50 text-amber-800' };
  return <span className={`inline-flex items-center border px-2 py-1 text-[10px] font-bold ${classes[status] || classes.indisponible}`}><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />{labels[status] || status}</span>;
}

export function RoomFormDialog({ room, trainers = [], onClose, onSave, error }) {
  const [form, setForm] = useState(() => room ? { ...room, statut: room.displayStatus || room.statut, capacite: room.capacite ?? '', id_formateur: room.trainer?.id ?? '' } : {
    code: '', libelle: '', capacite: '', statut: 'disponible', id_formateur: '',
  });
  const [validation, setValidation] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (!form.code.trim() || !form.libelle.trim()) {
      setValidation('Le code et le nom de la salle sont obligatoires.');
      return;
    }
    if (form.code.trim().length > 30 || form.libelle.trim().length > 100) {
      setValidation('Le code ne peut pas dépasser 30 caractères et le libellé 100 caractères.');
      return;
    }
    if (form.capacite !== '' && (!Number.isInteger(Number(form.capacite)) || Number(form.capacite) <= 0)) {
      setValidation('La capacité doit être un entier strictement positif.');
      return;
    }
    onSave(form);
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="room-dialog-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto border border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-200 p-5"><div><h2 id="room-dialog-title" className="text-base font-bold text-slate-900">{room ? 'Modifier la salle' : 'Nouvelle salle'}</h2><p className="mt-1 text-xs text-slate-500">Code, libellé, capacité et statut correspondent à la table SQL `salles`.</p></div><button type="button" onClick={onClose} aria-label="Fermer" className="p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><form onSubmit={submit} className="space-y-4 p-5"><div className="grid gap-4 sm:grid-cols-2">
    <label className="block text-xs font-semibold text-slate-700">Code *<input required maxLength="30" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm uppercase" /></label>
    <label className="block text-xs font-semibold text-slate-700">Nom / libellé *<input required maxLength="100" value={form.libelle} onChange={(event) => setForm((current) => ({ ...current, libelle: event.target.value }))} className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm" /></label>
    <label className="block text-xs font-semibold text-slate-700">Capacité (places)<input type="number" min="1" max="4294967295" step="1" value={form.capacite} onChange={(event) => setForm((current) => ({ ...current, capacite: event.target.value }))} className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm" placeholder="Non précisée" /></label>
    <TagSelect label="Statut" required value={form.statut} onChange={(next) => setForm((current) => ({ ...current, statut: next }))} options={ROOM_STATUSES} />
    <div className="sm:col-span-2"><TagSelect label="Formateur attitré" value={String(form.id_formateur || '')} onChange={(next) => setForm((current) => ({ ...current, id_formateur: next }))} options={trainers.filter((trainer) => !trainer.id_salle || String(trainer.id) === String(form.id_formateur) || Number(trainer.id_salle) === Number(room?.id)).map((trainer) => ({ value: String(trainer.id), label: `${trainer.prenom} ${trainer.nom}`, hint: trainer.matricule }))} placeholder="Aucun formateur" /><span className="mt-1 block text-xs text-slate-500">Seul ce formateur enseigne dans cette salle. Seuls les formateurs sans salle sont proposés.</span></div>
  </div>{(validation || error) && <p role="alert" className="text-xs font-semibold text-rose-700">{validation || error}</p>}<p className="text-[11px] leading-5 text-slate-500">La base accepte uniquement les statuts « disponible » et « indisponible ». Une salle avec des créneaux actifs ne peut pas être rendue indisponible, et une salle référencée ne peut pas être supprimée.</p><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700">Annuler</button><button type="submit" className="bg-teal-800 px-4 py-2 text-xs font-semibold text-white">{room ? 'Enregistrer' : 'Créer la salle'}</button></div></form></section></div>;
}

export function AssignmentFormDialog({ assignment, data, onClose, onSave, error }) {
  const [form, setForm] = useState(() => {
    if (!assignment) {
      return {
        id_annee: getCurrentSchoolYear(data.annees_scolaires)?.id || '',
        id_session: '', id_groupe: '', id_salle: '', id_formateur: '', jour_semaine: 1, statut: 1,
      };
    }
    const group = data.groupes.find((item) => item.id === Number(assignment.id_groupe));
    return { ...assignment, id_session: group?.id_session || '' };
  });
  const [validation, setValidation] = useState('');
  const sessions = data.sessions.filter((session) => !form.id_annee || session.id_annee === Number(form.id_annee));
  const groups = data.groupes.filter((group) => (
    Number(group.statut) === 1 || group.id === Number(form.id_groupe)
  ) && (form.id_session
    ? group.id_session === Number(form.id_session)
    : sessions.some((session) => session.id === group.id_session)));

  const selectedGroup = data.groupes.find((group) => group.id === Number(form.id_groupe));
  const trainerOf = (roomId) => data.formateurs.find((item) => Number(item.id_salle) === Number(roomId));
  const selectedTrainer = trainerOf(form.id_salle);
  // Salles déjà utilisées ce jour-là (par un autre créneau de la même année).
  const busyRooms = new Set(data.emplois_du_temps
    .filter((item) => item.id !== assignment?.id && Number(item.id_annee) === Number(form.id_annee)
      && Number(item.jour_semaine) === Number(selectedGroup?.jour_semaine) && Number(item.statut) === 1)
    .map((item) => Number(item.id_salle)));

  const submit = (event) => {
    event.preventDefault();
    if (!selectedTrainer) {
      setValidation('Cette salle n’a pas de formateur attitré. Attribuez-lui d’abord un formateur (onglet Salles).');
      return;
    }
    onSave({ ...form, id_formateur: selectedTrainer.id, jour_semaine: selectedGroup?.jour_semaine ?? form.jour_semaine });
  };


  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="assignment-dialog-title" className="w-full max-w-xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-200 p-5"><div><h2 id="assignment-dialog-title" className="text-base font-bold text-slate-900">{assignment?.id ? 'Modifier le créneau' : 'Affecter un groupe à une salle'}</h2><p className="mt-1 text-xs text-slate-500">Le jour est celui du groupe et le formateur est celui de la salle. Un groupe peut occuper plusieurs salles le même jour.</p></div><button type="button" onClick={onClose} aria-label="Fermer" className="p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
    <form onSubmit={submit} className="space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <TagSelect label="Année scolaire" required value={String(form.id_annee || '')} onChange={(next) => setForm((current) => ({ ...current, id_annee: Number(next), id_session: '', id_groupe: '' }))} options={data.annees_scolaires.map((year) => ({ value: String(year.id), label: year.libelle }))} placeholder="Sélectionner une année" />
        <TagSelect label="Session" value={String(form.id_session || '')} onChange={(next) => setForm((current) => ({ ...current, id_session: next ? Number(next) : '', id_groupe: '' }))} options={sessions.map((session) => ({ value: String(session.id), label: `${session.code} · ${session.libelle}`, hint: `${session.date_debut} → ${session.date_fin}` }))} placeholder="Toutes les sessions" />
      </div>
      <TagSelect label="Groupe / classe" required value={String(form.id_groupe || '')} onChange={(next) => { setForm((current) => ({ ...current, id_groupe: next ? Number(next) : '' })); setValidation(''); }} options={groups.map((group) => ({ value: String(group.id), label: `${group.code} · ${group.libelle}`, hint: `${WEEKDAYS.find((day) => day.value === Number(group.jour_semaine))?.label || ''} · ${String(group.heure_debut || '').slice(0, 5)}–${String(group.heure_fin || '').slice(0, 5)}` }))} placeholder="Sélectionner un groupe" />
      <TagSelect label="Salle" required value={String(form.id_salle || '')} onChange={(next) => { setForm((current) => ({ ...current, id_salle: next ? Number(next) : '' })); setValidation(''); }} options={data.salles.filter((room) => room.statut === 'disponible' || room.id === Number(form.id_salle)).filter((room) => trainerOf(room.id) && (!busyRooms.has(Number(room.id)) || room.id === Number(form.id_salle))).map((room) => { const trainer = trainerOf(room.id); return { value: String(room.id), label: `${room.code} · ${room.libelle}`, hint: `${trainer.prenom} ${trainer.nom}${room.capacite ? ` · ${room.capacite} places` : ''}` }; })} placeholder="Sélectionner une salle libre avec formateur" emptyMessage="Aucune salle libre avec formateur attitré ce jour-là." />
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <span className="font-semibold uppercase tracking-wide text-slate-500">Déduits automatiquement :</span>
        <span className="rounded-md bg-teal-50 px-2 py-1 font-semibold text-teal-900 ring-1 ring-teal-200">Jour : {selectedGroup ? WEEKDAYS.find((day) => day.value === Number(selectedGroup.jour_semaine))?.label : '—'}</span>
        <span className="rounded-md bg-teal-50 px-2 py-1 font-semibold text-teal-900 ring-1 ring-teal-200">Formateur : {selectedTrainer ? `${selectedTrainer.prenom} ${selectedTrainer.nom}` : '—'}</span>
      </div>
      {(validation || error) && <p role="alert" className="text-xs font-semibold text-rose-700">{validation || error}</p>}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700">Annuler</button><button type="submit" className="bg-teal-800 px-4 py-2 text-xs font-semibold text-white">Enregistrer</button></div>
    </form></section></div>;
}

export function RoomAssignmentLabel({ assignment, data }) {
  const group = data.groupes.find((item) => item.id === assignment.id_groupe);
  const room = data.salles.find((item) => item.id === assignment.id_salle);
  const trainer = data.formateurs.find((item) => item.id === assignment.id_formateur);
  const day = WEEKDAYS.find((item) => item.value === assignment.jour_semaine)?.label;
  return <span className="inline-flex items-center gap-1.5 text-xs text-slate-600"><MapPin className="h-3.5 w-3.5 text-teal-700" />{group?.code} · {room?.code} · {day} · {trainer?.prenom} {trainer?.nom}</span>;
}