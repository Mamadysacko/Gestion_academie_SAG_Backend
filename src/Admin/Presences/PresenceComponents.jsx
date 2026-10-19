import { Download, Eye } from 'lucide-react';
import { formatDate, STATUS_OPTIONS } from './presenceHelpers';
import SearchableSelect from '../../composant/SearchableSelect';
import Pagination from '../../composant/Pagination';
import { usePagination } from '../../composant/usePagination';
import { observationText } from '../../utils/leave';

export function PresenceTable({ rows, onStatusChange, onOpenProfile, showDate = true, showProfileAction = true, canEdit = true }) {
  const { pageRows, pagerProps } = usePagination(rows, 50);
  if (!rows.length) {
    return <div className="px-5 py-12 text-center text-sm text-slate-500">Aucune présence ne correspond à ces critères.</div>;
  }

  return (
    <>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 font-bold">Auditeur</th>
            <th className="px-4 py-3 font-bold">Matricule / département</th>
            <th className="px-4 py-3 font-bold">Groupe / niveau</th>
            <th className="px-4 py-3 font-bold">Salle</th>
            <th className="px-4 py-3 font-bold">Formateur</th>
            {showDate && <th className="px-4 py-3 font-bold">Date</th>}
            <th className="px-4 py-3 font-bold">Statut</th>
            <th className="px-4 py-3 font-bold">Observation</th>
            {showProfileAction && <th className="px-4 py-3 text-right font-bold">Dossier</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {pageRows.map((row) => (
            <tr key={`${row.id_inscription}-${row.date_presence}`} className="align-top hover:bg-slate-50/70">
              <td className="px-4 py-3">
                {onOpenProfile ? (
                  <button type="button" onClick={() => onOpenProfile(row.auditeur?.id)} className="text-left font-semibold text-slate-800 hover:text-teal-800">
                    {row.auditeur ? `${row.auditeur.prenom} ${row.auditeur.nom}` : 'Auditeur inconnu'}
                  </button>
                ) : <span className="font-semibold text-slate-800">{row.auditeur ? `${row.auditeur.prenom} ${row.auditeur.nom}` : 'Auditeur inconnu'}</span>}
                <p className="mt-1 text-xs text-slate-500">{row.auditeur?.telephone || 'Téléphone non renseigné'}</p>
              </td>
              <td className="px-4 py-3 text-xs text-slate-600">
                <p className="font-mono font-semibold text-slate-700">{row.auditeur?.matricule || '—'}</p>
                <p className="mt-1">{row.departement?.libelle || '—'}</p>
              </td>
              <td className="px-4 py-3 text-xs text-slate-700">
                <p className="font-semibold">{row.groupe?.libelle || '—'}</p>
                <p className="mt-1 text-slate-500">{row.niveau?.libelle || '—'}</p>
              </td>
              <td className="px-4 py-3 text-xs text-slate-700">{row.salle?.code || row.salle?.libelle || '—'}</td>
              <td className="px-4 py-3 text-xs text-slate-700">{row.formateur ? `${row.formateur.prenom} ${row.formateur.nom}` : '—'}</td>
              {showDate && <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{formatDate(row.date_presence)}</td>}
              <td className="px-4 py-3">
                <select
                  aria-label={`Statut de ${row.auditeur?.prenom || ''} ${row.auditeur?.nom || ''}`}
                  value={row.statut || ''}
                  disabled={!canEdit}
                  onChange={(event) => onStatusChange(row, event.target.value)}
                  className={`min-w-36 border px-2.5 py-2 text-xs font-semibold outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 ${row.statut ? 'border-slate-200 bg-white text-slate-700' : 'border-amber-300 bg-amber-50 text-amber-800'}`}
                >
                  {!row.statut && <option value="" disabled>À pointer</option>}
                  {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                </select>
              </td>
              <td className="max-w-48 px-4 py-3 text-xs leading-5 text-slate-500">{observationText(row) || '—'}</td>
              {showProfileAction && <td className="px-4 py-3 text-right">
                <button type="button" onClick={() => onOpenProfile?.(row.auditeur?.id)} title="Consulter le dossier complet" aria-label="Consulter le dossier complet" className="inline-flex h-8 w-8 items-center justify-center border border-slate-200 text-slate-500 hover:border-teal-300 hover:text-teal-800">
                  <Eye className="h-4 w-4" />
                </button>
              </td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <Pagination {...pagerProps} />
    </>
  );
}

export function PresenceFilter({ label, value, onChange, options, placeholder }) {
  return (
    <SearchableSelect label={label} value={value} onChange={onChange} options={options} placeholder={placeholder} />
  );
}

export function PresenceMetric({ label, value, detail, tone = 'teal' }) {
  const tones = {
    teal: 'border-teal-200 bg-teal-50 text-teal-900',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    red: 'border-rose-200 bg-rose-50 text-rose-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    slate: 'border-slate-200 bg-white text-slate-900',
  };
  return (
    <div className={`border p-4 ${tones[tone]}`}>
      <p className="text-[11px] font-bold uppercase text-current/70">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {detail && <p className="mt-1 text-xs text-current/70">{detail}</p>}
    </div>
  );
}

export function PeriodFilters({ start, end, onStartChange, onEndChange, rows, onExport }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase text-slate-500">Du</span><input type="date" value={start} max={end} onChange={(event) => onStartChange(event.target.value)} className="border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-700" /></label>
      <label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase text-slate-500">Au</span><input type="date" value={end} min={start} onChange={(event) => onEndChange(event.target.value)} className="border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-700" /></label>
      <button type="button" onClick={onExport} disabled={!rows.length} className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Download className="h-4 w-4" /> Exporter</button>
    </div>
  );
}