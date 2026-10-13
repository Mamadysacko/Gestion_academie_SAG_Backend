import { useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, Save, X } from 'lucide-react';
import { checkConflits, jourLabel, roomForTrainer, trainerForRoom } from './emploisHelpers';
import SearchableSelect from '../../composant/SearchableSelect';
import TagSelect from '../../composant/TagSelect';

const initialForm = (yearId) => ({
  id_annee: yearId || '',
  id_groupe: '',
  id_salle: '',
  id_formateur: '',
  jour_semaine: '',
  statut: '1',
});

export default function NouvelleAffectation({
  years, groups, sessions, trainers, rooms, schedules, enrollments,
  defaultYearId, assignment, saving, onCancel, onSubmit,
}) {
  const [form, setForm] = useState(() => assignment ? {
    id_annee: String(assignment.id_annee),
    id_groupe: String(assignment.id_groupe),
    id_salle: String(assignment.id_salle),
    id_formateur: String(assignment.id_formateur),
    jour_semaine: String(assignment.jour_semaine),
    statut: String(assignment.statut),
  } : initialForm(defaultYearId));
  const [formError, setFormError] = useState('');

  const eligibleGroups = useMemo(() => groups.filter((group) => {
    const session = sessions.find((item) => Number(item.id) === Number(group.id_session));
    const isEditGroup = Number(group.id) === Number(assignment?.id_groupe);
    return session
      && Number(session.id_annee) === Number(form.id_annee)
      && (['planifiee', 'ouverte', 'en_cours'].includes(session.statut) || isEditGroup)
      && (Number(group.statut) === 1 || isEditGroup);
  }), [assignment, form.id_annee, groups, sessions]);

  const group = groups.find((item) => Number(item.id) === Number(form.id_groupe));
  const session = sessions.find((item) => Number(item.id) === Number(group?.id_session));
  const roomTrainer = form.id_salle ? trainerForRoom(form.id_salle, trainers) : null;
  // Une salle = un formateur : s'il existe, il est imposé ; sinon on propose les formateurs sans salle.
  const eligibleTrainers = trainers.filter((trainer) => (Number(trainer.actif) === 1 || Number(trainer.id) === Number(assignment?.id_formateur))
    && (roomTrainer ? Number(trainer.id) === Number(roomTrainer.id) : !trainer.id_salle));
  const eligibleRooms = rooms.filter((room) => room.statut === 'disponible' || Number(room.id) === Number(assignment?.id_salle));
  const activeEnrollmentCount = Math.max(Number(assignment?.inscrits_actifs) || 0, enrollments.filter((item) => (
    item.statut === 'active'
    && Number(item.id_emploi_du_temps) === Number(assignment?.id)
  )).length);
  const localConflicts = checkConflits(form, schedules, assignment?.id);
  const optionLabel = (item) => [item.code, item.libelle].filter(Boolean).join(' · ');

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!form.id_annee || !form.id_groupe || !form.id_salle || !form.jour_semaine) {
      setFormError('Complétez l’année, le groupe et la salle. Le formateur est celui attitré à la salle.');
      return;
    }
    if (!form.id_formateur) {
      setFormError('Cette salle n’a pas encore de formateur attitré. Choisissez le formateur qui y restera toute la semaine.');
      return;
    }
    if (Number(group?.jour_semaine) !== Number(form.jour_semaine)) {
      setFormError('Le jour choisi doit correspondre au jour hebdomadaire configuré pour ce groupe.');
      return;
    }
    if (localConflicts.length && Number(form.statut) === 1) {
      setFormError(localConflicts.join(' '));
      return;
    }
    await onSubmit({
      id_annee: Number(form.id_annee),
      id_groupe: Number(form.id_groupe),
      id_salle: Number(form.id_salle),
      id_formateur: Number(form.id_formateur),
      jour_semaine: Number(form.jour_semaine),
      statut: Number(form.statut),
    }, assignment?.id);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-teal-700">{assignment ? 'Mise à jour' : 'Planification'}</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">{assignment ? 'Modifier une affectation' : 'Créer une affectation'}</h2>
        <p className="mt-1 text-sm text-slate-600">Un formateur reste dans une seule salle tous les jours. Un même groupe peut occuper plusieurs salles le même jour ; chaque auditeur choisit sa salle à l’inscription.</p>
      </header>

      {formError && <div role="alert" className="flex gap-2 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle size={18} className="shrink-0" />{formError}</div>}
      {assignment && activeEnrollmentCount > 0 && (
        <div className="border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          {activeEnrollmentCount} inscription(s) active(s) sont rattachées à ce créneau. Une suppression définitive pourrait être bloquée par les clés étrangères; privilégiez la désactivation.
        </div>
      )}

      <form onSubmit={submit} className="space-y-6 border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="grid gap-5 md:grid-cols-2">
          <TagSelect label="Année scolaire" required value={String(form.id_annee || '')} onChange={(value) => { setForm((current) => ({ ...current, id_annee: value, id_groupe: '', jour_semaine: '' })); setFormError(''); }} options={years.map((item) => ({ value: String(item.id), label: item.libelle, hint: Number(item.statut) === 1 ? 'Année active' : undefined }))} placeholder="Choisir une année" />

          <SearchableSelect
            label="Groupe *"
            value={form.id_groupe}
            onChange={(value) => {
              const selected = groups.find((item) => Number(item.id) === Number(value));
              setForm((current) => ({ ...current, id_groupe: value, jour_semaine: selected ? String(selected.jour_semaine) : '' }));
              setFormError('');
            }}
            options={eligibleGroups.map((item) => {
              const itemSession = sessions.find((entry) => Number(entry.id) === Number(item.id_session));
              return { value: String(item.id), label: `${item.code} · ${item.libelle} — ${jourLabel(item.jour_semaine)}${itemSession ? ` · ${itemSession.libelle}` : ''}` };
            })}
            placeholder="Rechercher un groupe"
            emptyMessage="Aucun groupe disponible pour cette année."
            disabled={!form.id_annee}
          />

          <TagSelect label="Jour hebdomadaire" required disabled={!group || saving} value={String(form.jour_semaine || '')} onChange={(value) => update('jour_semaine', value)} options={group ? [{ value: String(group.jour_semaine), label: jourLabel(group.jour_semaine), hint: 'Jour configuré pour le groupe' }] : []} placeholder="Sélectionnez d’abord un groupe" />

          <SearchableSelect
            label="Salle *"
            value={form.id_salle}
            onChange={(value) => {
              const trainer = trainerForRoom(value, trainers);
              setForm((current) => ({
                ...current,
                id_salle: value,
                id_formateur: trainer ? String(trainer.id) : '',
              }));
              setFormError('');
            }}
            options={eligibleRooms.map((item) => {
              const trainer = trainerForRoom(item.id, trainers);
              return {
                value: String(item.id),
                label: `${optionLabel(item)}${item.capacite ? ` · ${item.capacite} places` : ''}${trainer ? ` · ${trainer.prenom} ${trainer.nom}` : ' · sans formateur'}${item.statut !== 'disponible' ? ' (indisponible)' : ''}`,
              };
            })}
            placeholder="Rechercher une salle"
            emptyMessage="Aucune salle disponible."
          />

          <SearchableSelect
            label="Formateur *"
            value={form.id_formateur}
            onChange={(value) => {
              const room = roomForTrainer(value, trainers, rooms);
              setForm((current) => ({
                ...current,
                id_formateur: value,
                id_salle: room ? String(room.id) : current.id_salle,
              }));
              setFormError('');
            }}
            options={eligibleTrainers.map((item) => ({
              value: String(item.id),
              label: `${item.prenom} ${item.nom} · ${item.matricule}${item.salle_code ? ` · ${item.salle_code}` : ' · salle non attribuée'}${Number(item.actif) !== 1 ? ' (inactif)' : ''}`,
            }))}
            placeholder="Rechercher un formateur"
            emptyMessage="Aucun formateur sans salle disponible."
            disabled={Boolean(roomTrainer)}
          />

          <TagSelect label="Statut du créneau" required value={form.statut} onChange={(value) => update('statut', value)} options={[{ value: '1', label: 'Actif' }, { value: '0', label: 'Inactif' }]} />
        </div>

        {group && session && (
          <aside className="flex items-start gap-3 border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <CalendarDays size={18} className="mt-0.5 shrink-0 text-teal-800" />
            <div><strong>{session.code} · {session.libelle}</strong><p className="mt-1 text-xs text-slate-600">Année {years.find((item) => Number(item.id) === Number(session.id_annee))?.libelle || '—'} · {jourLabel(group.jour_semaine)} · {group.capacite ? `Capacité du groupe : ${group.capacite}` : 'Capacité du groupe non limitée'}</p></div>
          </aside>
        )}

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={saving} className="inline-flex items-center justify-center gap-2 border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><X size={16} />Annuler</button>
          <button type="submit" disabled={saving || !years.length || !eligibleGroups.length || !eligibleTrainers.length || !eligibleRooms.length} className="inline-flex items-center justify-center gap-2 bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50"><Save size={16} />{saving ? 'Enregistrement…' : assignment ? 'Enregistrer les modifications' : 'Créer l’affectation'}</button>
        </footer>
      </form>
    </div>
  );
}
