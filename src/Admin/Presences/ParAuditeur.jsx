import { Eye, Mail, Phone, UserRound } from 'lucide-react';
import { formatDate, formatRate } from './presenceHelpers';
import { PeriodFilters, PresenceFilter, PresenceMetric, PresenceTable } from './PresenceComponents';

export default function ParAuditeur({
  people,
  selectedAuditeur,
  onSelectAuditeur,
  periodStart,
  periodEnd,
  onPeriodStartChange,
  onPeriodEndChange,
  rows,
  data,
  onExport,
  onOpenProfile,
  onStatusChange,
  canEdit,
}) {
  const person = people.find((item) => String(item.id) === selectedAuditeur);
  const history = person ? rows.filter((row) => row.auditeur.id === person.id) : [];
  const present = history.filter((row) => row.statut === 'present').length;
  const absent = history.filter((row) => row.statut === 'absent').length;
  const enrollments = person ? data.inscriptions.filter((item) => item.id_auditeur === person.id) : [];

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 border border-slate-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
        <PresenceFilter label="Auditeur" value={selectedAuditeur} onChange={onSelectAuditeur} placeholder="Sélectionner un auditeur" options={people.map((item) => ({ value: String(item.id), label: `${item.matricule} · ${item.prenom} ${item.nom}` }))} />
        <PeriodFilters start={periodStart} end={periodEnd} onStartChange={onPeriodStartChange} onEndChange={onPeriodEndChange} rows={history} onExport={() => onExport(history, `historique-auditeur-${person?.matricule || 'auditeur'}`)} />
      </section>
      {person ? <>
        <section className="grid gap-4 border border-slate-200 bg-white p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div><p className="text-xs font-bold uppercase text-teal-800">Dossier auditeur</p><h2 className="mt-1 text-xl font-bold text-slate-900">{person.prenom} {person.nom}</h2><p className="mt-1 font-mono text-xs text-slate-500">{person.matricule}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600"><span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{person.telephone || 'Téléphone non renseigné'}</span><span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{person.email || 'E-mail non renseigné'}</span><span>{person.sexe === 'F' ? 'Femme' : person.sexe === 'M' ? 'Homme' : 'Sexe non renseigné'}</span></div></div>
          <button type="button" onClick={() => onOpenProfile(person.id)} className="inline-flex items-center justify-center gap-2 border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Eye className="h-4 w-4" /> Fiche complète</button>
        </section>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><PresenceMetric label="Séances enregistrées" value={history.length} tone="slate" /><PresenceMetric label="Taux de présence" value={formatRate(present, history.length)} /><PresenceMetric label="Présences" value={present} tone="green" /><PresenceMetric label="Absences" value={absent} tone="red" /></section>
        <section className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h3 className="text-sm font-bold text-slate-900">Historique complet sur la période</h3></div><PresenceTable rows={history} onStatusChange={onStatusChange} onOpenProfile={onOpenProfile} canEdit={canEdit} /></section>
        <section className="border border-slate-200 bg-white"><div className="border-b border-slate-200 px-4 py-3"><h3 className="text-sm font-bold text-slate-900">Inscriptions et affectations</h3></div><div className="divide-y divide-slate-100">{enrollments.map((enrollment) => {
          const groupId = data.emplois_du_temps.find((item) => item.id === enrollment.id_emploi_du_temps)?.id_groupe;
          const group = data.groupes.find((item) => item.id === groupId);
          const session = data.sessions.find((item) => item.id === group?.id_session);
          const department = data.departements.find((item) => item.id === enrollment.id_departement);
          return <div key={enrollment.id} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-4"><span className="font-semibold text-slate-800">{session?.libelle || 'Session'}</span><span className="text-slate-600">{group?.libelle || 'Groupe'}</span><span className="text-slate-600">{department?.libelle || 'Département non renseigné'}</span><span className="text-xs text-slate-500">Inscrit le {formatDate(enrollment.date_inscription)} · {enrollment.statut}</span></div>;
        })}</div></section>
      </> : <div className="border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><UserRound className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">Choisissez un auditeur pour ouvrir son historique.</p></div>}
    </div>
  );
}