import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle2, Download, RefreshCw, Search, XCircle } from 'lucide-react';
import { journalApi } from '../../config/apiService';
import TagSelect from '../../composant/TagSelect';
import { useLiveRefresh } from '../../composant/useLiveRefresh';
import { exportTable } from '../../utils/exportExcel';
import Pagination from '../../composant/Pagination';
import { usePagination } from '../../composant/usePagination';

const ACTIONS = [
  { value: 'creation', label: 'Création' }, { value: 'modification', label: 'Modification' },
  { value: 'suppression', label: 'Suppression' }, { value: 'validation', label: 'Validation' },
  { value: 'connexion', label: 'Connexion' }, { value: 'deconnexion', label: 'Déconnexion' },
];
const ACTION_TONES = {
  creation: 'bg-emerald-50 text-emerald-700', modification: 'bg-amber-50 text-amber-700', suppression: 'bg-rose-50 text-rose-700',
  validation: 'bg-violet-50 text-violet-700', connexion: 'bg-sky-50 text-sky-700', deconnexion: 'bg-slate-100 text-slate-600',
};

/** Journal réel des opérations : qui a créé, modifié, supprimé ou validé quoi, et avec quel résultat. */
export default function JournalAudit() {
  const [rows, setRows] = useState([]);
  const { pageRows, pagerProps } = usePagination(rows, 25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ q: '', action: '', succes: '', debut: '', fin: '' });

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const response = await journalApi.search({ ...filters, limit: 500 });
      setRows(response.data || []);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Impossible de charger le journal.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);
  useLiveRefresh(() => load({ silent: true }), { intervalMs: 20000 });

  const set = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const exportCsv = () => {
    const head = ['Date', 'Utilisateur', 'Rôle', 'Action', 'Ressource', 'Chemin', 'Code', 'Résultat', 'Message', 'IP'];
    const lines = rows.map((r) => [r.created_at, r.utilisateur, r.role_code, r.action, r.ressource, r.chemin, r.code_http, r.succes === '1' || r.succes === 1 ? 'Succès' : 'Échec', r.message, r.adresse_ip]);
    exportTable({
      filename: `journal-operations-${new Date().toISOString().slice(0, 10)}`,
      title: 'Journal des opérations',
      headings: head,
      rows: lines,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900"><Activity className="h-5 w-5 text-indigo-600" />Journal des opérations</h2>
          <p className="text-xs text-slate-500">Traçabilité réelle des créations, modifications, suppressions, validations et connexions. Les mots de passe ne sont jamais enregistrés.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => load()} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualiser</button>
          <button type="button" onClick={exportCsv} disabled={!rows.length} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Download className="h-4 w-4" />Exporter</button>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
        <label className="relative block"><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Recherche</span><Search className="absolute left-3 top-[2.35rem] h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={filters.q} onChange={(event) => set('q', event.target.value)} placeholder="Utilisateur, route, message…" className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
        <TagSelect label="Action" value={filters.action} onChange={(value) => set('action', value)} options={ACTIONS} placeholder="Toutes" />
        <TagSelect label="Résultat" value={filters.succes} onChange={(value) => set('succes', value)} options={[{ value: '1', label: 'Succès' }, { value: '0', label: 'Échec' }]} placeholder="Tous" />
        <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Du<input type="date" value={filters.debut} onChange={(event) => set('debut', event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal normal-case text-slate-800" /></label>
        <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Au<input type="date" value={filters.fin} onChange={(event) => set('fin', event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal normal-case text-slate-800" /></label>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Utilisateur</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Ressource</th><th className="px-4 py-3">Résultat</th><th className="px-4 py-3">Détail</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows.map((row, index) => {
              const ok = Number(row.succes) === 1;
              return (
                <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(index, 12) * 0.015 }}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs tabular-nums text-slate-600">{String(row.created_at).replace(' ', ' · ')}</td>
                  <td className="px-4 py-2.5"><p className="font-semibold text-slate-800">{row.utilisateur || 'Anonyme'}</p><p className="text-[11px] text-slate-500">{row.role_code || '—'} · {row.adresse_ip}</p></td>
                  <td className="px-4 py-2.5"><span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${ACTION_TONES[row.action] || 'bg-slate-100 text-slate-600'}`}>{ACTIONS.find((a) => a.value === row.action)?.label || row.action}</span></td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{row.chemin}</td>
                  <td className="px-4 py-2.5"><span className={`inline-flex items-center gap-1 text-xs font-semibold ${ok ? 'text-emerald-700' : 'text-rose-700'}`}>{ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}{row.code_http}</span></td>
                  <td className="max-w-xs px-4 py-2.5 text-xs text-slate-600">{row.message || '—'}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        <Pagination {...pagerProps} />
        {!rows.length && !loading && <p className="px-4 py-12 text-center text-sm text-slate-500">Aucune opération enregistrée pour ces filtres.</p>}
      </div>
    </div>
  );
}
