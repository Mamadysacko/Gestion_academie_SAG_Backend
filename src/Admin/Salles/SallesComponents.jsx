import { useState } from 'react';
import TagSelect from '../../composant/TagSelect';
import FormDialog from '../../composant/FormDialog';
import { ChipGroup, ListPicker, RecapStrip } from '../../composant/ListPicker';
import { MapPin, Plus } from 'lucide-react';
import SaveActions from '../../composant/SaveActions';
import { useSubmitGuard } from '../../composant/useSubmitGuard';
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

export function RoomFormDialog({ room, trainers = [], onClose, onSave, error, compact = false }) {
  const [form, setForm] = useState(() => room ? { ...room, statut: room.displayStatus || room.statut, capacite: room.capacite ?? '', id_formateur: room.trainer?.id ?? '' } : {
    code: '', libelle: '', capacite: '', statut: 'disponible', id_formateur: '',
  });
  const [validation, setValidation] = useState('');
  const [busy, run] = useSubmitGuard();
  const isNew = !room;

  const validate = () => {
    if (!form.code.trim() || !form.libelle.trim()) return 'Le code et le nom de la salle sont obligatoires.';
    if (form.code.trim().length > 30 || form.libelle.trim().length > 100) return 'Le code ne peut pas dépasser 30 caractères et le libellé 100 caractères.';
    if (form.capacite !== '' && (!Number.isInteger(Number(form.capacite)) || Number(form.capacite) <= 0)) return 'La capacité doit être un entier strictement positif.';
    if (isNew && !form.id_formateur) return 'Une salle doit avoir un formateur attitré dès sa création (sans lui, elle ne peut pas être affectée à un groupe) : choisissez-en un.';
    return '';
  };
  // Les erreurs de saisie restent affichées, le formulaire n'est jamais vidé en cas d'échec.
  const save = (mode = 'close') => {
    const message = validate();
    setValidation(message);
    if (message) return undefined;
    return run(() => onSave(form, mode));
  };
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const input = 'mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold-light/50';

  return (
    <FormDialog
      titleId="room-dialog-title"
      title={room ? 'Modifier la salle' : 'Nouvelle salle'}
      description="Code, libellé, capacité, statut et formateur attitré de la salle."
      size="max-w-2xl"
      onClose={onClose}
      footer={(
        <SaveActions
          form="room-form"
          busy={busy}
          onCancel={onClose}
          submitLabel={room ? 'Enregistrer' : 'Créer la salle'}
          followUps={isNew && !compact ? [
            { id: 'continue', label: 'Enregistrer et créer une autre salle', hint: 'Le formulaire reste ouvert, prêt pour la suivante' },
            { id: 'affect', label: 'Enregistrer et affecter à un groupe', hint: 'Ouvre directement l’affectation de cette salle' },
          ] : []}
          onFollowUp={save}
        />
      )}
    >
      <form id="room-form" onSubmit={(event) => { event.preventDefault(); save('close'); }} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-700">Code *<input required maxLength="30" value={form.code} onChange={(event) => change('code', event.target.value)} className={`${input} uppercase`} autoFocus /></label>
          <label className="block text-xs font-semibold text-slate-700">Nom / libellé *<input required maxLength="100" value={form.libelle} onChange={(event) => change('libelle', event.target.value)} className={input} /></label>
          <label className="block text-xs font-semibold text-slate-700">Capacité (places)<input type="number" min="1" max="4294967295" step="1" value={form.capacite} onChange={(event) => change('capacite', event.target.value)} className={input} placeholder="Non précisée" /></label>
          <TagSelect label="Statut" required value={form.statut} onChange={(next) => change('statut', next)} options={ROOM_STATUSES} />
          <div className="sm:col-span-2">
            <TagSelect label="Formateur attitré" required={isNew} value={String(form.id_formateur || '')} onChange={(next) => change('id_formateur', next)} options={trainers.filter((trainer) => !trainer.id_salle || String(trainer.id) === String(form.id_formateur) || Number(trainer.id_salle) === Number(room?.id)).map((trainer) => ({ value: String(trainer.id), label: `${trainer.prenom} ${trainer.nom}`, hint: trainer.matricule }))} placeholder="Aucun formateur" />
            <span className="mt-1 block text-xs text-slate-500">Seul ce formateur enseigne dans cette salle. Seuls les formateurs sans salle sont proposés.</span>
          </div>
        </div>
        {(validation || error) && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{validation || error}</p>}
        <p className="text-[11px] leading-5 text-slate-500">Une salle avec des créneaux actifs ne peut pas être rendue indisponible, et une salle référencée ne peut pas être supprimée.</p>
      </form>
    </FormDialog>
  );
}
export function AssignmentFormDialog({ assignment, data, onClose, onSave, error, preset = null, onCreateRoom = null }) {
  const [form, setForm] = useState(() => {
    if (!assignment) {
      return {
        id_annee: getCurrentSchoolYear(data.annees_scolaires)?.id || '',
        id_session: '', id_groupe: '', id_salle: '', id_formateur: '', jour_semaine: 1, statut: 1,
        ...(preset || {}),
      };
    }
    const group = data.groupes.find((item) => item.id === Number(assignment.id_groupe));
    return { ...assignment, id_session: group?.id_session || '' };
  });
  const [validation, setValidation] = useState('');
  const [busy, run] = useSubmitGuard();
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [roomError, setRoomError] = useState('');
  const sessions = data.sessions.filter((session) => !form.id_annee || session.id_annee === Number(form.id_annee));
  const groups = data.groupes.filter((group) => (
    Number(group.statut) === 1 || group.id === Number(form.id_groupe)
  ) && (form.id_session
    ? group.id_session === Number(form.id_session)
    : sessions.some((session) => session.id === group.id_session)));

  const selectedGroup = data.groupes.find((group) => group.id === Number(form.id_groupe));
  const trainerOf = (roomId) => data.formateurs.find((item) => Number(item.id_salle) === Number(roomId));
  const selectedTrainer = trainerOf(form.id_salle);
  const dayLabel = (value) => WEEKDAYS.find((day) => day.value === Number(value))?.label || '';
  // Salles déjà utilisées ce jour-là (par un autre créneau de la même année).
  const busyRooms = new Set(data.emplois_du_temps
    .filter((item) => item.id !== assignment?.id && Number(item.id_annee) === Number(form.id_annee)
      && Number(item.jour_semaine) === Number(selectedGroup?.jour_semaine) && Number(item.statut) === 1)
    .map((item) => Number(item.id_salle)));
  // Filtre automatique : salles disponibles, avec formateur attitré et libres le jour du groupe.
  const candidateRooms = data.salles.filter((room) => room.statut === 'disponible' || room.id === Number(form.id_salle));
  const eligibleRooms = candidateRooms.filter((room) => trainerOf(room.id) && (!busyRooms.has(Number(room.id)) || room.id === Number(form.id_salle)));
  const hiddenRooms = candidateRooms.length - eligibleRooms.length;
  const selectedRoom = data.salles.find((room) => room.id === Number(form.id_salle));
  const selectedSession = data.sessions.find((session) => session.id === Number(selectedGroup?.id_session));

  // Salles occupées le jour d'un groupe donné (hors créneau en cours de modification).
  const busyRoomsFor = (group) => new Set(data.emplois_du_temps
    .filter((item) => item.id !== assignment?.id && Number(item.id_annee) === Number(form.id_annee)
      && Number(item.jour_semaine) === Number(group?.jour_semaine) && Number(item.statut) === 1)
    .map((item) => Number(item.id_salle)));

  const save = (mode = 'close') => {
    if (!selectedGroup) { setValidation('Choisissez un groupe dans la liste.'); return undefined; }
    if (!selectedRoom) { setValidation('Choisissez une salle dans la liste.'); return undefined; }
    if (!selectedTrainer) { setValidation('Cette salle n’a pas de formateur attitré. Attribuez-lui d’abord un formateur (onglet Salles).'); return undefined; }
    setValidation('');
    return run(() => onSave({ ...form, id_formateur: selectedTrainer.id, jour_semaine: selectedGroup?.jour_semaine ?? form.jour_semaine }, mode));
  };
  const submit = (event) => { event.preventDefault(); save('close'); };

  const actions = (
    <SaveActions
      form="assignment-form"
      busy={busy}
      onCancel={onClose}
      submitLabel="Enregistrer l’affectation"
      followUps={assignment?.id ? [] : [{ id: 'continue', label: 'Enregistrer et affecter un autre groupe', hint: 'Garde l’année, la session et la salle' }]}
      onFollowUp={save}
    />
  );

  return (
    <FormDialog
      titleId="assignment-dialog-title"
      title={assignment?.id ? 'Modifier le créneau' : 'Affecter un groupe à une salle'}
      description="Choisissez le groupe puis la salle : le jour est celui du groupe, le formateur est celui de la salle. Un groupe peut occuper plusieurs salles le même jour."
      onClose={onClose}
      footer={actions}
    >
      <form id="assignment-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-2 sm:p-4">
          <ChipGroup
            label="Année scolaire"
            required
            value={String(form.id_annee || '')}
            onChange={(next) => setForm((current) => ({ ...current, id_annee: Number(next), id_session: '', id_groupe: '', id_salle: '' }))}
            options={data.annees_scolaires.map((year) => ({ value: String(year.id), label: year.libelle }))}
          />
          <ChipGroup
            label="Session (filtre des groupes)"
            allLabel="Toutes"
            value={String(form.id_session || '')}
            onChange={(next) => setForm((current) => ({ ...current, id_session: next ? Number(next) : '', id_groupe: '' }))}
            options={sessions.map((session) => ({ value: String(session.id), label: session.code, hint: `${session.libelle} · ${session.date_debut} → ${session.date_fin}` }))}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ListPicker
            label="1 · Groupe / classe"
            required
            value={String(form.id_groupe || '')}
            onChange={(next) => {
              const group = data.groupes.find((item) => item.id === Number(next));
              // La salle choisie est conservée tant qu'elle reste libre le jour du nouveau groupe.
              setForm((current) => ({ ...current, id_groupe: next ? Number(next) : '', id_salle: current.id_salle && !busyRoomsFor(group).has(Number(current.id_salle)) ? current.id_salle : '' }));
              setValidation('');
            }}
            options={groups.map((group) => ({
              value: String(group.id),
              label: `${group.code} · ${group.libelle}`,
              hint: `${String(group.heure_debut || '').slice(0, 5)}–${String(group.heure_fin || '').slice(0, 5)}`,
              badge: dayLabel(group.jour_semaine),
            }))}
            placeholder="Rechercher un groupe, un code, un jour…"
            emptyMessage="Aucun groupe actif pour cette année ou cette session."
          />
          <ListPicker
            label="2 · Salle (libre ce jour-là)"
            required
            value={String(form.id_salle || '')}
            onChange={(next) => { setForm((current) => ({ ...current, id_salle: next ? Number(next) : '' })); setValidation(''); }}
            disabled={!selectedGroup}
            disabledMessage="Choisissez d’abord un groupe : seules les salles libres le jour de ce groupe s’afficheront."
            options={eligibleRooms.map((room) => {
              const trainer = trainerOf(room.id);
              return {
                value: String(room.id),
                label: `${room.code} · ${room.libelle}`,
                hint: `${trainer.prenom} ${trainer.nom}`,
                badge: room.capacite ? `${room.capacite} places` : undefined,
              };
            })}
            placeholder="Rechercher une salle, un formateur…"
            emptyMessage="Aucune salle libre avec formateur attitré ce jour-là."
            action={onCreateRoom && (
              <button type="button" onClick={() => { setRoomError(''); setCreatingRoom(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-gold bg-brand-gold-light/30 px-3 py-1.5 text-xs font-bold text-brand-bordeaux transition hover:bg-brand-gold-light/60">
                <Plus className="h-3.5 w-3.5" /> Créer une salle sans quitter ce formulaire
              </button>
            )}
            note={selectedGroup && hiddenRooms > 0 ? `${hiddenRooms} salle(s) masquée(s) automatiquement : occupées ce jour-là, indisponibles ou sans formateur attitré.` : ''}
          />
        </div>

        <RecapStrip
          items={[
            { label: 'Groupe', value: selectedGroup ? `${selectedGroup.code} · ${selectedGroup.libelle}` : '' },
            { label: 'Session', value: selectedSession ? `${selectedSession.code}` : '', auto: true },
            { label: 'Salle', value: selectedRoom ? `${selectedRoom.code} · ${selectedRoom.libelle}` : '' },
            { label: 'Formateur', value: selectedTrainer ? `${selectedTrainer.prenom} ${selectedTrainer.nom}` : '', auto: true },
            { label: 'Jour', value: selectedGroup ? dayLabel(selectedGroup.jour_semaine) : '', auto: true },
          ]}
        />
        {(validation || error) && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{validation || error}</p>}
      </form>
      {creatingRoom && (
        <RoomFormDialog
          room={null}
          compact
          trainers={data.formateurs}
          error={roomError}
          onClose={() => setCreatingRoom(false)}
          onSave={async (record) => {
            const roomId = await onCreateRoom(record);
            if (roomId) {
              setForm((current) => ({ ...current, id_salle: Number(roomId) }));
              setCreatingRoom(false);
            } else {
              setRoomError('La salle n’a pas pu être créée. Corrigez le formulaire et réessayez.');
            }
          }}
        />
      )}
    </FormDialog>
  );
}

export function RoomAssignmentLabel({ assignment, data }) {
  const group = data.groupes.find((item) => item.id === assignment.id_groupe);
  const room = data.salles.find((item) => item.id === assignment.id_salle);
  const trainer = data.formateurs.find((item) => item.id === assignment.id_formateur);
  const day = WEEKDAYS.find((item) => item.value === assignment.jour_semaine)?.label;
  return <span className="inline-flex items-center gap-1.5 text-xs text-slate-600"><MapPin className="h-3.5 w-3.5 text-teal-700" />{group?.code} · {room?.code} · {day} · {trainer?.prenom} {trainer?.nom}</span>;
}