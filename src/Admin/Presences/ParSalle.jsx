import { Building2, Search } from 'lucide-react';
import { formatRate, buildRoomRoster, buildRoomDailySheets } from './presenceHelpers';
import { PeriodFilters, PresenceFilter, PresenceMetric, PresenceTable } from './PresenceComponents';

export default function ParSalle({
  data,
  selectedRoom,
  onRoomChange,
  selectedDate,
  onDateChange,
  periodStart,
  periodEnd,
  onPeriodStartChange,
  onPeriodEndChange,
  rows,
  search,
  onSearch,
  onStatusChange,
  onOpenProfile,
  onExport,
  canEdit,
}) {
  const salle = data.salles.find((item) => String(item.id) === selectedRoom);

  // Pointages de la salle sur la période (vue historique)
  const salleRows = selectedRoom
    ? rows.filter((row) => String(row.salle?.id) === selectedRoom)
    : [];

  // Feuille journalière de la salle
  const dailySheets = selectedRoom && selectedDate
    ? buildRoomDailySheets(data, selectedRoom, selectedDate, search)
    : [];

  const dailyRows = dailySheets.flatMap((sheet) => sheet.rows);

  // Synthèse auditeurs de la salle sur la période
  const roster = selectedRoom
    ? buildRoomRoster(data, selectedRoom, salleRows, search)
    : [];

  const present = salleRows.filter((row) => row.statut === 'present').length;
  const absent = salleRows.filter((row) => row.statut === 'absent').length;

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <section className="flex flex-col gap-4 border border-slate-200 bg-white p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <PresenceFilter
            label="Salle"
            value={selectedRoom}
            onChange={onRoomChange}
            placeholder="Sélectionner une salle"
            options={data.salles.map((s) => ({
              value: String(s.id),
              label: `${s.code} · ${s.libelle} · ${s.capacite ?? '—'} places`,
            }))}
          />
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase text-slate-500">Journée</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-700"
            />
          </label>
        </div>
        <label className="relative block w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Rechercher un auditeur"
            className="w-full border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-700"
          />
        </label>
      </section>

      {salle ? (
        <>
          {/* Infos salle */}
          <section className="border border-slate-200 bg-white p-5">
            <p className="text-xs font-bold uppercase text-teal-800">Salle sélectionnée</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{salle.code} · {salle.libelle}</h2>
            <p className="mt-1 text-sm text-slate-500">Capacité : {salle.capacite ?? '—'} places · Statut : {salle.statut ?? '—'}</p>
          </section>

          {/* Métriques globales sur la période */}
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <PresenceMetric label="Auditeurs actifs" value={roster.length} tone="slate" />
            <PresenceMetric label="Pointages (période)" value={salleRows.length} />
            <PresenceMetric label="Présences" value={present} tone="green" />
            <PresenceMetric label="Absents" value={absent} tone="red" />
          </section>

          {/* Feuille journalière */}
          {selectedDate && (
            <section className="border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Feuille du jour — {salle.code}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Auditeurs présents dans cette salle ce jour selon les emplois du temps actifs.
                  </p>
                </div>
              </div>
              {dailySheets.length ? (
                dailySheets.map((sheet) => (
                  <div key={sheet.emploi.id} className="border-b border-slate-100 last:border-none">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                      <span className="font-bold text-slate-800">{sheet.groupe?.libelle ?? 'Groupe'}</span>
                      <span>{sheet.session?.libelle ?? 'Session'}</span>
                      <span>Formateur : {sheet.formateur ? `${sheet.formateur.prenom} ${sheet.formateur.nom}` : '—'}</span>
                      <span>{sheet.rows.length} / {salle.capacite ?? '—'} places</span>
                    </div>
                    {sheet.rows.length ? (
                      <PresenceTable
                        rows={sheet.rows}
                        onStatusChange={onStatusChange}
                        onOpenProfile={onOpenProfile}
                        showDate={false}
                        canEdit={canEdit}
                      />
                    ) : (
                      <p className="px-5 py-6 text-center text-sm text-amber-800">
                        Aucun auditeur actif inscrit dans ce groupe pour cette salle.
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="px-5 py-10 text-center text-sm text-slate-500">
                  Aucune affectation active pour cette salle à cette date.
                </p>
              )}
            </section>
          )}

          {/* Synthèse par auditeur sur la période */}
          <section className="border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Synthèse par auditeur</h2>
                <p className="mt-1 text-xs text-slate-500">Taux calculés sur les pointages de la période dans cette salle.</p>
              </div>
              <PeriodFilters
                start={periodStart}
                end={periodEnd}
                onStartChange={onPeriodStartChange}
                onEndChange={onPeriodEndChange}
                rows={salleRows}
                onExport={() => onExport(salleRows, `presences-salle-${salle.code}`)}
              />
            </div>
            {roster.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-bold">Auditeur</th>
                      <th className="px-4 py-3 font-bold">Matricule</th>
                      <th className="px-4 py-3 font-bold">Groupe</th>
                      <th className="px-4 py-3 font-bold">Formateur</th>
                      <th className="px-4 py-3 font-bold">Séances</th>
                      <th className="px-4 py-3 font-bold text-emerald-700">Présent</th>
                      <th className="px-4 py-3 font-bold text-rose-700">Absent</th>
                      <th className="px-4 py-3 font-bold">Permissionnaire</th>
                      <th className="px-4 py-3 font-bold">Malade</th>
                      <th className="px-4 py-3 font-bold">Congé</th>
                      <th className="px-4 py-3 font-bold">Taux</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roster.map((item) => (
                      <tr key={item.inscription.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => onOpenProfile?.(item.person?.id)}
                            className="text-left font-semibold text-slate-800 hover:text-teal-800"
                          >
                            {item.person?.prenom} {item.person?.nom}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.person?.matricule ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-700">{item.groupe?.libelle ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-700">
                          {item.formateur ? `${item.formateur.prenom} ${item.formateur.nom}` : '—'}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{item.history.length}</td>
                        <td className="px-4 py-3 tabular-nums text-emerald-700">{item.present}</td>
                        <td className="px-4 py-3 tabular-nums text-rose-700">{item.absent}</td>
                        <td className="px-4 py-3 tabular-nums">{item.permissionnaire}</td>
                        <td className="px-4 py-3 tabular-nums">{item.malade}</td>
                        <td className="px-4 py-3 tabular-nums">{item.conge}</td>
                        <td className="px-4 py-3 font-bold">{item.rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-slate-500">
                Aucun pointage enregistré pour cette salle sur la période sélectionnée.
              </p>
            )}
          </section>

          {/* Détail de tous les pointages */}
          {salleRows.length > 0 && (
            <section className="border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-sm font-bold text-slate-900">Tous les pointages · {salle.code}</h2>
              </div>
              <PresenceTable
                rows={salleRows}
                onStatusChange={onStatusChange}
                onOpenProfile={onOpenProfile}
                canEdit={canEdit}
              />
            </section>
          )}
        </>
      ) : (
        <div className="border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <Building2 className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-700">
            Sélectionnez une salle pour afficher sa feuille de présence.
          </p>
        </div>
      )}
    </div>
  );
}
