import { useState } from 'react';
import TagSelect from '../../composant/TagSelect';
import { X } from 'lucide-react';
import { WEEKDAYS } from '../Salles/sallesHelpers';
import FormDialog from '../../composant/FormDialog';
import SaveActions from '../../composant/SaveActions';
import { useSubmitGuard } from '../../composant/useSubmitGuard';
import { ChipGroup, ListPicker, RecapStrip } from '../../composant/ListPicker';
import { getCurrentSchoolYear } from '../../utils/schoolYear';
import ModalOverlay from '../../composant/ModalOverlay';

export function TrainerFilter({ label, value, onChange, options, placeholder = 'Tous', multiple = false }) {
  return <TagSelect label={label} value={value} onChange={onChange} options={options} placeholder={placeholder} multiple={multiple} />;
}

export function TrainerMetric({ label, value, detail, tone = 'teal' }) {
  const tones = { teal: 'border-teal-200 bg-teal-50 text-teal-950', green: 'border-emerald-200 bg-emerald-50 text-emerald-950', red: 'border-rose-200 bg-rose-50 text-rose-950', amber: 'border-amber-200 bg-amber-50 text-amber-950', slate: 'border-slate-200 bg-white text-slate-900' };
  return <div className={`border p-4 ${tones[tone]}`}><p className="text-[11px] font-bold uppercase text-current/70">{label}</p><p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>{detail && <p className="mt-1 text-xs text-current/70">{detail}</p>}</div>;
}

