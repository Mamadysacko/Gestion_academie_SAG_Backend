import { useCallback, useEffect, useState } from 'react';
import { useLiveRefresh } from '../../composant/useLiveRefresh';
import { CalendarDays, Edit2, Layers, Plus, Search, Trash2, X } from 'lucide-react';
import { anneesScolairesApi, niveauxApi, sessionsApi, typesFormationsApi } from '../../config/apiService';
import { useConfirm } from '../../composant/confirmContext';
import { useToastNotice } from '../../composant/toastContext';
import PrerequisiteBanner from '../../aide/Prerequisites';
import { usePrerequisites } from '../../aide/usePrerequisites';
import SaveActions from '../../composant/SaveActions';
import { useSubmitGuard } from '../../composant/useSubmitGuard';
import { useAppNavigate } from '../../composant/navContext';
import ModalOverlay from '../../composant/ModalOverlay';

const STATUSES = [
  ['planifiee', 'Planifiée'],
  ['ouverte', 'Ouverte'],
  ['en_cours', 'En cours'],
  ['terminee', 'Terminée'],
  ['annulee', 'Annulée'],
];

export default function Sessions({ currentUser }) {
  const confirm = useConfirm();
  const [sessions, setSessions] = useState([]);
  const [years, setYears] = useState([]);
  const [types, setTypes] = useState([]);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useToastNotice();
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [busy, run] = useSubmitGuard();
  const navigate = useAppNavigate();

  const hasAccess = (action) => currentUser?.role_code === 'admin'
    || currentUser?.role === 'admin'
    || (currentUser?.permissions?.['organisation-pedagogique'] || []).includes(action);
  const prerequisites = usePrerequisites('parametres/sessions', currentUser);

  const normalize = (data) => (data || []).map((item) => ({
    ...item,
    id: Number(item.id),
    id_annee: Number(item.id_annee),
    id_type_formation: Number(item.id_type_formation),
    id_niveau: Number(item.id_niveau),
    groupes_count: Number(item.groupes_count || 0),
  }));

  const reload = useCallback(async () => {
    const [sessionResponse, yearResponse, typeResponse, levelResponse] = await Promise.all([
      sessionsApi.getAll(), anneesScolairesApi.getAll(), typesFormationsApi.getAll(), niveauxApi.getAll(),
    ]);
    setSessions(normalize(sessionResponse.data));
    setYears(normalize(yearResponse.data));
    setTypes(normalize(typeResponse.data));
    setLevels(normalize(levelResponse.data));
  }, []);

  useLiveRefresh(() => reload().catch(() => {}), { intervalMs: 60000 });

  useEffect(() => {
    let mounted = true;
    Promise.all([sessionsApi.getAll(), anneesScolairesApi.getAll(), typesFormationsApi.getAll(), niveauxApi.getAll()])
      .then(([sessionResponse, yearResponse, typeResponse, levelResponse]) => {
        if (!mounted) return;
        setSessions(normalize(sessionResponse.data));
        setYears(normalize(yearResponse.data));
        setTypes(normalize(typeResponse.data));
        setLevels(normalize(levelResponse.data));
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message || 'Impossible de charger les sessions et leurs référentiels.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const openForm = (session = null) => {
    const year = years.find((item) => Number(item.statut) === 1) || years[0];
    setEditing(session);
    setForm(session ? {
      id_annee: session.id_annee,
      id_type_formation: session.id_type_formation,
      id_niveau: session.id_niveau,
      code: session.code,
      libelle: session.libelle,
      date_debut: session.date_debut,
      date_fin: session.date_fin,
      statut: session.statut,
    } : {
      id_annee: year?.id || '',
      id_type_formation: types[0]?.id || '',
      id_niveau: levels[0]?.id || '',
      code: '',
      libelle: '',
      date_debut: '',
      date_fin: '',
      statut: 'planifiee',
    });
    setIsOpen(true);
    setError('');
  };

  const performSave = async (mode) => {
    if (form.date_fin < form.date_debut) {
      setError('La date de fin doit être égale ou postérieure à la date de début.');
      return;
    }
    const payload = {
      ...form,
      id_annee: Number(form.id_annee),
      id_type_formation: Number(form.id_type_formation),
      id_niveau: Number(form.id_niveau),
      code: form.code.trim(),
      libelle: form.libelle.trim(),
    };
    try {
      if (editing) await sessionsApi.update(editing.id, payload);
      else await sessionsApi.create(payload);
      setNotice(`Session ${editing ? 'mise à jour' : 'créée'}.`);
      setError('');
      if (mode === 'continue' && !editing) {
        // Formulaire conservé pour la saisie suivante : seuls le code et le libellé (uniques) sont vidés.
        setForm((current) => ({ ...current, code: '', libelle: '' }));
        reload().catch(() => {});
      } else if (mode === 'groups' && !editing) {
        setIsOpen(false);
        reload().catch(() => {});
        navigate('parametres', 'groupes');
      } else {
        setIsOpen(false);
        await reload();
      }
    } catch (saveError) {
      setError(saveError.message || 'La session n’a pas pu être enregistrée.');
    }
  };

  const save = (event, mode = 'close') => {
    event?.preventDefault?.();
    return run(() => performSave(mode));
  };

  const remove = async (session) => {
    if (!await confirm(`Supprimer la session « ${session.libelle} » ? Les groupes rattachés peuvent être supprimés selon les règles de la base.`)) return;
    try {
      await sessionsApi.delete(session.id);
      await reload();
      setNotice('Session supprimée.');
      setError('');
    } catch (deleteError) {
      setError(deleteError.message || 'La session ne peut pas être supprimée.');
    }
  };

  const visible = sessions.filter((session) => `${session.libelle} ${session.code} ${session.type_formation_libelle || ''} ${session.niveau_libelle || ''}`
    .toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr')));

  return <section className="space-y-5">
    <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center"><div><h2 className="text-xl font-bold text-slate-800">Sessions</h2><p className="mt-1 text-sm text-slate-500">Sessions de formation liées à leur année, type et niveau.</p></div>{hasAccess('create') && <button type="button" onClick={() => openForm()} disabled={prerequisites.blocked} title={prerequisites.blocked ? 'Complétez d’abord les prérequis indiqués ci-dessous' : undefined} className="inline-flex items-center gap-2 bg-brand-charcoal px-4 py-2 text-sm font-semibold text-white hover:bg-brand-gold disabled:cursor-not-allowed disabled:opacity-40"><Plus size={18} /> Nouvelle session</button>}</header>
    <PrerequisiteBanner prerequisites={prerequisites} action="de créer une session" />
    <label className="relative block max-w-lg"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher code, libellé, type ou niveau…" className="w-full border border-slate-300 py-2.5 pl-9 pr-3 text-sm" /></label>
    {error && <p role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {notice && <p role="status" className="border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {loading ? <p role="status" className="p-10 text-center text-sm text-slate-500">Chargement des sessions…</p> : <div className="overflow-x-auto border border-slate-200 bg-white"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Session</th><th className="px-4 py-3">Année</th><th className="px-4 py-3">Formation / niveau</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((session) => <tr key={session.id}><td className="px-4 py-3"><p className="font-semibold text-slate-800">{session.libelle}</p><p className="font-mono text-xs text-slate-500">{session.code}</p></td><td className="px-4 py-3">{session.annee_libelle || years.find((year) => year.id === session.id_annee)?.libelle || '—'}</td><td className="px-4 py-3">{session.type_formation_libelle || types.find((type) => type.id === session.id_type_formation)?.libelle || '—'} · {session.niveau_libelle || levels.find((level) => level.id === session.id_niveau)?.libelle || '—'}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1"><CalendarDays size={14} />{session.date_debut} – {session.date_fin}</span></td><td className="px-4 py-3"><span className="border border-slate-200 bg-slate-50 px-2 py-1 text-xs">{STATUSES.find(([value]) => value === session.statut)?.[1] || session.statut}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-1">{hasAccess('update') && <button type="button" onClick={() => openForm(session)} aria-label="Modifier la session" className="p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"><Edit2 size={16} /></button>}{hasAccess('delete') && <button type="button" onClick={() => remove(session)} aria-label="Supprimer la session" className="p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={16} /></button>}</div></td></tr>)}</tbody></table>{!visible.length && <p className="p-10 text-center text-sm text-slate-500">{sessions.length ? 'Aucune session correspondante.' : 'Aucune session enregistrée.'}</p>}</div>}
    {isOpen && <ModalOverlay onClose={() => setIsOpen(false)} closeOnBackdrop={false}><section role="dialog" aria-modal="true" aria-labelledby="session-dialog-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white shadow-xl"><header className="flex items-center justify-between border-b border-slate-200 p-5"><div className="flex items-center gap-3"><Layers className="text-indigo-700" /><h3 id="session-dialog-title" className="font-bold text-slate-800">{editing ? 'Modifier la session' : 'Créer une session'}</h3></div><button type="button" onClick={() => setIsOpen(false)} aria-label="Fermer"><X size={18} /></button></header>
      <form id="session-form" onSubmit={save} className="grid gap-4 p-5 sm:grid-cols-2">
        <label className="text-sm font-medium">Année scolaire<select required value={form.id_annee} onChange={(event) => setForm({ ...form, id_annee: event.target.value })} className="mt-1 w-full border border-slate-300 bg-white px-3 py-2.5">{years.map((year) => <option key={year.id} value={year.id}>{year.libelle}</option>)}</select></label>
        <label className="text-sm font-medium">Type de formation<select required value={form.id_type_formation} onChange={(event) => setForm({ ...form, id_type_formation: event.target.value })} className="mt-1 w-full border border-slate-300 bg-white px-3 py-2.5">{types.map((type) => <option key={type.id} value={type.id}>{type.libelle}</option>)}</select></label>
        <label className="text-sm font-medium">Niveau<select required value={form.id_niveau} onChange={(event) => setForm({ ...form, id_niveau: event.target.value })} className="mt-1 w-full border border-slate-300 bg-white px-3 py-2.5">{levels.map((level) => <option key={level.id} value={level.id}>{level.libelle}</option>)}</select></label>
        <label className="text-sm font-medium">Code<input required maxLength={50} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} className="mt-1 w-full border border-slate-300 px-3 py-2.5" /></label>
        <label className="text-sm font-medium sm:col-span-2">Libellé<input required maxLength={100} value={form.libelle} onChange={(event) => setForm({ ...form, libelle: event.target.value })} className="mt-1 w-full border border-slate-300 px-3 py-2.5" /></label>
        <label className="text-sm font-medium">Date de début<input required type="date" value={form.date_debut} onChange={(event) => setForm({ ...form, date_debut: event.target.value })} className="mt-1 w-full border border-slate-300 px-3 py-2.5" /></label>
        <label className="text-sm font-medium">Date de fin<input required type="date" min={form.date_debut} value={form.date_fin} onChange={(event) => setForm({ ...form, date_fin: event.target.value })} className="mt-1 w-full border border-slate-300 px-3 py-2.5" /></label>
        <label className="text-sm font-medium sm:col-span-2">Statut<select value={form.statut} onChange={(event) => setForm({ ...form, statut: event.target.value })} className="mt-1 w-full border border-slate-300 bg-white px-3 py-2.5">{STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {(!years.length || !types.length || !levels.length) && <p className="sm:col-span-2 text-sm text-amber-800">Ajoutez d’abord une année scolaire, un type de formation et un niveau pour créer une session.</p>}
        <div className="border-t border-slate-100 pt-4 sm:col-span-2">
          <SaveActions
            form="session-form"
            busy={busy}
            onCancel={() => setIsOpen(false)}
            submitLabel="Enregistrer"
            followUps={editing ? [] : [
              { id: 'continue', label: 'Enregistrer et créer une autre session', hint: 'Le formulaire reste ouvert, les champs communs sont conservés' },
              { id: 'groups', label: 'Enregistrer et créer un groupe', hint: 'Ouvre directement l’onglet Groupes' },
            ]}
            onFollowUp={(id) => save(null, id)}
          />
        </div>
      </form></section></ModalOverlay>}
  </section>;
}
