import { useCallback, useEffect, useState } from 'react';
import { useLiveRefresh } from '../../composant/useLiveRefresh';
import { CalendarDays, Edit2, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { groupesApi, sessionsApi } from '../../config/apiService';
import { useConfirm } from '../../composant/confirmContext';
import { useToastNotice } from '../../composant/toastContext';
import PrerequisiteBanner from '../../aide/Prerequisites';
import { usePrerequisites } from '../../aide/usePrerequisites';
import SaveActions from '../../composant/SaveActions';
import { useSubmitGuard } from '../../composant/useSubmitGuard';
import { useAppNavigate } from '../../composant/navContext';
import ModalOverlay from '../../composant/ModalOverlay';

const DAYS = [
  [1, 'Lundi'], [2, 'Mardi'], [3, 'Mercredi'], [4, 'Jeudi'], [5, 'Vendredi'],
];

export default function Groupes({ currentUser }) {
  const confirm = useConfirm();
  const [groups, setGroups] = useState([]);
  const [sessions, setSessions] = useState([]);
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
  const prerequisites = usePrerequisites('parametres/groupes', currentUser);

  const normalize = (response) => (response.data || []).map((row) => ({
    ...row,
    id: Number(row.id),
    id_session: Number(row.id_session),
    jour_semaine: Number(row.jour_semaine),
    capacite: row.capacite == null ? null : Number(row.capacite),
    statut: Number(row.statut),
  }));

  const reload = useCallback(async () => {
    const [groupResponse, sessionResponse] = await Promise.all([groupesApi.getAll(), sessionsApi.getAll()]);
    setGroups(normalize(groupResponse));
    setSessions((sessionResponse.data || []).map((session) => ({
      ...session,
      id: Number(session.id),
      id_annee: Number(session.id_annee),
    })));
  }, []);

  useLiveRefresh(() => reload().catch(() => {}), { intervalMs: 60000 });

  useEffect(() => {
    let mounted = true;
    Promise.all([groupesApi.getAll(), sessionsApi.getAll()])
      .then(([groupResponse, sessionResponse]) => {
        if (!mounted) return;
        setGroups(normalize(groupResponse));
        setSessions((sessionResponse.data || []).map((session) => ({
          ...session,
          id: Number(session.id),
          id_annee: Number(session.id_annee),
        })));
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message || 'Impossible de charger les groupes et sessions.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const openForm = (group = null) => {
    setEditing(group);
    setForm(group ? {
      id_session: group.id_session,
      code: group.code,
      libelle: group.libelle,
      jour_semaine: group.jour_semaine,
      capacite: group.capacite ?? '',
      heure_debut: String(group.heure_debut || '08:00').slice(0, 5),
      heure_fin: String(group.heure_fin || '12:00').slice(0, 5),
      statut: group.statut,
    } : {
      id_session: sessions[0]?.id || '',
      code: '',
      libelle: '',
      jour_semaine: 1,
      capacite: '',
      heure_debut: '08:00',
      heure_fin: '12:00',
      statut: 1,
    });
    setIsOpen(true);
    setError('');
  };

  const performSave = async (mode) => {
    const code = form.code.trim();
    const libelle = form.libelle.trim();
    if (!code || code.length > 30 || !libelle || libelle.length > 100) {
      setError('Le code est obligatoire (30 caractères max.) et le libellé est obligatoire (100 caractères max.).');
      return;
    }
    if (form.capacite !== '' && (!Number.isInteger(Number(form.capacite)) || Number(form.capacite) <= 0)) {
      setError('La capacité doit être un entier positif ou laissée vide.');
      return;
    }
    if (form.heure_fin <= form.heure_debut) {
      setError('L’heure de fin doit être postérieure à l’heure de début.');
      return;
    }
    const dayLabel = DAYS.find(([day]) => day === Number(form.jour_semaine))?.[1] || '';
    if (mode !== 'continue' && !(await confirm(editing
      ? { title: 'Modifier ce groupe ?', message: `${code} · ${libelle} — ${dayLabel} ${form.heure_debut}–${form.heure_fin}.${Number(form.jour_semaine) !== Number(editing.jour_semaine) ? '\nToutes les salles du groupe passeront automatiquement à ce jour.' : ''}`, tone: 'warning' }
      : { title: 'Créer ce groupe ?', message: `${code} · ${libelle} — ${dayLabel} ${form.heure_debut}–${form.heure_fin}.`, tone: 'primary' }))) return;
    const payload = {
      id_session: Number(form.id_session),
      code,
      libelle,
      jour_semaine: Number(form.jour_semaine),
      capacite: form.capacite === '' ? null : Number(form.capacite),
      heure_debut: form.heure_debut,
      heure_fin: form.heure_fin,
      statut: Number(form.statut),
    };
    try {
      if (editing) await groupesApi.update(editing.id, payload);
      else await groupesApi.create(payload);
      setNotice(`Groupe ${editing ? 'mis à jour' : 'créé'}.`);
      setError('');
      if (mode === 'continue' && !editing) {
        // Même session, même jour et mêmes horaires conservés : seuls le code et le libellé (uniques) sont vidés.
        setForm((current) => ({ ...current, code: '', libelle: '' }));
        reload().catch(() => {});
      } else if (mode === 'affect' && !editing) {
        setIsOpen(false);
        reload().catch(() => {});
        navigate('salles', 'affectations');
      } else {
        setIsOpen(false);
        await reload();
      }
    } catch (saveError) {
      setError(saveError.message || 'Le groupe n’a pas pu être enregistré.');
    }
  };

  const save = (event, mode = 'close') => {
    event?.preventDefault?.();
    return run(() => performSave(mode));
  };

  const remove = async (group) => {
    if (!await confirm(`Supprimer le groupe « ${group.libelle} » ? Vérifiez ses affectations avant cette opération.`)) return;
    try {
      await groupesApi.delete(group.id);
      await reload();
      setNotice('Groupe supprimé.');
      setError('');
    } catch (deleteError) {
      setError(deleteError.message || 'Le groupe ne peut pas être supprimé car il est utilisé.');
    }
  };

  const visible = groups.filter((group) => {
    const session = sessions.find((item) => item.id === group.id_session);
    return `${group.code} ${group.libelle} ${session?.libelle || ''} ${session?.code || ''}`
      .toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr'));
  });

  return <section className="space-y-5">
    <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center"><div><h2 className="text-xl font-bold text-slate-800">Groupes</h2><p className="mt-1 text-sm text-slate-500">Un groupe se réunit un jour donné. Ses auditeurs peuvent être répartis dans plusieurs salles (classes) ce jour-là.</p></div>{hasAccess('create') && <button type="button" onClick={() => openForm()} disabled={prerequisites.blocked} title={prerequisites.blocked ? 'Complétez d’abord les prérequis indiqués ci-dessous' : undefined} className="inline-flex items-center gap-2 bg-brand-charcoal px-4 py-2 text-sm font-semibold text-white hover:bg-brand-gold disabled:cursor-not-allowed disabled:opacity-40"><Plus size={18} /> Nouveau groupe</button>}</header>
    <PrerequisiteBanner prerequisites={prerequisites} action="de créer un groupe" />
    <label className="relative block max-w-lg"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un code, groupe ou session…" className="w-full border border-slate-300 py-2.5 pl-9 pr-3 text-sm" /></label>
    {error && <p role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {notice && <p role="status" className="border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {loading ? <p role="status" className="p-10 text-center text-sm text-slate-500">Chargement des groupes…</p> : <div className="overflow-x-auto border border-slate-200 bg-white"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Groupe</th><th className="px-4 py-3">Session</th><th className="px-4 py-3">Jour</th><th className="px-4 py-3">Capacité</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((group) => { const session = sessions.find((item) => item.id === group.id_session); return <tr key={group.id}><td className="px-4 py-3"><p className="font-semibold text-slate-800">{group.libelle}</p><p className="font-mono text-xs text-slate-500">{group.code}</p></td><td className="px-4 py-3">{session ? `${session.libelle} · ${session.code}` : 'Session introuvable'}</td><td className="px-4 py-3">{DAYS.find(([day]) => day === group.jour_semaine)?.[1] || "—"}<span className="block text-xs text-slate-500">{String(group.heure_debut || "").slice(0, 5)}–{String(group.heure_fin || "").slice(0, 5)}</span></td><td className="px-4 py-3">{group.capacite ?? 'Non précisée'}</td><td className="px-4 py-3"><span className={`border px-2 py-1 text-xs ${group.statut ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>{group.statut ? 'Actif' : 'Inactif'}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-1">{hasAccess('update') && <button type="button" onClick={() => openForm(group)} aria-label="Modifier le groupe" className="p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"><Edit2 size={16} /></button>}{hasAccess('delete') && <button type="button" onClick={() => remove(group)} aria-label="Supprimer le groupe" className="p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={16} /></button>}</div></td></tr>; })}</tbody></table>{!visible.length && <p className="p-10 text-center text-sm text-slate-500">{groups.length ? 'Aucun groupe correspondant.' : 'Aucun groupe enregistré.'}</p>}</div>}
    {isOpen && <ModalOverlay onClose={() => setIsOpen(false)} closeOnBackdrop={false}><section role="dialog" aria-modal="true" aria-labelledby="group-dialog-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto bg-white shadow-xl"><header className="flex items-center justify-between border-b border-slate-200 p-5"><div className="flex items-center gap-3"><Users className="text-indigo-700" /><h3 id="group-dialog-title" className="font-bold text-slate-800">{editing ? 'Modifier le groupe' : 'Créer un groupe'}</h3></div><button type="button" onClick={() => setIsOpen(false)} aria-label="Fermer"><X size={18} /></button></header>
      <form id="groupe-form" onSubmit={save} className="grid gap-4 p-5 sm:grid-cols-2">
        <label className="text-sm font-medium sm:col-span-2">Session<select required value={form.id_session} onChange={(event) => setForm({ ...form, id_session: event.target.value })} className="mt-1 w-full border border-slate-300 bg-white px-3 py-2.5">{sessions.map((session) => <option key={session.id} value={session.id}>{session.libelle} · {session.code}</option>)}</select></label>
        <label className="text-sm font-medium">Code<input required maxLength={30} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} className="mt-1 w-full border border-slate-300 px-3 py-2.5" /></label>
        <label className="text-sm font-medium">Libellé<input required maxLength={100} value={form.libelle} onChange={(event) => setForm({ ...form, libelle: event.target.value })} className="mt-1 w-full border border-slate-300 px-3 py-2.5" /></label>
        <label className="text-sm font-medium">Jour de semaine<select required value={form.jour_semaine} onChange={(event) => setForm({ ...form, jour_semaine: event.target.value })} className="mt-1 w-full border border-slate-300 bg-white px-3 py-2.5">{DAYS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span className="mt-1 inline-flex items-center gap-1 text-xs font-normal text-slate-500"><CalendarDays size={12} /> Lundi à vendredi, comme le schéma SQL</span></label>
        <label className="text-sm font-medium">Heure de début<input type="time" required value={form.heure_debut} onChange={(event) => setForm({ ...form, heure_debut: event.target.value })} className="mt-1 w-full border border-slate-300 px-3 py-2.5" /></label>
        <label className="text-sm font-medium">Heure de fin<input type="time" required min={form.heure_debut} value={form.heure_fin} onChange={(event) => setForm({ ...form, heure_fin: event.target.value })} className="mt-1 w-full border border-slate-300 px-3 py-2.5" /></label>
        <label className="text-sm font-medium">Capacité (optionnelle)<input type="number" min="1" step="1" value={form.capacite} onChange={(event) => setForm({ ...form, capacite: event.target.value })} className="mt-1 w-full border border-slate-300 px-3 py-2.5" placeholder="Sans limite définie" /></label>
        <label className="text-sm font-medium sm:col-span-2">Statut<select value={form.statut} onChange={(event) => setForm({ ...form, statut: event.target.value })} className="mt-1 w-full border border-slate-300 bg-white px-3 py-2.5"><option value="1">Actif</option><option value="0">Inactif</option></select></label>
        {!sessions.length && <p className="sm:col-span-2 text-sm text-amber-800">Créez une session avant d’ajouter un groupe.</p>}
        <div className="border-t border-slate-100 pt-4 sm:col-span-2">
          <SaveActions
            form="groupe-form"
            busy={busy}
            onCancel={() => setIsOpen(false)}
            submitLabel="Enregistrer"
            followUps={editing ? [] : [
              { id: 'continue', label: 'Enregistrer et créer un autre groupe', hint: 'Le formulaire reste ouvert, les champs communs sont conservés' },
              { id: 'affect', label: 'Enregistrer et affecter à une salle', hint: 'Ouvre directement les Affectations groupe-salle' },
            ]}
            onFollowUp={(id) => save(null, id)}
          />
        </div>
      </form></section></ModalOverlay>}
  </section>;
}