export function TrainerStatus({ active }) {
  return <span className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[10px] font-bold ${active ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-100 text-slate-700'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{active ? 'Actif' : 'Inactif'}</span>;
}

export function TrainerDialog({ trainer, rooms = [], trainers = [], onClose, onSave, error }) {
  const [form, setForm] = useState(() => trainer ? { ...trainer, id_salle: trainer.id_salle || '', mot_de_passe_temporaire: '' } : {
    matricule: '', nom: '', prenom: '', telephone: '', email: '', id_salle: '', actif: 1,
    mot_de_passe_temporaire: '',
  });
  const [validation, setValidation] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (!form.id && form.mot_de_passe_temporaire.length < 6) {
      setValidation('Le mot de passe initial doit contenir au moins 6 caractères.');
      return;
    }
    if (!trainer && form.mot_de_passe_temporaire.length > 255) {
      setValidation('Le mot de passe ne peut pas dépasser 255 caractères.');
      return;
    }
    onSave(form);
  };

  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return <ModalOverlay onClose={() => { onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="trainer-form-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto border border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-200 p-5"><div><h2 id="trainer-form-title" className="text-base font-bold text-slate-900">{trainer ? 'Modifier le formateur' : 'Créer le compte formateur'}</h2><p className="mt-1 text-xs text-slate-500">Les informations saisies sont enregistrées dans le profil formateur.</p></div><button type="button" onClick={onClose} aria-label="Fermer" className="p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><form onSubmit={submit} className="space-y-4 p-5"><div className="grid gap-4 sm:grid-cols-2">
    <label className="block text-xs font-semibold text-slate-700">Matricule *<input required maxLength="50" value={form.matricule} onChange={(event) => change('matricule', event.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm uppercase" /></label>
    <TagSelect label="Statut" required value={form.actif ? '1' : '0'} onChange={(next) => change('actif', Number(next))} options={[{ value: '1', label: 'Actif' }, { value: '0', label: 'Inactif' }]} />
    <label className="block text-xs font-semibold text-slate-700">Nom *<input required maxLength="100" value={form.nom} onChange={(event) => change('nom', event.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm" /></label>
    <label className="block text-xs font-semibold text-slate-700">Prénom *<input required maxLength="100" value={form.prenom} onChange={(event) => change('prenom', event.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm" /></label>
    <label className="block text-xs font-semibold text-slate-700">Téléphone<input maxLength="30" value={form.telephone || ''} onChange={(event) => change('telephone', event.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm" /></label>
    <label className="block text-xs font-semibold text-slate-700">E-mail<input type="email" maxLength="180" value={form.email || ''} onChange={(event) => change('email', event.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm" /></label>
    <div className="sm:col-span-2"><TagSelect label="Salle attitrée (toute la semaine)" value={String(form.id_salle || '')} onChange={(next) => change('id_salle', next ? Number(next) : '')} placeholder="Aucune salle" options={rooms.filter((room) => {
      const occupant = trainers.find((item) => Number(item.id_salle) === Number(room.id));
      const isFree = !occupant || Number(occupant.id) === Number(trainer?.id);
      return isFree && (room.statut === 'disponible' || Number(room.id) === Number(form.id_salle));
    }).map((room) => ({ value: String(room.id), label: `${room.code} · ${room.libelle}`, hint: room.capacite ? `${room.capacite} places` : undefined }))} emptyMessage="Aucune salle libre." /><span className="mt-1 block text-[10px] font-normal text-slate-500">Un formateur appartient à une seule salle et y vient tous les jours. Les auditeurs de cette salle changent selon le jour.</span></div>
    <label className="block text-xs font-semibold text-slate-700 sm:col-span-2">{trainer ? 'Nouveau mot de passe (facultatif)' : 'Mot de passe initial *'}<input required={!trainer} type="password" minLength={!trainer ? '6' : undefined} maxLength="255" autoComplete="new-password" value={form.mot_de_passe_temporaire} onChange={(event) => change('mot_de_passe_temporaire', event.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm" /><span className="mt-1 block text-[10px] font-normal text-slate-500">{trainer ? 'Laissez vide pour conserver le mot de passe actuel.' : 'Le mot de passe initial est obligatoire.'}</span></label>
  </div>{(validation || error) && <p role="alert" className="text-xs font-semibold text-rose-700">{validation || error}</p>}<p className="text-[10px] leading-5 text-slate-500">Un formateur = une salle. Les groupes peuvent occuper plusieurs salles ; les auditeurs y sont répartis automatiquement.</p><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700">Annuler</button><button type="submit" className="bg-teal-800 px-4 py-2 text-xs font-semibold text-white">{trainer ? 'Enregistrer' : 'Créer le compte'}</button></div></form></section></ModalOverlay>;
}

export function ScheduleDialog({ schedule, data, onClose, onSave, error, preset = null }) {
  const year = getCurrentSchoolYear(data.annees_scolaires);
  const [form, setForm] = useState(() => schedule ? {
    ...schedule,
  } : {
    id_annee: year?.id || '', id_groupe: '', id_formateur: '', id_salle: '', jour_semaine: 1,
    statut: 1,
    ...(preset || {}),
  });
  const [busy, run] = useSubmitGuard();
  const [validation, setValidation] = useState('');
  const currentGroup = data.groupes.find((group) => group.id === Number(form.id_groupe));
  const sessions = data.sessions.filter((session) => session.id_annee === Number(form.id_annee));
  const [sessionId, setSessionId] = useState('');
  const groups = data.groupes.filter((group) => (
    Number(group.statut) === 1 || group.id === Number(form.id_groupe)
  ) && (sessionId ? group.id_session === Number(sessionId) : sessions.some((session) => session.id === group.id_session)));
  const activeTrainers = data.formateurs.filter((trainer) => Number(trainer.actif) === 1 || Number(trainer.id) === Number(form.id_formateur));
  const availableRooms = data.salles.filter((room) => room.statut === 'disponible' || Number(room.id) === Number(form.id_salle));
  const selectedRoom = data.salles.find((room) => room.id === Number(form.id_salle));
  const selectedTrainer = data.formateurs.find((trainer) => trainer.id === Number(form.id_formateur));
  const dayLabel = WEEKDAYS.find((day) => day.value === Number(currentGroup?.jour_semaine))?.label || '';
  // Filtre automatique : une salle choisie réduit la liste des formateurs à celui de la salle, et inversement.
  const trainerOptions = (form.id_salle
    ? activeTrainers.filter((trainer) => !trainer.id_salle || Number(trainer.id_salle) === Number(form.id_salle) || Number(trainer.id) === Number(form.id_formateur))
    : activeTrainers);
  const roomOptions = (form.id_formateur && selectedTrainer?.id_salle
    ? availableRooms.filter((room) => Number(room.id) === Number(selectedTrainer.id_salle) || Number(room.id) === Number(form.id_salle))
    : availableRooms);

  const save = (mode = 'close') => {
    if (!form.id_annee || !form.id_groupe || !form.id_formateur || !form.id_salle || !currentGroup) {
      setValidation('Sélectionnez une année, un groupe, une salle et un formateur.');
      return undefined;
    }
    setValidation('');
    return run(() => onSave({
      id_annee: Number(form.id_annee),
      id_groupe: Number(form.id_groupe),
      id_formateur: Number(form.id_formateur),
      id_salle: Number(form.id_salle),
      jour_semaine: Number(currentGroup.jour_semaine),
      statut: Number(form.statut ?? 1),
    }, mode));
  };
  const submit = (event) => { event.preventDefault(); save('close'); };

  const actions = (
    <SaveActions
      form="schedule-form"
      busy={busy}
      onCancel={onClose}
      submitLabel="Enregistrer la séance"
      followUps={schedule ? [] : [{ id: 'continue', label: 'Enregistrer et ajouter une autre séance', hint: 'Garde l’année, la salle et le formateur' }]}
      onFollowUp={save}
    />
  );

  return (
    <FormDialog
      titleId="schedule-dialog-title"
      title={schedule ? 'Modifier une séance' : 'Nouvelle séance'}
      description="Affectez un groupe à une salle et un formateur. Le formateur de la salle y reste tous les jours ; un groupe peut occuper plusieurs salles."
      onClose={onClose}
      footer={actions}
    >
      <form id="schedule-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-2 sm:p-4">
          <ChipGroup
            label="Année scolaire"
            required
            value={String(form.id_annee || '')}
            onChange={(next) => { setSessionId(''); setForm((current) => ({ ...current, id_annee: Number(next), id_groupe: '', jour_semaine: '' })); }}
            options={data.annees_scolaires.map((item) => ({ value: String(item.id), label: item.libelle }))}
          />
          <ChipGroup
            label="Session (filtre des groupes)"
            allLabel="Toutes"
            value={sessionId}
            onChange={(next) => { setSessionId(next); setForm((current) => ({ ...current, id_groupe: '', jour_semaine: '' })); }}
            options={sessions.map((session) => ({ value: String(session.id), label: session.code, hint: session.libelle }))}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ListPicker
            label="1 · Groupe / classe"
            required
            value={String(form.id_groupe || '')}
            onChange={(value) => {
              const group = groups.find((item) => item.id === Number(value));
              setForm((current) => ({ ...current, id_groupe: value, jour_semaine: group?.jour_semaine || '' }));
              setValidation('');
            }}
            options={groups.map((group) => ({
              value: String(group.id),
              label: `${group.code} · ${group.libelle}`,
              badge: WEEKDAYS.find((day) => day.value === Number(group.jour_semaine))?.label,
            }))}
            placeholder="Rechercher un groupe…"
            emptyMessage="Aucun groupe disponible."
          />
          <ListPicker
            label="2 · Salle"
            required
            value={String(form.id_salle || '')}
            onChange={(value) => {
              const trainer = data.formateurs.find((item) => Number(item.id_salle) === Number(value));
              setForm((current) => ({ ...current, id_salle: value, id_formateur: trainer ? trainer.id : current.id_formateur }));
              setValidation('');
            }}
            options={roomOptions.map((room) => ({
              value: String(room.id),
              label: `${room.code} · ${room.libelle}`,
              badge: room.capacite ? `${room.capacite} places` : undefined,
            }))}
            placeholder="Rechercher une salle…"
            emptyMessage="Aucune salle disponible."
            note={roomOptions.length < availableRooms.length ? 'Liste réduite à la salle du formateur choisi.' : ''}
          />
          <ListPicker
            label="3 · Formateur"
            required
            value={String(form.id_formateur || '')}
            onChange={(value) => {
              const trainer = activeTrainers.find((item) => Number(item.id) === Number(value));
              setForm((current) => ({ ...current, id_formateur: value, id_salle: trainer?.id_salle || current.id_salle }));
              setValidation('');
            }}
            options={trainerOptions.map((trainer) => ({
              value: String(trainer.id),
              label: `${trainer.prenom} ${trainer.nom}`,
              hint: trainer.matricule,
              badge: trainer.salle_code || undefined,
            }))}
            placeholder="Rechercher un formateur…"
            emptyMessage="Aucun formateur disponible."
            note={trainerOptions.length < activeTrainers.length ? 'Liste réduite aux formateurs compatibles avec la salle choisie.' : ''}
          />
        </div>

        <RecapStrip
          items={[
            { label: 'Groupe', value: currentGroup ? `${currentGroup.code} · ${currentGroup.libelle}` : '' },
            { label: 'Salle', value: selectedRoom ? `${selectedRoom.code} · ${selectedRoom.libelle}` : '' },
            { label: 'Formateur', value: selectedTrainer ? `${selectedTrainer.prenom} ${selectedTrainer.nom}` : '' },
            { label: 'Jour hebdomadaire', value: dayLabel, auto: true },
          ]}
        />

        {(validation || error) && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{validation || error}</p>}
        <div className="border-l-4 border-brand-yellow bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">La base ne stocke pas les heures. L’API vérifie les conflits d’affectation et que le jour correspond au groupe.</div>
      </form>
    </FormDialog>
  );
}
