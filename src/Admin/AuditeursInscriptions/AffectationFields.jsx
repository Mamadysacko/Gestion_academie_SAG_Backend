import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays } from 'lucide-react';
import TagSelect from '../../composant/TagSelect';
import { jourLabel } from '../EmploisDuTemps/emploisHelpers';
import { eligibleSessions, formatShortDate, groupOptions, groupRooms, nextCourseDates, roomOptions, sessionOptions } from './affectationHelpers';

/**
 * Choix en cascade : Session → Groupe → (jours de cours automatiques) → Salle.
 * value = { id_session, id_groupe, id_emploi_du_temps } (chaînes).
 */
export default function AffectationFields({ data, yearId, value, onChange, excludeInscriptionId = null, keepSessionId = null }) {
  const sessions = eligibleSessions(data, yearId, keepSessionId);
  const session = data.sessions.find((item) => String(item.id) === String(value.id_session));
  const groups = data.groupes.filter((group) => (
    String(group.id_session) === String(value.id_session)
    && (Number(group.statut) === 1 || String(group.id) === String(value.id_groupe))
  ));
  const group = data.groupes.find((item) => String(item.id) === String(value.id_groupe));
  const rooms = group ? groupRooms(data, group.id, excludeInscriptionId) : [];
  const dates = group ? nextCourseDates(group.jour_semaine, session) : [];

  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <TagSelect label="Session" required value={String(value.id_session || '')} onChange={(next) => set({ id_session: next, id_groupe: '', id_emploi_du_temps: '' })} placeholder="Sélectionner une session" options={sessionOptions(sessions)} />
          {!sessions.length && <span className="mt-1 block text-xs text-amber-700">Aucune session ouverte ou en cours pour cette année.</span>}
        </div>
        <TagSelect label="Groupe" required disabled={!value.id_session} value={String(value.id_groupe || '')} onChange={(next) => {
          const available = groupRooms(data, next, excludeInscriptionId).filter((room) => !room.full);
          set({ id_groupe: next, id_emploi_du_temps: available.length === 1 ? String(available[0].id) : '' });
        }} placeholder="Sélectionner un groupe" options={groupOptions(groups, jourLabel)} />
      </div>

      <AnimatePresence initial={false}>
        {group && (
          <motion.div key="jours" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="flex items-start gap-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
              <div>
                <p className="font-semibold">Jour de présence : tous les {jourLabel(group.jour_semaine).toLocaleLowerCase('fr')}s</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-sky-800">{dates.length ? <>Prochaines séances : {dates.map((iso) => <span key={iso} className="rounded-md bg-white px-1.5 py-0.5 font-semibold ring-1 ring-sky-200">{formatShortDate(iso)}</span>)}</> : 'Aucune séance restante dans la période de la session.'}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {group && (
        <div>
          <TagSelect label="Salle d’affectation" required value={String(value.id_emploi_du_temps || '')} onChange={(next) => set({ id_emploi_du_temps: next })} placeholder="Sélectionner la salle de l’auditeur" options={roomOptions(rooms, value.id_emploi_du_temps)} emptyMessage="Aucune salle avec des places libres." />
          {!rooms.length && <p className="mt-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800">Ce groupe n’a encore aucune salle. Affectez-lui des salles dans « Gestion des salles → Affectations ».</p>}
          {rooms.length > 0 && rooms.every((room) => room.full) && <p className="mt-2 rounded-md bg-rose-50 p-3 text-xs text-rose-800">Toutes les salles de ce groupe sont pleines.</p>}
        </div>
      )}
    </div>
  );
}
