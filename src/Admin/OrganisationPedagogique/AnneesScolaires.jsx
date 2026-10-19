import { useCallback, useEffect, useState } from 'react';
import { useLiveRefresh } from '../../composant/useLiveRefresh';
import { CalendarDays, Check, Edit2, Plus, Trash2, X } from 'lucide-react';
import { anneesScolairesApi } from '../../config/apiService';
import { useConfirm } from '../../composant/confirmContext';
import { useToastNotice } from '../../composant/toastContext';
import ModalOverlay from '../../composant/ModalOverlay';

export default function AnneesScolaires({ currentUser }) {
  const confirm = useConfirm();
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useToastNotice();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ libelle: '', date_debut: '', date_fin: '' });

  const can = (action) => currentUser?.role_code === 'admin'
    || currentUser?.role === 'admin'
    || (currentUser?.permissions?.['organisation-pedagogique'] || []).includes(action);

  const normalize = (response) => (response.data || []).map((year) => ({
    ...year, id: Number(year.id), statut: Number(year.statut),
  }));

  const reload = useCallback(async () => {
    setYears(normalize(await anneesScolairesApi.getAll()));
  }, []);

  useLiveRefresh(() => reload().catch(() => {}), { intervalMs: 60000 });

  useEffect(() => {
    let mounted = true;
    anneesScolairesApi.getAll()
      .then((response) => {
        if (mounted) setYears(normalize(response));
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message || 'Impossible de charger les années scolaires.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const openForm = (year = null) => {
    setEditing(year);
    setForm(year
      ? { libelle: year.libelle, date_debut: year.date_debut, date_fin: year.date_fin }
      : { libelle: '', date_debut: '', date_fin: '' });
    setError('');
    setIsOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    const payload = { ...form, libelle: form.libelle.trim() };
    if (!payload.libelle || payload.libelle.length > 20 || payload.date_fin <= payload.date_debut) {
      setError('Le libellé est obligatoire (20 caractères max.) et la fin doit être postérieure au début.');
      return;
    }
    try {
      if (editing) await anneesScolairesApi.update(editing.id, payload);
      else await anneesScolairesApi.create({ ...payload, statut: 0 });
      await reload();
      setIsOpen(false);
      setNotice(`Année scolaire ${editing ? 'modifiée' : 'créée'} en base.`);
      setError('');
    } catch (saveError) {
      setError(saveError.message || 'L’année scolaire n’a pas pu être enregistrée.');
    }
  };

  const activate = async (year) => {
    if (!await confirm(`Définir « ${year.libelle} » comme année scolaire active ?`)) return;
    try {
      await anneesScolairesApi.activate(year.id);
      await reload();
      setNotice(`L’année ${year.libelle} est maintenant active.`);
      setError('');
    } catch (activationError) {
      setError(activationError.message || 'Impossible d’activer cette année scolaire.');
    }
  };

  const remove = async (year) => {
    if (!await confirm(`Supprimer l’année « ${year.libelle} » ? Les années référencées par des sessions peuvent être protégées par la base.`)) return;
    try {
      await anneesScolairesApi.delete(year.id);
      await reload();
      setNotice('Année scolaire supprimée.');
      setError('');
    } catch (deleteError) {
      setError(deleteError.message || 'Cette année ne peut pas être supprimée car elle est utilisée.');
    }
  };

  return <section className="space-y-5">
    <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center"><div><h2 className="text-xl font-bold text-slate-800">Années scolaires</h2><p className="mt-1 text-sm text-slate-500">Une seule année active à la fois; activation et dates sont enregistrées dans MySQL.</p></div>{can('create') && <button type="button" onClick={() => openForm()} className="inline-flex items-center gap-2 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><Plus size={18} /> Nouvelle année</button>}</header>
    {error && <p role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {notice && <p role="status" className="border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {loading ? <p role="status" className="p-10 text-center text-sm text-slate-500">Chargement des années…</p> : <div className="overflow-x-auto border border-slate-200 bg-white"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Année</th><th className="px-4 py-3">Période</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{years.map((year) => <tr key={year.id}><td className="px-4 py-3 font-semibold text-slate-800">{year.libelle}</td><td className="px-4 py-3">{year.date_debut} – {year.date_fin}</td><td className="px-4 py-3"><span className={`border px-2 py-1 text-xs ${year.statut ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{year.statut ? 'Active' : 'Inactive'}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-1">{!year.statut && can('update') && <button type="button" onClick={() => activate(year)} aria-label={`Activer ${year.libelle}`} className="p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"><Check size={16} /></button>}{can('update') && <button type="button" onClick={() => openForm(year)} aria-label={`Modifier ${year.libelle}`} className="p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"><Edit2 size={16} /></button>}{can('delete') && <button type="button" onClick={() => remove(year)} aria-label={`Supprimer ${year.libelle}`} className="p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={16} /></button>}</div></td></tr>)}</tbody></table>{!years.length && <p className="p-10 text-center text-sm text-slate-500">Aucune année scolaire enregistrée.</p>}</div>}
    {isOpen && <ModalOverlay onClose={() => setIsOpen(false)} closeOnBackdrop={false}><section role="dialog" aria-modal="true" aria-labelledby="year-dialog-title" className="w-full max-w-lg bg-white shadow-xl"><header className="flex items-center justify-between border-b border-slate-200 p-5"><div className="flex items-center gap-3"><CalendarDays className="text-indigo-700" /><h3 id="year-dialog-title" className="font-bold text-slate-800">{editing ? 'Modifier l’année' : 'Créer une année scolaire'}</h3></div><button type="button" onClick={() => setIsOpen(false)} aria-label="Fermer"><X size={18} /></button></header><form onSubmit={save} className="space-y-4 p-5"><label className="block text-sm font-medium">Libellé<input required maxLength={20} value={form.libelle} onChange={(event) => setForm({ ...form, libelle: event.target.value })} placeholder="2026-2027" className="mt-1 w-full border border-slate-300 px-3 py-2.5" /></label><label className="block text-sm font-medium">Date de début<input required type="date" value={form.date_debut} onChange={(event) => setForm({ ...form, date_debut: event.target.value })} className="mt-1 w-full border border-slate-300 px-3 py-2.5" /></label><label className="block text-sm font-medium">Date de fin<input required type="date" min={form.date_debut} value={form.date_fin} onChange={(event) => setForm({ ...form, date_fin: event.target.value })} className="mt-1 w-full border border-slate-300 px-3 py-2.5" /></label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setIsOpen(false)} className="border border-slate-300 px-4 py-2 text-sm">Annuler</button><button type="submit" className="bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Enregistrer</button></div></form></section></ModalOverlay>}
  </section>;
}
