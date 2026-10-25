import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, DoorOpen, History, Loader2, Save, Settings2 } from 'lucide-react';
import TagSelect from '../../composant/TagSelect';
import { useConfirm } from '../../composant/confirmContext';
import { formationsApi } from '../../config/apiService';
import { JOURS, jourLabel, trainerForRoom } from './emploisHelpers';

const toForm = (formation) => ({
  passages_semaine: formation.passages_semaine,
  nb_groupes: formation.nb_groupes,
  salles_par_groupe: formation.salles_par_groupe,
  jours_autorises: formation.jours || [],
  heure_debut: String(formation.heure_debut || '08:00').slice(0, 5),
  heure_fin: String(formation.heure_fin || '12:00').slice(0, 5),
  creneaux: formation.creneaux || [],
  espacer_passages: Number(formation.espacer_passages) === 1,
  couleur: formation.couleur || '',
  motif: '',
});

/**
 * Configuration de référence de chaque formation, réutilisée automatiquement par toutes ses sessions :
 * passages hebdomadaires, nombre de groupes, salles par groupe, jours et horaires, salles dédiées.
 * Chaque enregistrement crée une version tracée ; les sessions existantes gardent la leur.
 */
export default function FormationsConfig({ data, canUpdate, canShare, notify }) {
  const confirm = useConfirm();
  const [formations, setFormations] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const response = await formationsApi.getAll();
    setFormations(response.data || []);
    return response.data || [];
  }, []);
  useEffect(() => {
    formationsApi.getAll()
      .then((response) => {
        const list = response.data || [];
        setFormations(list);
        setSelectedId((current) => current || String(list[0]?.id || ''));
      })
      .catch((loadError) => setError(loadError.message));
  }, []);

  const formation = formations.find((item) => String(item.id) === selectedId);
  useEffect(() => {
    if (!selectedId) return;
    Promise.all([formationsApi.getById(selectedId), formationsApi.getHistorique(selectedId)])
      .then(([detail, versions]) => {
        setError('');
        setForm(toForm(detail.data));
        setRooms((detail.data.salles || []).map((room) => ({ id_salle: Number(room.id_salle), mode: room.mode, motif: room.motif || '', priorite: Number(room.priorite) })));
        setHistory(versions.data || []);
      })
      .catch((loadError) => setError(loadError.message));
  }, [selectedId]);

  const [allOwners, setAllOwners] = useState(() => new Map());
  useEffect(() => {
    // Propriétaire de chaque salle dédiée (toutes formations) : une salle n'a qu'une formation propriétaire.
    Promise.all(formations.map((item) => formationsApi.getSalles(item.id).then((response) => [item, response.data || []])))
      .then((entries) => {
        const map = new Map();
        entries.forEach(([item, list]) => list.filter((room) => room.mode === 'dediee').forEach((room) => map.set(Number(room.id_salle), item)));
        setAllOwners(map);
      })
      .catch(() => {});
  }, [formations]);

  if (!formations.length) {
    return <p className="border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{error || 'Aucune formation. Créez d’abord un type de formation dans Paramètres.'}</p>;
  }

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleDay = (day) => set('jours_autorises', form.jours_autorises.includes(day) ? form.jours_autorises.filter((item) => item !== day) : [...form.jours_autorises, day].sort());
  const dedicated = rooms.filter((room) => room.mode === 'dediee').length;
  const usable = rooms.length || data.salles.filter((room) => room.statut === 'disponible').length;
  const slotsPerDay = form?.creneaux?.length || 1;
  const required = form ? Number(form.nb_groupes) * Number(form.passages_semaine) * Number(form.salles_par_groupe) : 0;
  const capacity = form ? usable * form.jours_autorises.length * slotsPerDay : 0;
  const issues = [];
  if (form) {
    if (Number(form.passages_semaine) > form.jours_autorises.length) issues.push(`${form.passages_semaine} passages par semaine pour ${form.jours_autorises.length} jour(s) autorisé(s) : un groupe ne vient qu’une fois par jour.`);
    if (Number(form.salles_par_groupe) > usable) issues.push(`Chaque groupe doit occuper ${form.salles_par_groupe} salles, mais ${usable} seulement sont rattachées.`);
    if (required > capacity) issues.push(`Capacité insuffisante : ${required} occupations salle-créneau nécessaires pour ${capacity} disponibles.`);
  }

  const saveConfig = async () => {
    if (!(await confirm({ title: 'Enregistrer une nouvelle version ?', message: `${formation.libelle} : ${form.nb_groupes} groupe(s) × ${form.passages_semaine} passage(s)/semaine × ${form.salles_par_groupe} salle(s).\nElle s’appliquera aux nouvelles sessions ; les sessions existantes conservent leur configuration (adoption possible depuis la planification).`, tone: 'warning' }))) return;
    setBusy('config');
    setError('');
    try {
      const payload = {
        passages_semaine: Number(form.passages_semaine), nb_groupes: Number(form.nb_groupes), salles_par_groupe: Number(form.salles_par_groupe),
        jours_autorises: form.jours_autorises, heure_debut: form.heure_debut, heure_fin: form.heure_fin,
        creneaux: form.creneaux.length ? form.creneaux : null, espacer_passages: form.espacer_passages,
        couleur: form.couleur || null, motif: form.motif || null,
      };
      const response = await formationsApi.updateConfiguration(formation.id, payload);
      notify?.(response.message);
      await load();
      const versions = await formationsApi.getHistorique(formation.id);
      setHistory(versions.data || []);
      set('motif', '');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy('');
    }
  };

  const toggleRoom = (roomId, owner) => {
    setRooms((current) => {
      const existing = current.find((room) => room.id_salle === roomId);
      if (existing) return current.filter((room) => room.id_salle !== roomId);
      return [...current, { id_salle: roomId, mode: owner && Number(owner.id) !== Number(formation.id) ? 'partagee' : 'dediee', motif: '', priorite: current.length }];
    });
  };
  const saveRooms = async () => {
    setBusy('rooms');
    setError('');
    try {
      const response = await formationsApi.setSalles(formation.id, rooms);
      notify?.(response.message);
      await load();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Configuration de référence</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Formations & salles dédiées</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">Ces réglages sont repris automatiquement par chaque nouvelle session de la formation : inutile de tout reconfigurer à chaque session.</p>
        </div>
        <TagSelect label="Formation" value={selectedId} onChange={setSelectedId} clearable={false} options={formations.map((item) => ({ value: String(item.id), label: item.libelle, hint: `version ${item.config_version} · ${item.nb_sessions} session(s)` }))} className="min-w-64" />
      </header>

      {error && <p role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      {form && formation && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <section className="space-y-4 border border-slate-200 bg-white p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Settings2 className="h-4 w-4" />Rythme et organisation · version {formation.config_version}</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField label="Passages par semaine" hint="Combien de fois chaque groupe vient" min={1} max={5} value={form.passages_semaine} onChange={(value) => set('passages_semaine', value)} disabled={!canUpdate} />
              <NumberField label="Groupes par session" hint="Nombre de groupes ouverts" min={1} max={50} value={form.nb_groupes} onChange={(value) => set('nb_groupes', value)} disabled={!canUpdate} />
              <NumberField label="Salles par groupe" hint="Salles occupées en même temps" min={1} max={50} value={form.salles_par_groupe} onChange={(value) => set('salles_par_groupe', value)} disabled={!canUpdate} />
            </div>
            <fieldset>
              <legend className="text-sm font-medium text-slate-800">Jours autorisés</legend>
              <div className="mt-1 flex flex-wrap gap-1">{JOURS.map((day) => <button key={day.id} type="button" disabled={!canUpdate} aria-pressed={form.jours_autorises.includes(day.id)} onClick={() => toggleDay(day.id)} className={`border px-3 py-1.5 text-xs font-semibold ${form.jours_autorises.includes(day.id) ? 'border-teal-700 bg-teal-800 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{day.label}</button>)}</div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-medium">Début<input type="time" disabled={!canUpdate} value={form.heure_debut} onChange={(event) => set('heure_debut', event.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Fin<input type="time" disabled={!canUpdate} value={form.heure_fin} onChange={(event) => set('heure_fin', event.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Couleur du calendrier<input type="color" disabled={!canUpdate} value={form.couleur || '#2a78d6'} onChange={(event) => set('couleur', event.target.value)} className="mt-1 h-10 w-full border border-slate-300 px-1" /></label>
            </div>
            <SlotsEditor slots={form.creneaux} onChange={(value) => set('creneaux', value)} disabled={!canUpdate} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!canUpdate} checked={form.espacer_passages} onChange={(event) => set('espacer_passages', event.target.checked)} />Espacer les passages d’un groupe (éviter deux jours consécutifs)</label>

            <div className={`border p-3 text-sm ${issues.length ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
              <p><strong>{form.nb_groupes}</strong> groupe(s) × <strong>{form.passages_semaine}</strong> passage(s) × <strong>{form.salles_par_groupe}</strong> salle(s) = <strong>{required}</strong> occupations salle-créneau par semaine.</p>
              <p className="text-xs">Capacité : {usable} salle(s) × {form.jours_autorises.length} jour(s) × {slotsPerDay} créneau(x) = {capacity} (avant les réservations des autres formations).</p>
              {issues.map((issue, index) => <p key={index} className="mt-1 flex gap-1 text-xs font-semibold"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{issue}</p>)}
            </div>

            {canUpdate && (
              <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
                <label className="flex-1 text-sm font-medium">Motif de la modification (tracé dans l’historique)<input maxLength={255} value={form.motif} onChange={(event) => set('motif', event.target.value)} placeholder="Ex. : passage à deux venues par semaine" className="mt-1 w-full border border-slate-300 px-3 py-2" /></label>
                <button type="button" onClick={saveConfig} disabled={busy === 'config' || Number(form.passages_semaine) > form.jours_autorises.length} className="inline-flex items-center gap-2 bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-40">{busy === 'config' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Enregistrer la version</button>
              </div>
            )}
          </section>

          <section className="space-y-3 border border-slate-200 bg-white p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><DoorOpen className="h-4 w-4" />Salles de la formation · {dedicated} dédiée(s), {rooms.length - dedicated} partagée(s)</h3>
            <p className="text-xs text-slate-600">Une salle dédiée appartient à une seule formation. L’utiliser pour une autre formation exige un partage explicite, motivé{canShare ? '' : ' (droit « Valider » du module Salles requis)'}.</p>
            <ul className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto border border-slate-100">
              {data.salles.slice().sort((a, b) => String(a.code).localeCompare(String(b.code), 'fr', { numeric: true })).map((room) => {
                const link = rooms.find((item) => item.id_salle === Number(room.id));
                const owner = allOwners.get(Number(room.id));
                const ownedElsewhere = owner && Number(owner.id) !== Number(formation.id);
                const trainer = trainerForRoom(room.id, data.formateurs);
                return (
                  <li key={room.id} className="flex flex-wrap items-center gap-2 px-2 py-2 text-sm">
                    <input type="checkbox" aria-label={`Rattacher ${room.code}`} disabled={!canUpdate || (ownedElsewhere && !canShare && !link)} checked={Boolean(link)} onChange={() => toggleRoom(Number(room.id), owner)} />
                    <span className="w-16 font-semibold text-slate-800">{room.code}</span>
                    <span className="flex-1 truncate text-xs text-slate-500">{trainer ? `${trainer.prenom} ${trainer.nom}` : 'sans formateur titulaire'}{room.statut !== 'disponible' ? ' · indisponible' : ''}</span>
                    {ownedElsewhere && <span className="border border-slate-300 px-1 text-[10px] text-slate-600">Dédiée · {owner.libelle}</span>}
                    {link && (
                      <select aria-label={`Mode de ${room.code}`} disabled={!canUpdate || ownedElsewhere} value={link.mode} onChange={(event) => setRooms((current) => current.map((item) => item.id_salle === link.id_salle ? { ...item, mode: event.target.value } : item))} className="border border-slate-300 bg-white px-1 py-0.5 text-xs">
                        <option value="dediee">Dédiée</option>
                        <option value="partagee">Partagée</option>
                      </select>
                    )}
                    {link?.mode === 'partagee' && ownedElsewhere && <input aria-label="Motif du partage" placeholder="Motif du partage (obligatoire)" value={link.motif} onChange={(event) => setRooms((current) => current.map((item) => item.id_salle === link.id_salle ? { ...item, motif: event.target.value } : item))} className="w-full border border-slate-300 px-2 py-1 text-xs" />}
                  </li>
                );
              })}
            </ul>
            {canUpdate && <button type="button" onClick={saveRooms} disabled={busy === 'rooms'} className="inline-flex items-center gap-2 bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-40">{busy === 'rooms' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Enregistrer les salles</button>}

            <h3 className="flex items-center gap-2 border-t border-slate-100 pt-3 text-sm font-bold text-slate-900"><History className="h-4 w-4" />Versions de la configuration</h3>
            <ol className="space-y-1.5 text-xs">
              {history.map((version) => (
                <li key={version.id} className="border-l-2 border-slate-300 pl-2">
                  <span className="font-semibold text-slate-800">v{version.version}</span> · {version.created_at}{version.auteur ? ` · ${version.auteur}` : ''} · {version.nb_sessions} session(s)
                  <span className="block text-slate-600">{version.configuration.nb_groupes} groupe(s) × {version.configuration.passages_semaine} passage(s) × {version.configuration.salles_par_groupe} salle(s) · {String(version.configuration.jours_autorises).split(',').map((day) => jourLabel(day).slice(0, 3)).join(' ')} · {version.configuration.heure_debut}–{version.configuration.heure_fin}</span>
                  {version.motif && <span className="block italic text-slate-500">« {version.motif} »</span>}
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </div>
  );
}

function NumberField({ label, hint, value, onChange, min, max, disabled }) {
  return (
    <label className="text-sm font-medium text-slate-800">{label}
      <input type="number" min={min} max={max} step={1} disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2 tabular-nums" />
      <span className="mt-0.5 block text-xs font-normal text-slate-500">{hint}</span>
    </label>
  );
}

/** Plusieurs créneaux par jour (facultatif) : une salle peut alors recevoir un groupe le matin, un autre l'après-midi. */
function SlotsEditor({ slots, onChange, disabled }) {
  return (
    <fieldset className="text-sm">
      <legend className="font-medium text-slate-800">Créneaux de la journée <span className="font-normal text-slate-500">(facultatif : sinon, l’horaire ci-dessus)</span></legend>
      <ul className="mt-1 space-y-1">
        {slots.map((slot, index) => (
          <li key={index} className="flex items-center gap-2">
            <input type="time" aria-label="Début du créneau" disabled={disabled} value={slot.debut} onChange={(event) => onChange(slots.map((item, i) => i === index ? { ...item, debut: event.target.value } : item))} className="border border-slate-300 px-2 py-1" />
            <span>→</span>
            <input type="time" aria-label="Fin du créneau" disabled={disabled} value={slot.fin} onChange={(event) => onChange(slots.map((item, i) => i === index ? { ...item, fin: event.target.value } : item))} className="border border-slate-300 px-2 py-1" />
            {!disabled && <button type="button" onClick={() => onChange(slots.filter((_, i) => i !== index))} className="text-xs text-rose-700 hover:underline">Retirer</button>}
          </li>
        ))}
      </ul>
      {!disabled && slots.length < 6 && <button type="button" onClick={() => onChange([...slots, { debut: '13:00', fin: '17:00' }])} className="mt-1 text-xs font-semibold text-teal-800 hover:underline">+ Ajouter un créneau</button>}
    </fieldset>
  );
}
