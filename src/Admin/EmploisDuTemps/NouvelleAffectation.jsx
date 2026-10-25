import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, Loader2, Save, X } from 'lucide-react';
import { JOURS, jourLabel, passageDays, passagesLabel, roomForTrainer, trainerForRoom } from './emploisHelpers';
import { planificationApi } from '../../config/apiService';
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
  years, groups, sessions, trainers, rooms, enrollments,
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
  const optionLabel = (item) => [item.code, item.libelle].filter(Boolean).join(' · ');
  const groupDays = passageDays(group);

  // Vérification serveur en direct : passages du groupe, salles dédiées, conflits datés et horaires.
  const [check, setCheck] = useState({ loading: false, result: null });
  useEffect(() => {
    if (!form.id_groupe || !form.id_salle || !form.jour_semaine) return undefined;
    let active = true;
    const timer = window.setTimeout(() => {
      setCheck({ loading: true, result: null });
      planificationApi.verifier({
        id_groupe: Number(form.id_groupe), id_salle: Number(form.id_salle), jour_semaine: Number(form.jour_semaine),
        ...(assignment?.id ? { exclude_id: assignment.id } : {}),
      })
        .then((response) => { if (active) setCheck({ loading: false, result: response.data }); })
        .catch(() => { if (active) setCheck({ loading: false, result: null }); });
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [assignment?.id, form.id_groupe, form.id_salle, form.jour_semaine]);
  const ready = Boolean(form.id_groupe && form.id_salle && form.jour_semaine);
  const serverConflicts = (ready && check.result?.conflits) || [];
  const alternatives = serverConflicts.length ? check.result?.alternatives : null;

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
    if (serverConflicts.length && Number(form.statut) === 1) {
      setFormError(serverConflicts.map((item) => item.message).join(' '));
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
              setForm((current) => ({ ...current, id_groupe: value, jour_semaine: selected ? String(passageDays(selected)[0] || '') : '' }));
              setFormError('');
            }}
            options={eligibleGroups.map((item) => {
              const itemSession = sessions.find((entry) => Number(entry.id) === Number(item.id_session));
              return { value: String(item.id), label: `${item.code} · ${item.libelle} — ${passagesLabel(item)}${itemSession ? ` · ${itemSession.libelle}` : ''}` };
            })}
            placeholder="Rechercher un groupe"
            emptyMessage="Aucun groupe disponible pour cette année."
            disabled={!form.id_annee}
          />

          <TagSelect label="Jour hebdomadaire" required disabled={!group || saving} value={String(form.jour_semaine || '')} onChange={(value) => update('jour_semaine', value)} options={group ? JOURS.map((day) => ({ value: String(day.id), label: day.label, hint: groupDays.includes(day.id) ? 'Jour de passage du groupe' : 'Nouveau passage, si la formation le permet' })) : []} placeholder="Sélectionnez d’abord un groupe" />

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

        {ready && (
          <section aria-live="polite" className={`border p-4 text-sm ${check.loading ? 'border-slate-200 bg-slate-50 text-slate-600' : serverConflicts.length ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
            {check.loading && <p className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" />Vérification des disponibilités…</p>}
            {!check.loading && check.result && !serverConflicts.length && (
              <p className="flex items-center gap-2"><CheckCircle2 size={16} />Créneau libre : {jourLabel(form.jour_semaine)} {check.result.heure_debut}–{check.result.heure_fin}{check.result.nouveau_passage ? ' (nouveau passage hebdomadaire du groupe)' : ''}.</p>
            )}
            {!check.loading && serverConflicts.length > 0 && (
              <div className="space-y-2">
                <ul className="space-y-1">{serverConflicts.map((item, index) => <li key={index} className="flex gap-2"><AlertCircle size={16} className="mt-0.5 shrink-0" />{item.message}</li>)}</ul>
                {(alternatives?.autres_salles?.length > 0 || alternatives?.autres_jours?.length > 0) && (
                  <div>
                    <p className="text-xs font-bold uppercase text-rose-800">Créneaux alternatifs libres</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {alternatives.autres_salles?.slice(0, 6).map((item) => (
                        <button key={`s${item.id_salle}`} type="button" onClick={() => setForm((current) => ({ ...current, id_salle: String(item.id_salle), id_formateur: String(item.id_formateur) }))} className="border border-rose-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 hover:bg-rose-100">Salle {item.salle_code} · {item.formateur}</button>
                      ))}
                      {alternatives.autres_jours?.map((item) => (
                        <button key={`j${item.jour_semaine}`} type="button" onClick={() => update('jour_semaine', String(item.jour_semaine))} className="border border-rose-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 hover:bg-rose-100">{jourLabel(item.jour_semaine)} {item.heure_debut}–{item.heure_fin}</button>
                      ))}
                    </div>
                  </div>
                )}
                {alternatives?.message && <p className="text-xs">{alternatives.message}</p>}
              </div>
            )}
          </section>
        )}

        {group && session && (
          <aside className="flex items-start gap-3 border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <CalendarDays size={18} className="mt-0.5 shrink-0 text-teal-800" />
            <div><strong>{session.code} · {session.libelle}</strong><p className="mt-1 text-xs text-slate-600">Année {years.find((item) => Number(item.id) === Number(session.id_annee))?.libelle || '—'} · passages : {passagesLabel(group) || '—'}{session.passages_semaine ? ` (${session.passages_semaine} prévu(s) par semaine)` : ''} · {group.capacite ? `Capacité du groupe : ${group.capacite}` : 'Capacité du groupe non limitée'}</p></div>
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
