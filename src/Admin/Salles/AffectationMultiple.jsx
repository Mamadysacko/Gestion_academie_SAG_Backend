import { useMemo, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import FormDialog from '../../composant/FormDialog';
import { ChipGroup, ListPicker } from '../../composant/ListPicker';
import SaveActions from '../../composant/SaveActions';
import { useSubmitGuard } from '../../composant/useSubmitGuard';
import { getCurrentSchoolYear } from '../../utils/schoolYear';
import { RoomFormDialog } from './SallesComponents';
import { WEEKDAYS, planAssignments } from './sallesHelpers';

const dayLabel = (value) => WEEKDAYS.find((day) => day.value === Number(value))?.label || '';

/**
 * Affecter plusieurs groupes à plusieurs salles en une seule fois.
 * On coche des groupes et des salles : un tableau propose chaque couple avec sa disponibilité
 * (salle libre le jour du groupe, pas de doublon, pas de conflit dans la sélection). Les couples
 * impossibles sont bloqués avec leur motif, les autres peuvent être décochés avant l'enregistrement.
 */
export default function MultiAssignmentDialog({ data, onClose, onSaveMany, error, preset = null, onCreateRoom = null }) {
  const [yearId, setYearId] = useState(String(preset?.id_annee || getCurrentSchoolYear(data.annees_scolaires)?.id || ''));
  const [sessionId, setSessionId] = useState(String(preset?.id_session || ''));
  const [groupIds, setGroupIds] = useState([]);
  const [roomIds, setRoomIds] = useState(preset?.id_salle ? [String(preset.id_salle)] : []);
  const [excluded, setExcluded] = useState(() => new Set());
  const [validation, setValidation] = useState('');
  const [busy, run] = useSubmitGuard();
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [roomError, setRoomError] = useState('');

  const trainerOf = (roomId) => data.formateurs.find((item) => Number(item.id_salle) === Number(roomId));
  const sessions = data.sessions.filter((session) => !yearId || session.id_annee === Number(yearId));
  const groups = data.groupes.filter((group) => Number(group.statut) === 1 && (sessionId
    ? group.id_session === Number(sessionId)
    : sessions.some((session) => session.id === group.id_session)));
  // Salles pouvant recevoir un groupe : disponibles et avec leur formateur attitré.
  const candidateRooms = data.salles.filter((room) => room.statut === 'disponible' && trainerOf(room.id));
  const hiddenRooms = data.salles.length - candidateRooms.length;

  const selectedGroups = groupIds.map((id) => data.groupes.find((group) => group.id === Number(id))).filter(Boolean);
  const selectedRooms = roomIds.map((id) => data.salles.find((room) => room.id === Number(id))).filter(Boolean);
  const plan = useMemo(
    () => planAssignments({ groups: selectedGroups, rooms: selectedRooms, schedules: data.emplois_du_temps, yearId, excluded }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groupIds, roomIds, data.emplois_du_temps, data.groupes, data.salles, yearId, excluded],
  );
  const valid = plan.filter((pair) => pair.ok);

  // Jours (parmi ceux des groupes cochés) où une salle est déjà prise.
  const busyDaysOf = (room) => {
    const days = new Set(selectedGroups.map((group) => Number(group.jour_semaine)));
    return [...new Set(data.emplois_du_temps
      .filter((item) => Number(item.statut) === 1 && Number(item.id_annee) === Number(yearId) && Number(item.id_salle) === Number(room.id) && days.has(Number(item.jour_semaine)))
      .map((item) => Number(item.jour_semaine)))];
  };

  const toggleExcluded = (key) => setExcluded((current) => { const copy = new Set(current); if (copy.has(key)) copy.delete(key); else copy.add(key); return copy; });

  const save = (mode = 'close') => {
    if (!selectedGroups.length) { setValidation('Cochez au moins un groupe.'); return undefined; }
    if (!selectedRooms.length) { setValidation('Cochez au moins une salle.'); return undefined; }
    if (!valid.length) { setValidation('Aucune affectation possible avec cette sélection : consultez les motifs dans le tableau.'); return undefined; }
    setValidation('');
    const records = valid.map((pair) => ({
      id_annee: Number(yearId),
      id_session: sessionId,
      id_groupe: pair.group.id,
      id_salle: pair.room.id,
      id_formateur: trainerOf(pair.room.id).id,
      jour_semaine: pair.day,
      statut: 1,
    }));
    return run(() => onSaveMany(records, mode));
  };
  const submit = (event) => { event.preventDefault(); save('close'); };

  return (
    <FormDialog
      titleId="assignment-dialog-title"
      title="Affecter des groupes à des salles"
      description="Cochez un ou plusieurs groupes et une ou plusieurs salles : chaque couple est contrôlé (salle libre le jour du groupe, pas de doublon) avant l’enregistrement. Le jour est celui du groupe, le formateur celui de la salle."
      onClose={onClose}
      footer={(
        <SaveActions
          form="assignment-form"
          busy={busy}
          onCancel={onClose}
          submitLabel={valid.length > 1 ? `Enregistrer ${valid.length} affectations` : 'Enregistrer l’affectation'}
          followUps={[{ id: 'continue', label: 'Enregistrer et affecter d’autres groupes', hint: 'Garde l’année, la session et les salles cochées' }]}
          onFollowUp={save}
        />
      )}
    >
      <form id="assignment-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-2 sm:p-4">
          <ChipGroup
            label="Année scolaire"
            required
            value={yearId}
            onChange={(next) => { setYearId(next); setSessionId(''); setGroupIds([]); setExcluded(new Set()); }}
            options={data.annees_scolaires.map((year) => ({ value: String(year.id), label: year.libelle }))}
          />
          <ChipGroup
            label="Session (filtre des groupes)"
            allLabel="Toutes"
            value={sessionId}
            onChange={(next) => { setSessionId(next); setGroupIds([]); setExcluded(new Set()); }}
            options={sessions.map((session) => ({ value: String(session.id), label: session.code, hint: `${session.libelle} · ${session.date_debut} → ${session.date_fin}` }))}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ListPicker
            multiple
            label="1 · Groupes / classes"
            value={groupIds}
            onChange={(next) => { setGroupIds(next); setValidation(''); }}
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
            multiple
            label="2 · Salles"
            value={roomIds}
            onChange={(next) => { setRoomIds(next); setValidation(''); }}
            options={candidateRooms.map((room) => {
              const trainer = trainerOf(room.id);
              const busyDays = busyDaysOf(room);
              return {
                value: String(room.id),
                label: `${room.code} · ${room.libelle}`,
                hint: `${trainer.prenom} ${trainer.nom}${busyDays.length ? ` · occupée : ${busyDays.map(dayLabel).join(', ')}` : ''}`,
                badge: room.capacite ? `${room.capacite} places` : undefined,
              };
            })}
            placeholder="Rechercher une salle, un formateur…"
            emptyMessage="Aucune salle disponible avec formateur attitré."
            action={onCreateRoom && (
              <button type="button" onClick={() => { setRoomError(''); setCreatingRoom(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-gold bg-brand-gold-light/30 px-3 py-1.5 text-xs font-bold text-brand-bordeaux transition hover:bg-brand-gold-light/60">
                <Plus className="h-3.5 w-3.5" /> Créer une salle sans quitter ce formulaire
              </button>
            )}
            note={hiddenRooms > 0 ? `${hiddenRooms} salle(s) masquée(s) : indisponibles ou sans formateur attitré.` : ''}
          />
        </div>

        <section aria-label="Affectations qui seront créées" className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-600">3 · Vérification des disponibilités</h3>
            <p className="text-xs text-slate-600">{selectedGroups.length} groupe(s) × {selectedRooms.length} salle(s) → <strong className="text-emerald-800">{valid.length} possible(s)</strong>{plan.length - valid.length > 0 && <span className="text-slate-500"> · {plan.length - valid.length} écartée(s)</span>}</p>
          </div>
          {plan.length ? (
            <div className="max-h-72 overflow-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="sticky top-0 bg-white text-[10px] uppercase text-slate-500"><tr><th className="w-10 px-3 py-2"><span className="sr-only">Inclure</span></th><th className="px-3 py-2">Groupe</th><th className="px-3 py-2">Jour</th><th className="px-3 py-2">Salle</th><th className="px-3 py-2">Formateur</th><th className="px-3 py-2">Disponibilité</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {plan.map((pair) => {
                    const blocked = !pair.ok && !pair.excluded;
                    const trainer = trainerOf(pair.room.id);
                    return (
                      <tr key={pair.key} className={blocked ? 'bg-rose-50/60 text-slate-500' : pair.excluded ? 'text-slate-400' : ''}>
                        <td className="px-3 py-2"><input type="checkbox" checked={pair.ok} disabled={blocked} onChange={() => toggleExcluded(pair.key)} aria-label={`Inclure ${pair.group.code} dans ${pair.room.code}`} className="h-4 w-4" /></td>
                        <td className="px-3 py-2 font-semibold">{pair.group.code} · {pair.group.libelle}</td>
                        <td className="px-3 py-2">{dayLabel(pair.day)}</td>
                        <td className="px-3 py-2 font-mono font-bold">{pair.room.code}</td>
                        <td className="px-3 py-2">{trainer?.prenom} {trainer?.nom}</td>
                        <td className="px-3 py-2">{pair.ok
                          ? <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><Check className="h-3.5 w-3.5" />Salle libre</span>
                          : <span className={`inline-flex items-center gap-1 font-semibold ${pair.excluded ? 'text-slate-500' : 'text-rose-700'}`}><X className="h-3.5 w-3.5" />{pair.reason}</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="px-3 py-6 text-center text-xs text-slate-500">Cochez des groupes et des salles pour voir les affectations possibles.</p>}
        </section>

        {(validation || error) && <p role="alert" className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{validation || error}</p>}
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
              setRoomIds((current) => [...current, String(roomId)]);
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
