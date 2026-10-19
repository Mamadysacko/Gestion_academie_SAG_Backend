import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  AlertCircle,
  Check,
  Database,
  Download,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  SquarePen,
  Trash2,
  X,
  Server,
} from 'lucide-react';
import { deleteResource, getResource, optionId, saveResource } from './parametresApi';
import { useConfirm } from '../../composant/confirmContext';
import TagSelect from '../../composant/TagSelect';
import { useLiveRefresh } from '../../composant/useLiveRefresh';
import { useToastNotice } from '../../composant/toastContext';
import { exportTable } from '../../utils/exportExcel';
import SaveActions from '../../composant/SaveActions';
import ModalOverlay from '../../composant/ModalOverlay';

const tableFields = (fields) => fields.filter((field) => field.table !== false);
const formFields = (fields) => fields.filter((field) => field.form !== false);

const makeFormValues = (fields, record = null) =>
  Object.fromEntries(
    fields.map((field) => [
      field.key,
      record ? (record[field.key] ?? '') : (field.defaultValue ?? (field.type === 'checkbox' ? 1 : '')),
    ])
  );

export default function ParametreSection({ definition }) {
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [references, setReferences] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useToastNotice();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  // Chargement asynchrone des données principales et des référentiels associés
  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    if (!silent) setError('');
    try {
      // 1. Récupération des données principales
      const mainPromise = getResource(definition.resource);

      // 2. Récupération parallèle des tables de référence (ex: années, types, niveaux, évaluations)
      const refPromises = (definition.references || []).map(async (ref) => {
        try {
          const data = await getResource(ref.resource);
          return [ref.key, data];
        } catch (refError) {
          console.warn(`Impossible de charger le référentiel '${ref.key}':`, refError);
          return [ref.key, []];
        }
      });

      const [mainRows, refEntries] = await Promise.all([mainPromise, Promise.all(refPromises)]);

      setRows(mainRows);
      setReferences(Object.fromEntries(refEntries));
    } catch (loadError) {
      if (silent) return;
      setError(
        loadError.message ||
          'Erreur lors du chargement des données. Assurez-vous que le serveur Apache et MySQL sont actifs.'
      );
    } finally {
      setLoading(false);
    }
  }, [definition]);

  useEffect(() => {
    loadData(); // eslint-disable-line react-hooks/set-state-in-effect -- chargement initial des données
  }, [loadData]);
  useLiveRefresh(() => loadData({ silent: true }), { intervalMs: 60000 });

  // Filtrage local en temps réel sur les colonnes visibles
  const visibleRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('fr');
    if (!term) return rows;
    return rows.filter((row) =>
      definition.fields.some((field) => {
        if (field.table === false) return false;
        const display = field.format
          ? field.format(row[field.key], references, row)
          : row[field.key];
        return String(display ?? '').toLocaleLowerCase('fr').includes(term);
      })
    );
  }, [definition, references, rows, search]);

  const openForm = (record = null) => {
    setEditing(record);
    setForm(makeFormValues(definition.fields, record));
    setError('');
    setDialogOpen(true);
  };

  const closeForm = () => {
    if (!saving) {
      setDialogOpen(false);
      setEditing(null);
      setForm({});
    }
  };

  // Enregistrement (Création POST ou Mise à jour PUT)
  const saveRecord = async (event, mode = 'close') => {
    event?.preventDefault?.();
    if (saving) return;
    const isUpdate = Boolean(editing);
    // « Enregistrer et continuer » enchaîne les saisies : pas de confirmation à chaque élément.
    if (!(mode === 'continue' && !isUpdate) && !(await confirm({
      title: isUpdate ? 'Enregistrer les modifications ?' : `Ajouter ce ${definition.singular || 'élément'} ?`,
      message: isUpdate
        ? `Les modifications de « ${definition.titleFor ? definition.titleFor(editing) : ''} » seront enregistrées.`
        : 'Le nouvel enregistrement sera ajouté à la base de données.',
      tone: isUpdate ? 'warning' : 'primary',
    }))) {
      return;
    }
    setSaving(true);
    setError('');

    const body = Object.fromEntries(
      formFields(definition.fields).map((field) => {
        const rawValue = form[field.key];
        let finalValue = rawValue;
        if (field.numeric) {
          finalValue = rawValue === '' || rawValue === null || rawValue === undefined ? null : Number(rawValue);
        }
        return [field.key, finalValue];
      })
    );

    try {
      const recordId = editing ? optionId(editing) : null;
      const response = await saveResource(definition.resource, body, recordId);

      const successMsg =
        response?.message ||
        `${definition.singular || 'Élément'} ${recordId ? 'mis à jour' : 'ajouté'} avec succès dans la base de données.`;
      setNotice(successMsg);
      if (mode === 'continue' && !isUpdate) {
        // Le formulaire reste ouvert : champs vidés, listes de référence (année, niveau…) conservées.
        setForm((current) => {
          const fresh = makeFormValues(definition.fields, null);
          formFields(definition.fields).forEach((field) => { if (field.type === 'select') fresh[field.key] = current[field.key]; });
          return fresh;
        });
        loadData({ silent: true });
      } else {
        closeForm();
        await loadData({ silent: true });
      }
    } catch (saveError) {
      setError(saveError.message || 'La sauvegarde a échoué. Vérifiez la cohérence des données.');
    } finally {
      setSaving(false);
    }
  };

  // Suppression (DELETE) avec gestion des contraintes d'intégrité référentielle
  const deleteRecord = async (record) => {
    const recordId = optionId(record);
    if (!recordId) return;

    const label = definition.titleFor ? definition.titleFor(record) : `#${recordId}`;
    if (!(await confirm({
      title: `Supprimer ce ${definition.singular || 'élément'} ?`,
      message: `« ${label} » sera supprimé définitivement de la base de données.`,
      tone: 'danger',
    }))) {
      return;
    }

    setDeletingId(recordId);
    setError('');
    setNotice('');

    try {
      const res = await deleteResource(definition.resource, recordId);
      setNotice(res?.message || `${definition.singular || 'Élément'} supprimé avec succès.`);
      await loadData({ silent: true });
    } catch (deleteError) {
      setError(deleteError.message || 'La suppression a échoué. Cet enregistrement est probablement lié à d’autres données.');
    } finally {
      setDeletingId(null);
    }
  };

  // Export CSV
  const exportCsv = () => {
    if (!visibleRows.length) return;
    const fields = tableFields(definition.fields);
    const csvRows = [
      fields.map((field) => field.label),
      ...visibleRows.map((row) =>
        fields.map((field) => {
          if (field.format) return field.format(row[field.key], references, row);
          if (field.type === 'checkbox') return Number(row[field.key]) === 1 ? 'Actif' : 'Inactif';
          return row[field.key] ?? '';
        })
      ),
    ];
    exportTable({
      filename: definition.tableName || definition.resource,
      title: definition.title || definition.label || definition.tableName || definition.resource,
      headings: csvRows[0],
      rows: csvRows.slice(1),
    });
  };

  const renderField = (field) => {
    const commonClass =
      'w-full border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100 rounded-sm';

    if (field.type === 'checkbox') {
      return (
        <span className="flex items-center gap-3 py-1">
          <input
            type="checkbox"
            checked={Number(form[field.key]) === 1}
            onChange={(event) =>
              setForm((current) => ({ ...current, [field.key]: event.target.checked ? 1 : 0 }))
            }
            className="h-4 w-4 accent-teal-700 cursor-pointer"
          />
          <span className="text-sm font-medium text-slate-700">
            {Number(form[field.key]) === 1 ? 'Actif' : 'Inactif'}
          </span>
        </span>
      );
    }

    if (field.type === 'select') {
      const options =
        typeof field.options === 'function' ? field.options(references) : field.options || [];
      return (
        <TagSelect
          required={field.required}
          value={form[field.key] == null ? '' : String(form[field.key])}
          onChange={(next) => setForm((current) => ({ ...current, [field.key]: next }))}
          options={options.map((option) => ({ ...option, value: String(option.value) }))}
          placeholder="Sélectionner…"
        />
      );
    }

    return (
      <input
        required={field.required && !(editing && field.optionalOnEdit)}
        type={field.type || 'text'}
        min={field.min}
        max={field.max}
        step={field.step}
        placeholder={field.placeholder || ''}
        autoComplete={field.type === 'password' ? 'new-password' : undefined}
        value={form[field.key] ?? ''}
        onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
        className={commonClass}
      />
    );
  };

  return (
    <section className="space-y-4">
      {/* En-tête de section */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded bg-teal-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-teal-800">
              <Database className="h-3 w-3" />
              {definition.tableName}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Connecté API Backend
            </span>
          </div>
          <h2 className="mt-1.5 text-xl font-bold text-slate-900">{definition.label}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">{definition.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            title="Actualiser les données"
            disabled={loading}
            className="inline-flex h-10 w-10 items-center justify-center border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-teal-700' : ''}`} />
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!visibleRows.length || loading}
            className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 transition"
          >
            <Download className="h-4 w-4" /> Exporter CSV
          </button>
          <button
            type="button"
            onClick={() => openForm()}
            className="inline-flex items-center gap-2 bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 shadow-sm transition"
          >
            <Plus className="h-4 w-4" /> Ajouter {definition.singular ? `un ${definition.singular}` : ''}
          </button>
        </div>
      </div>

      {/* Bannière de statut de synchronisation base de données */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-emerald-100 bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-slate-50 px-4 py-2.5 text-xs text-slate-600 rounded">
        <div className="flex items-center gap-2">
          <Server className="h-3.5 w-3.5 text-teal-700" />
          <span>
            Synchronisation en direct avec la base de données <strong>academie_langues3</strong> (MySQL via XAMPP).
          </span>
        </div>
        <span className="font-medium text-slate-500">
          Table : <code className="text-teal-900 font-mono">{definition.tableName}</code>
        </span>
      </div>

      {/* Notifications Toast */}
      {notice && (
        <div
          role="status"
          className="flex items-center justify-between gap-2 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 rounded transition"
        >
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice('')}
            className="text-emerald-700 hover:text-emerald-950 p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {error && !dialogOpen && (
        <div
          role="alert"
          className="flex items-start justify-between gap-2 border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-800 rounded"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-rose-700 hover:text-rose-950 p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Tableau des données */}
      <div className="border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between bg-slate-50/50">
          <div>
            <p className="text-sm font-bold text-slate-900">Registre en base de données</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {loading ? (
                'Synchronisation en cours...'
              ) : (
                `${visibleRows.length} résultat${visibleRows.length === 1 ? '' : 's'}${
                  visibleRows.length !== rows.length ? ` sur ${rows.length} enregistrement(s)` : ''
                }`
              )}
            </p>
          </div>
          <label className="relative block w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Rechercher dans ${definition.label.toLocaleLowerCase('fr')}...`}
              className="w-full border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100 rounded-sm"
            />
          </label>
        </div>

        {loading ? (
          <div className="flex min-h-60 flex-col items-center justify-center gap-3 p-8 text-sm text-slate-500">
            <LoaderCircle className="h-6 w-6 animate-spin text-teal-800" />
            <span>Chargement des données depuis la base MySQL...</span>
          </div>
        ) : visibleRows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-600">#</th>
                  {tableFields(definition.fields).map((field) => (
                    <th key={field.key} className="px-4 py-3 font-semibold text-slate-600">
                      {field.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((row, idx) => {
                  const rId = optionId(row) || idx;
                  const isDeleting = deletingId === rId;

                  return (
                    <tr
                      key={rId}
                      className={`hover:bg-teal-50/20 transition ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
                    >
                      <td className="px-4 py-3 text-xs font-mono text-slate-400">
                        {optionId(row) ?? '—'}
                      </td>
                      {tableFields(definition.fields).map((field) => {
                        const value = field.format
                          ? field.format(row[field.key], references, row)
                          : row[field.key];

                        if (field.type === 'checkbox') {
                          return (
                            <td key={field.key} className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  Number(value) === 1
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {Number(value) === 1 ? 'Actif' : 'Inactif'}
                              </span>
                            </td>
                          );
                        }

                        // Badges spéciaux pour statuts de sessions
                        if (field.key === 'statut' && typeof value === 'string') {
                          const statusConfig = {
                            planifiee: { bg: 'bg-sky-50 text-sky-700 border-sky-200', label: 'Planifiée' },
                            ouverte: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Ouverte' },
                            en_cours: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'En cours' },
                            terminee: { bg: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Terminée' },
                            annulee: { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Annulée' },
                          };
                          const conf = statusConfig[value] || { bg: 'bg-slate-100 text-slate-700', label: value };
                          return (
                            <td key={field.key} className="px-4 py-3">
                              <span
                                className={`inline-flex items-center border px-2 py-0.5 text-xs font-medium rounded ${conf.bg}`}
                              >
                                {conf.label}
                              </span>
                            </td>
                          );
                        }

                        return (
                          <td key={field.key} className="max-w-72 truncate px-4 py-3 text-slate-700">
                            {value !== undefined && value !== null && value !== '' ? (
                              String(value)
                            ) : (
                              <span className="text-slate-300 italic">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            aria-label="Modifier"
                            title="Modifier cet élément"
                            onClick={() => openForm(row)}
                            className="p-1.5 text-slate-500 hover:bg-teal-50 hover:text-teal-800 rounded transition"
                          >
                            <SquarePen className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Supprimer"
                            title="Supprimer cet élément"
                            onClick={() => deleteRecord(row)}
                            className="p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700 rounded transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-60 flex-col items-center justify-center px-5 py-12 text-center">
            {definition.icon ? (
              <definition.icon className="h-10 w-10 text-slate-300" />
            ) : (
              <Database className="h-10 w-10 text-slate-300" />
            )}
            <h3 className="mt-3 text-sm font-bold text-slate-700">
              {search ? 'Aucun résultat trouvé' : 'Aucune donnée en base de données'}
            </h3>
            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
              {search
                ? `Aucun enregistrement ne correspond au terme « ${search} ».`
                : `Ajoutez un premier ${definition.singular || 'enregistrement'} pour alimenter la table ${definition.tableName}.`}
            </p>
            {!search && (
              <button
                type="button"
                onClick={() => openForm()}
                className="mt-4 inline-flex items-center gap-1.5 bg-teal-800 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-900 rounded"
              >
                <Plus className="h-3.5 w-3.5" /> Créer un premier enregistrement
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal / Dialog de Création & Modification */}
      {dialogOpen && (
        <ModalOverlay onClose={() => { if (!saving) closeForm(); }}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="parametre-form-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-slate-200 bg-white shadow-2xl rounded-sm"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div>
                <h3 id="parametre-form-title" className="text-base font-bold text-slate-900">
                  {editing ? 'Modifier' : 'Ajouter'} {definition.singular || 'un enregistrement'}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Les modifications seront enregistrées directement dans la table MySQL{' '}
                  <code className="text-teal-800 font-semibold">{definition.tableName}</code>.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Fermer"
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form id="parametre-form" onSubmit={saveRecord} className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {formFields(definition.fields).map((field) => (
                  <label
                    key={field.key}
                    className={`block ${field.type === 'checkbox' || field.fullWidth ? 'sm:col-span-2' : ''}`}
                  >
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                      {field.label}
                      {field.required && !(editing && field.optionalOnEdit) && (
                        <span className="text-rose-600"> *</span>
                      )}
                    </span>
                    {renderField(field)}
                    {field.help && (
                      <span className="mt-1 block text-xs leading-4 text-slate-500">{field.help}</span>
                    )}
                  </label>
                ))}
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800 rounded"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              <div className="border-t border-slate-100 pt-4">
                <SaveActions
                  form="parametre-form"
                  busy={saving}
                  onCancel={closeForm}
                  submitLabel={editing ? 'Mettre à jour' : 'Créer l’enregistrement'}
                  followUps={editing ? [] : [{ id: 'continue', label: `Enregistrer et ajouter un autre ${definition.singular || 'élément'}`, hint: 'Le formulaire reste ouvert pour la saisie suivante' }]}
                  onFollowUp={(id) => saveRecord(null, id)}
                />
              </div>
            </form>
          </section>
        </ModalOverlay>
      )}
    </section>
  );
}