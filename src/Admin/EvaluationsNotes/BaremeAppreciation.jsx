import { useState } from 'react';
import { Plus, SquarePen, Trash2 } from 'lucide-react';
import { baremesApi } from '../../config/apiService';
import { useConfirm } from '../../composant/confirmContext';
import { useToast, useToastNotice } from '../../composant/toastContext';
import { useSubmitGuard } from '../../composant/useSubmitGuard';
import FormDialog from '../../composant/FormDialog';
import SaveActions from '../../composant/SaveActions';
import { AppreciationBadge } from './ResultatsComponents';

const NOTES = [1, 2, 3, 4];
const input = 'mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold-light/50 disabled:bg-slate-100';

/**
 * Barème d'appréciation : une moyenne (sur 4) obtient l'appréciation dont le seuil « À partir de » est le plus
 * haut seuil atteint. Chaque ligne s'ajoute, se modifie et se supprime ; le serveur vérifie que le barème reste
 * cohérent (la plus petite note commence à 0, les seuils croissent avec la note).
 */
export default function BaremeAppreciation({ bareme, canCreate, canUpdate, canDelete, onChanged }) {
  const confirm = useConfirm();
  const [, setNotice] = useToastNotice();
  const toast = useToast();
  const [dialog, setDialog] = useState(null); // { note?, libelle, seuil_min } ; note défini = modification
  const [form, setForm] = useState({ note: '', libelle: '', seuil_min: '' });
  const [error, setError] = useState('');
  const [busy, run] = useSubmitGuard();

  const freeNotes = NOTES.filter((note) => !bareme.some((row) => row.note === note));
  const sorted = [...bareme].sort((a, b) => a.note - b.note);

  const openCreate = () => {
    const note = freeNotes[0];
    const highest = sorted.length ? Math.min(4, Number(sorted[sorted.length - 1].seuil_min) + 0.5) : 0;
    setForm({ note: String(note), libelle: '', seuil_min: String(sorted.length ? highest : 0) });
    setError('');
    setDialog({ mode: 'create' });
  };
  const openEdit = (row) => {
    setForm({ note: String(row.note), libelle: row.libelle, seuil_min: String(row.seuil_min) });
    setError('');
    setDialog({ mode: 'edit', note: row.note });
  };

  const submit = (event) => {
    event.preventDefault();
    const payload = { note: Number(form.note), libelle: form.libelle.trim(), seuil_min: Number(form.seuil_min) };
    return run(async () => {
      try {
        const response = dialog.mode === 'edit' ? await baremesApi.update(dialog.note, payload) : await baremesApi.create(payload);
        setNotice(response?.message || 'Barème enregistré.');
        setDialog(null);
        await onChanged?.();
      } catch (saveError) {
        setError(saveError.message || 'Le barème n’a pas pu être enregistré.');
      }
    });
  };

  const remove = async (row) => {
    if (!(await confirm({
      title: `Supprimer l’appréciation « ${row.libelle} » ?`,
      message: 'Les moyennes situées dans cette tranche prendront l’appréciation inférieure. Le serveur refuse la suppression si le barème devenait incohérent (la plus petite note doit commencer à 0).',
      tone: 'danger',
      confirmLabel: 'Supprimer',
    }))) return;
    try {
      const response = await baremesApi.delete(row.note);
      setNotice(response?.message || 'Appréciation supprimée.');
      await onChanged?.();
    } catch (deleteError) {
      toast.error(deleteError.message || 'La suppression a été refusée.');
    }
  };

  return (
    <section className="space-y-3 border border-slate-200 bg-white p-4" aria-label="Barème d’appréciation">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Barème d’appréciation</h3>
          <p className="mt-1 max-w-xl text-xs text-slate-500">S’applique à chaque évaluation et à la moyenne générale (/4) : l’appréciation est celle dont le seuil « À partir de » est atteint.</p>
        </div>
        {canCreate && (
          <button type="button" onClick={openCreate} disabled={!freeNotes.length} title={freeNotes.length ? undefined : 'Les 4 appréciations existent déjà : modifiez-en une.'} className="inline-flex items-center gap-2 bg-brand-charcoal px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-brand-gold disabled:opacity-40">
            <Plus className="h-4 w-4" />Ajouter un barème
          </button>
        )}
      </div>

      <table className="w-full text-left text-xs">
        <thead className="text-[10px] uppercase text-slate-500"><tr><th className="py-1.5">Note</th><th className="py-1.5">Libellé</th><th className="py-1.5">À partir de (/4)</th><th className="py-1.5 text-right"><span className="sr-only">Actions</span></th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((row, index) => {
            const next = sorted[index + 1];
            return (
              <tr key={row.note}>
                <td className="py-2 pr-2"><AppreciationBadge appreciation={{ note: row.note, libelle: row.libelle }} compact /></td>
                <td className="py-2 pr-2 font-semibold text-slate-800">{row.libelle}</td>
                <td className="py-2 tabular-nums text-slate-700">{Number(row.seuil_min).toFixed(2)}<span className="ml-2 text-[10px] text-slate-400">{next ? `jusqu’à ${Number(next.seuil_min).toFixed(2)} exclu` : 'jusqu’à 4'}</span></td>
                <td className="py-2 text-right">
                  {canUpdate && <button type="button" onClick={() => openEdit(row)} aria-label={`Modifier l’appréciation ${row.libelle}`} className="p-2 text-slate-500 hover:bg-brand-gold-light/30 hover:text-brand-bordeaux"><SquarePen className="h-4 w-4" /></button>}
                  {canDelete && <button type="button" onClick={() => remove(row)} aria-label={`Supprimer l’appréciation ${row.libelle}`} className="p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!sorted.length && <p className="border border-dashed border-amber-300 bg-amber-50 px-3 py-4 text-center text-xs font-semibold text-amber-900">Aucun barème : les appréciations ne s’affichent pas. Ajoutez d’abord la note 1 (à partir de 0).</p>}

      {dialog && (
        <FormDialog
          titleId="bareme-dialog-title"
          title={dialog.mode === 'edit' ? 'Modifier l’appréciation' : 'Ajouter un barème'}
          description="Une moyenne sur 4 reçoit cette appréciation à partir du seuil indiqué, jusqu’au seuil de l’appréciation suivante."
          size="max-w-lg"
          onClose={() => setDialog(null)}
          footer={<SaveActions form="bareme-form" busy={busy} onCancel={() => setDialog(null)} submitLabel={dialog.mode === 'edit' ? 'Enregistrer' : 'Ajouter'} />}
        >
          <form id="bareme-form" onSubmit={submit} className="space-y-4">
            <label className="block text-xs font-semibold text-slate-700">Note (1 à 4)
              <select required disabled={dialog.mode === 'edit'} value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} className={input}>
                {(dialog.mode === 'edit' ? [dialog.note] : freeNotes).map((note) => <option key={note} value={note}>{note}/4</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-700">Libellé
              <input required autoFocus maxLength={50} value={form.libelle} onChange={(event) => setForm((current) => ({ ...current, libelle: event.target.value }))} placeholder="Ex. Passable, Bien, Très bien…" className={input} />
            </label>
            <label className="block text-xs font-semibold text-slate-700">À partir de (/4)
              <input required type="number" min="0" max="4" step="0.01" value={form.seuil_min} onChange={(event) => setForm((current) => ({ ...current, seuil_min: event.target.value }))} className={input} />
              <span className="mt-1 block font-normal text-slate-500">La note la plus basse commence à 0 ; chaque seuil doit être supérieur à celui de la note précédente.</span>
            </label>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
          </form>
        </FormDialog>
      )}
    </section>
  );
}
