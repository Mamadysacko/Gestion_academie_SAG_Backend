import { useMemo, useState } from 'react';
import { CalendarDays, Plus, TriangleAlert } from 'lucide-react';
import { WEEKDAYS } from '../Salles/sallesHelpers';
import { getTrainerConflicts } from './formateursHelpers';
import { TrainerFilter, TrainerMetric, TrainerStatus } from './FormateursComponents';
import { getCurrentSchoolYear } from '../../utils/schoolYear';

const VIEW_OPTIONS = [
  { value: 'global', label: 'Établissement' },
  { value: 'formateur', label: 'Formateur' },
  { value: 'groupe', label: 'Groupe / classe' },
  { value: 'salle', label: 'Salle' },
];

export default function EmploiDuTemps({
  data, schedules, trainers, groups, rooms, onNew, onEdit, onDelete, selectedTrainer = '',
  canCreate = false, canUpdate = false, canDelete = false,
}) {
  const [mode, setMode] = useState(selectedTrainer ? 'formateur' : 'global');
  const [selectedId, setSelectedId] = useState(selectedTrainer);
  const [yearId, setYearId] = useState('');
  const selectedYearId = yearId && data.annees_scolaires.some((year) => String(year.id) === yearId)
    ? yearId
    : String(getCurrentSchoolYear(data.annees_scolaires)?.id || '');
  const [day, setDay] = useState('');

  const annualSchedules = schedules.filter((schedule) => String(schedule.id_annee) === selectedYearId && Number(schedule.statut) === 1);
  const conflicts = useMemo(() => getTrainerConflicts(data, annualSchedules), [annualSchedules, data]);
  const visible = annualSchedules.filter((schedule) => (
    (!day || String(schedule.jour_semaine) === day)
    && (!selectedId
      || (mode === 'formateur' && String(schedule.id_formateur) === selectedId)
      || (mode === 'groupe' && String(schedule.id_groupe) === selectedId)
      || (mode === 'salle' && String(schedule.id_salle) === selectedId)
        || mode === 'global')
      )).sort((first, second) => first.jour_semaine - second.jour_semaine || first.id - second.id);

  const selectionOptions = mode === 'formateur'
    ? trainers.map((item) => ({ value: String(item.id), label: `${item.prenom} ${item.nom}` }))
    : mode === 'groupe'
      ? groups.map((item) => ({ value: String(item.id), label: item.libelle }))
      : mode === 'salle'
        ? rooms.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.libelle}` }))
        : [];

  const visibleTrainerCount = new Set(visible.map((schedule) => schedule.id_formateur)).size;
  const visibleGroupCount = new Set(visible.map((schedule) => schedule.id_groupe)).size;

  return <div className="space-y-4">
    <section className="flex flex-wrap items-end gap-3 border border-slate-200 bg-white p-4"><TrainerFilter label="Vue planning" value={mode} onChange={(value) => { setMode(value); setSelectedId(''); }} options={VIEW_OPTIONS} placeholder="Choisir" /><TrainerFilter label="Année scolaire" value={selectedYearId} onChange={setYearId} options={data.annees_scolaires.map((year) => ({ value: String(year.id), label: year.libelle }))} /><TrainerFilter label="Jour" value={day} onChange={setDay} options={WEEKDAYS.map((item) => ({ value: String(item.value), label: item.label }))} />{mode !== 'global' && <TrainerFilter label={mode === 'formateur' ? 'Formateur' : mode === 'groupe' ? 'Groupe' : 'Salle'} value={selectedId} onChange={setSelectedId} options={selectionOptions} />}{canCreate && <button type="button" onClick={onNew} className="inline-flex items-center gap-2 bg-teal-800 px-3.5 py-2.5 text-xs font-semibold text-white"><Plus className="h-4 w-4" /> Ajouter une séance</button>}</section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><TrainerMetric label="Créneaux visibles" value={visible.length} tone="slate" /><TrainerMetric label="Groupes concernés" value={visibleGroupCount} /><TrainerMetric label="Formateurs concernés" value={visibleTrainerCount} /><TrainerMetric label="Conflits détectés" value={conflicts.length} tone={conflicts.length ? 'red' : 'green'} /></section>
    {conflicts.length > 0 && <section className="border border-rose-200 bg-rose-50 p-4"><div className="flex items-center gap-2 text-sm font-bold text-rose-900"><TriangleAlert className="h-4 w-4" /> Conflits de planning</div><ul className="mt-2 space-y-1 text-xs leading-5 text-rose-800">{conflicts.map((conflict) => <li key={`${conflict.first.id}-${conflict.second.id}`}>{conflict.first.day?.label} : {conflict.sameTrainer ? `formateur ${conflict.first.trainer?.prenom} ${conflict.first.trainer?.nom}` : ''}{conflict.sameTrainer && conflict.sameRoom ? ' et ' : ''}{conflict.sameRoom ? `salle ${conflict.first.room?.code}` : ''}{conflict.sameGroup ? ` · groupe ${conflict.first.group?.libelle} en conflit` : ''}</li>)}</ul></section>}
    <section className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-bold text-slate-900">Planning hebdomadaire</h2><p className="mt-1 text-xs text-slate-500">Les créneaux sont récurrents par jour. Les heures de début et de fin ne sont pas enregistrées dans la base.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Jour</th><th className="px-4 py-3">Formateur</th><th className="px-4 py-3">Groupe / niveau</th><th className="px-4 py-3">Formation</th><th className="px-4 py-3">Salle</th><th className="px-4 py-3">Effectif</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((schedule) => <tr key={schedule.id} className="hover:bg-slate-50/70"><td className="px-4 py-3 text-xs font-semibold text-slate-700">{schedule.day?.label}</td><td className="px-4 py-3 text-xs font-semibold text-slate-800">{schedule.trainer?.prenom} {schedule.trainer?.nom}</td><td className="px-4 py-3"><p className="text-xs font-semibold text-slate-800">{schedule.group?.libelle}</p><p className="mt-1 text-[10px] text-slate-500">{schedule.level?.libelle}</p></td><td className="px-4 py-3"><p className="text-xs text-slate-700">{schedule.formationType?.libelle}</p><p className="mt-1 text-[10px] text-slate-500">{schedule.session?.libelle}</p></td><td className="px-4 py-3 text-xs text-slate-700">{schedule.room?.code} · {schedule.room?.libelle}</td><td className="px-4 py-3 tabular-nums">{schedule.activeLearners ?? '—'}</td><td className="px-4 py-3"><TrainerStatus active={Number(schedule.statut) === 1} /></td><td className="px-4 py-3"><div className="flex justify-end gap-1">{canUpdate && <button type="button" onClick={() => onEdit(schedule)} className="px-2 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50">Modifier</button>}{canDelete && <button type="button" onClick={() => onDelete(schedule)} className="px-2 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">Supprimer</button>}</div></td></tr>)}</tbody></table>{!visible.length && <div className="px-5 py-12 text-center"><CalendarDays className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm text-slate-500">Aucune séance pour ces filtres.</p></div>}</div></section>
  </div>;
}