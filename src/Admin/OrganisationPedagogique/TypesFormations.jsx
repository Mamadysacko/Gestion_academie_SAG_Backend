import { useCallback, useEffect, useState } from 'react';
import { useLiveRefresh } from '../../composant/useLiveRefresh';
import { BookOpen, Edit2, Plus, Search, Trash2, X } from 'lucide-react';
import { typesFormationsApi } from '../../config/apiService';
import { useConfirm } from '../../composant/confirmContext';
import { useToastNotice } from '../../composant/toastContext';

export default function TypesFormations({ currentUser }) {
  const confirm = useConfirm();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useToastNotice();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ libelle: '' });

  const hasAccess = (action) => currentUser?.role_code === 'admin'
    || currentUser?.role === 'admin'
    || (currentUser?.permissions?.['organisation-pedagogique'] || []).includes(action);

  const reload = useCallback(async () => {
    const response = await typesFormationsApi.getAll();
    setTypes((response.data || []).map((type) => ({ ...type, id: Number(type.id) })));
  }, []);

  useLiveRefresh(() => reload().catch(() => {}), { intervalMs: 60000 });

  useEffect(() => {
    let mounted = true;
    typesFormationsApi.getAll()
      .then((response) => {
        if (mounted) setTypes((response.data || []).map((type) => ({ ...type, id: Number(type.id) })));
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message || 'Impossible de charger les types de formation.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const openForm = (type = null) => {
    setEditing(type);
    setForm({ libelle: type?.libelle || '' });
    setIsOpen(true);
    setError('');
  };

  const save = async (event) => {
    event.preventDefault();
    const libelle = form.libelle.trim();
    if (!libelle || libelle.length > 100) {
      setError('Le libellé est obligatoire et limité à 100 caractères.');
      return;
    }
    try {
      if (editing) await typesFormationsApi.update(editing.id, { libelle });
      else await typesFormationsApi.create({ libelle });
      await reload();
      setEditing(null);
      setIsOpen(false);
      setNotice(`Type de formation ${editing ? 'mis à jour' : 'créé'} en base.`);
      setError('');
    } catch (saveError) {
      setError(saveError.message || 'Le type de formation n’a pas pu être enregistré.');
    }
  };

  const remove = async (type) => {
    if (!await confirm(`Supprimer le type « ${type.libelle} » ?`)) return;
    try {
      await typesFormationsApi.delete(type.id);
      await reload();
      setNotice('Type de formation supprimé.');
      setError('');
    } catch (deleteError) {
      setError(deleteError.message || 'Ce type ne peut pas être supprimé car des sessions peuvent l’utiliser.');
    }
  };

  const visibleTypes = types.filter((type) => type.libelle.toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr')));

  return <section className="space-y-5">
    <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
      <div><h2 className="text-xl font-bold text-slate-800">Types de formation</h2><p className="mt-1 text-sm text-slate-500">Référentiel des filières persisté dans la base de données.</p></div>
      {hasAccess('create') && <button type="button" onClick={() => openForm()} className="inline-flex items-center gap-2 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><Plus size={18} /> Nouveau type</button>}
    </header>
    <label className="relative block max-w-lg"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un type…" className="w-full border border-slate-300 py-2.5 pl-9 pr-3 text-sm" /></label>
    {error && <p role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {notice && <p role="status" className="border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {loading ? <p role="status" className="p-10 text-center text-sm text-slate-500">Chargement des types de formation…</p> : (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleTypes.map((type) => <article key={type.id} className="flex items-start gap-4 border border-slate-200 bg-white p-5">
          <span className="bg-indigo-50 p-3 text-indigo-700"><BookOpen size={22} /></span>
          <div className="min-w-0 flex-1"><h3 className="font-bold text-slate-800">{type.libelle}</h3><p className="mt-1 text-xs text-slate-500">Identifiant : {type.id}</p></div>
          {(hasAccess('update') || hasAccess('delete')) && <div className="flex gap-1">{hasAccess('update') && <button type="button" onClick={() => openForm(type)} aria-label={`Modifier ${type.libelle}`} className="p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"><Edit2 size={16} /></button>}{hasAccess('delete') && <button type="button" onClick={() => remove(type)} aria-label={`Supprimer ${type.libelle}`} className="p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={16} /></button>}</div>}
        </article>)}
        {!visibleTypes.length && <p className="col-span-full border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">{types.length ? 'Aucun type ne correspond à la recherche.' : 'Aucun type de formation en base.'}</p>}
      </div>
    )}
    {isOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="type-dialog-title" className="w-full max-w-md bg-white shadow-xl">
      <header className="flex items-center justify-between border-b border-slate-200 p-4"><h3 id="type-dialog-title" className="font-bold text-slate-800">{editing ? 'Modifier le type' : 'Nouveau type de formation'}</h3><button type="button" onClick={() => { setIsOpen(false); setEditing(null); setForm({ libelle: '' }); }} aria-label="Fermer"><X size={18} /></button></header>
      <form onSubmit={save} className="space-y-4 p-5"><label className="block text-sm font-medium text-slate-700">Libellé<input autoFocus required maxLength={100} value={form.libelle} onChange={(event) => setForm({ libelle: event.target.value })} className="mt-1 w-full border border-slate-300 px-3 py-2.5" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => { setIsOpen(false); setEditing(null); setForm({ libelle: '' }); }} className="border border-slate-300 px-4 py-2 text-sm">Annuler</button><button type="submit" className="bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Enregistrer</button></div></form>
    </section></div> : null}
  </section>;
}
