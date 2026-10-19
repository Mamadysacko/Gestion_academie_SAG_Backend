import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Printer, RefreshCw } from 'lucide-react';
import { presencesApi, typesEmployesApi } from '../../config/apiService';
import TagSelect from '../../composant/TagSelect';
import { useLiveRefresh } from '../../composant/useLiveRefresh';
import { printElements } from '../../utils/print';
import { exportWorkbook } from '../../utils/exportExcel';
import logoSag from '../../assets/logo-sag.png';
import logoAges from '../../assets/logo-ages.png';
import { observationText } from '../../utils/leave';

const DAY_CODES = { 1: 'LUN', 2: 'MAR', 3: 'MER', 4: 'JEU', 5: 'VEN' };
const SPARE_ROWS = 0;

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const frDate = (iso) => iso.split('-').reverse().join('/');

/** Une fiche A4 paysage pour une classe (salle × groupe) à une date. */
function Fiche({ date, classe, types }) {
  const { info, rows } = classe;
  const counts = types.map((type) => ({ label: type, total: rows.filter((row) => (row.type_employe_libelle || 'Non renseigné') === type).length }));
  const trainer = `${info.formateur_prenom} ${info.formateur_nom}`.trim();
  const cell = 'border border-slate-700 px-1.5 py-1 align-middle';
  const head = `${cell} bg-slate-100 text-center text-[8.5px] font-bold uppercase leading-tight`;
  const lines = [...rows, ...Array.from({ length: SPARE_ROWS }, () => null)];

  return (
    <article className="print-page mx-auto flex w-[277mm] min-h-[190mm] flex-col bg-white p-0 text-[10px] text-black shadow-sm ring-1 ring-slate-200" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <header className="grid grid-cols-[62mm_1fr_62mm] items-center gap-3 pb-2">
        <img src={logoSag} alt="Société Anglogold Ashanti de Guinée SAG SA" className="h-[20mm] w-auto object-contain object-left" />
        <div className="text-center">
          <p className="rounded-sm bg-[#1F1F20] px-3 py-1.5 text-[15px] font-extrabold tracking-wide text-[#F5D482]">Siguiri Education Project</p>
          <p className="mt-1.5 text-[11px] font-bold">SAG French Numeracy and Literacy – Employees Education Attendance Sheet</p>
          <p className="text-[10px] italic">Feuille de Présence – Formation Numératie et Alphabétisation des Employés</p>
        </div>
        <img src={logoAges} alt="AGES Entreprise.Albert Global Services" className="ml-auto h-[20mm] w-auto object-contain object-right" />
      </header>

      <table className="w-full border-collapse text-[10px]">
        <tbody>
          <tr>
            <th className={`${cell} w-[24mm] bg-slate-100 text-left`}>DAYS / JOURS</th><td className={`${cell} w-[52mm] font-semibold`}>{frDate(date)}</td>
            <th className={`${cell} w-[28mm] bg-slate-100 text-left`}>Classroom / Salle</th><td className={`${cell} w-[30mm] font-bold`}>{info.salle_code}</td>
            <th className={`${cell} w-[18mm] bg-slate-100 text-left`}>Niveau</th><td className={`${cell} font-semibold`}>{info.niveau_libelle}</td>
          </tr>
          <tr>
            <th className={`${cell} bg-slate-100 text-left`}>Date</th><td className={`${cell} font-semibold`}>{frDate(date)}</td>
            <th className={`${cell} bg-slate-100 text-left`}>Presents</th><td className={`${cell} h-6`} />
            <th className={`${cell} bg-slate-100 text-left`}>Absents</th><td className={cell} />
          </tr>
          <tr>
            <th className={`${cell} bg-slate-100 text-left`}>Types d’employé</th>
            <td className={cell} colSpan={3}>
              <span className="flex flex-wrap gap-x-4 gap-y-0.5">{counts.map((item) => <span key={item.label}><strong>{item.label}</strong> : {item.total}</span>)}<span><strong>Total</strong> : {rows.length}</span></span>
            </td>
            <th className={`${cell} bg-slate-100 text-left`}>Formateur</th><td className={`${cell} font-bold`}>{trainer}</td>
          </tr>
        </tbody>
      </table>

      <table className="mt-2 w-full border-collapse text-[9.5px]">
        <thead style={{ display: 'table-header-group' }}>
          <tr>
            {['N°', 'Code Dépt', 'Nom du Département', 'Code Jour', 'N° Salle', 'Matricule', 'Poste', 'Sexe', 'Nom & Prénom', 'Téléphone', 'Signature Apprenant', 'Signature Formateur', 'Observation'].map((label) => <th key={label} className={head}>{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {lines.map((row, index) => (
            <tr key={index} className="h-[8.2mm]" style={{ breakInside: 'avoid' }}>
              <td className={`${cell} text-center`}>{index + 1}</td>
              <td className={`${cell} text-center`}>{row?.departement_code}</td>
              <td className={cell}>{row?.departement_libelle}</td>
              <td className={`${cell} text-center`}>{row ? DAY_CODES[row.jour_semaine] : ''}</td>
              <td className={`${cell} bg-[#FBF0CF] text-center font-bold`}>{row?.salle_code}</td>
              <td className={`${cell} text-center`}>{row?.auditeur_matricule}</td>
              <td className={cell}>{row?.auditeur_position}</td>
              <td className={`${cell} text-center`}>{row?.auditeur_sexe}</td>
              <td className={`${cell} font-semibold`}>{row ? `${row.auditeur_nom} ${row.auditeur_prenom}` : ''}</td>
              <td className={`${cell} text-center`}>{row?.auditeur_telephone}</td>
              <td className={`${cell} w-[30mm]`} />
              <td className={`${cell} w-[30mm]`} />
              <td className={`${cell} w-[28mm] text-[8px] leading-tight`}>{row ? observationText(row) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="mt-auto flex items-end justify-between pt-4 text-[11px]">
        <p>Vérifié par : <strong>AGES COORDINATEUR</strong></p>
        <p className="font-extrabold tracking-wide">SAG EDUCATION PROJECT</p>
      </footer>
    </article>
  );
}

/**
 * Fiche journalière : feuille de présence A4 paysage générée automatiquement pour chaque classe
 * (salle × groupe) du jour — auditeurs, formateur, niveau, types d'employé et effectifs.
 */
export default function FicheJournaliere({ sessions = [], selectedSession = '' }) {
  const [date, setDate] = useState(todayIso());
  const [sessionId, setSessionId] = useState(String(selectedSession || ''));
  const [chosen, setChosen] = useState([]);
  const [sheet, setSheet] = useState(null);
  const [allTypes, setAllTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pages = useRef({});

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [feuille, typesResponse] = await Promise.all([
        presencesApi.getFeuille({ date, id_session: sessionId }),
        typesEmployesApi.getAll().catch(() => ({ data: [] })),
      ]);
      setSheet(feuille.data);
      setAllTypes((typesResponse.data || []).map((item) => item.libelle));
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Impossible de générer la fiche.');
    } finally {
      setLoading(false);
    }
  }, [date, sessionId]);

  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);
  useLiveRefresh(() => load({ silent: true }), { intervalMs: 60000 });

  const classes = useMemo(() => {
    const map = new Map();
    (sheet?.auditeurs || []).forEach((row) => {
      if (!map.has(row.id_emploi_du_temps)) map.set(row.id_emploi_du_temps, { key: String(row.id_emploi_du_temps), info: row, rows: [] });
      map.get(row.id_emploi_du_temps).rows.push(row);
    });
    return [...map.values()].sort((a, b) => String(a.info.salle_code).localeCompare(String(b.info.salle_code), 'fr', { numeric: true }));
  }, [sheet]);

  const visible = classes.filter((item) => !chosen.length || chosen.includes(item.key));
  const types = useMemo(() => {
    const present = (sheet?.auditeurs || []).map((row) => row.type_employe_libelle || 'Non renseigné');
    return [...new Set([...allTypes, ...present])];
  }, [allTypes, sheet]);
  const exportExcel = async () => {
    const columns = [
      { key: 'no', label: 'N°', type: 'int', width: 5 }, { key: 'dept_code', label: 'Code Dépt', width: 10 }, { key: 'dept', label: 'Nom du Département', width: 22 },
      { key: 'jour', label: 'Code Jour', width: 9 }, { key: 'salle', label: 'N° Salle', width: 9 }, { key: 'matricule', label: 'Matricule', width: 13 }, { key: 'poste', label: 'Poste', width: 18 },
      { key: 'sexe', label: 'Sexe', width: 6 }, { key: 'nom', label: 'Nom & Prénom', width: 28 }, { key: 'tel', label: 'Téléphone', width: 14 },
      { key: 'sig_a', label: 'Signature Apprenant', width: 22 }, { key: 'sig_f', label: 'Signature Formateur', width: 22 }, { key: 'obs', label: 'Observation', width: 22 },
    ];
    try {
      await exportWorkbook({
        filename: `fiche-presence-${date}`,
        sheets: visible.map((item) => {
          const lines = [...item.rows.map((row, index) => ({ no: index + 1, dept_code: row.departement_code, dept: row.departement_libelle, jour: DAY_CODES[row.jour_semaine], salle: row.salle_code, matricule: row.auditeur_matricule, poste: row.auditeur_position, sexe: row.auditeur_sexe, nom: `${row.auditeur_nom} ${row.auditeur_prenom}`, tel: row.auditeur_telephone, obs: observationText(row) })),
            ...Array.from({ length: SPARE_ROWS }, (_, index) => ({ no: item.rows.length + index + 1 }))];
          return {
            name: `${item.info.salle_code} ${item.info.groupe_code}`,
            title: 'Feuille de Présence – Formation Numératie et Alphabétisation en Français',
            subtitle: `Projet Éducation Siguiri (SAG) · ${frDate(date)} · Salle ${item.info.salle_code} · ${item.info.niveau_libelle}`,
            summary: [
              { label: 'DAYS / JOURS', value: frDate(date) }, { label: 'CLASSROOM / SALLE', value: item.info.salle_code }, { label: 'NIVEAU', value: item.info.niveau_libelle },
              { label: 'FORMATEUR', value: `${item.info.formateur_prenom} ${item.info.formateur_nom}` },
              { label: 'TYPES D’EMPLOYÉ', value: [...types.map((type) => `${type} : ${item.rows.filter((row) => (row.type_employe_libelle || 'Non renseigné') === type).length}`), `Total : ${item.rows.length}`].join('  |  ') },
              { label: 'PRESENTS / ABSENTS', value: '____  /  ____' },
            ],
            sections: [{ titre: '', colonnes: columns, lignes: lines, hauteurLigne: 24 }],
          };
        }),
      });
    } catch (exportError) {
      setError(exportError.message || 'L’export Excel a échoué.');
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Fiche journalière de présence</h2>
            <p className="mt-1 text-sm text-slate-500">Une fiche A4 paysage par classe, remplie automatiquement : date, salle, niveau, formateur, types d’employé et liste des auditeurs. Présents, absents, signatures et observations restent à remplir à la main.</p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button type="button" onClick={() => load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualiser</button>
            <button type="button" disabled={!visible.length} onClick={exportExcel} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><FileSpreadsheet className="h-4 w-4" />Excel</button>
            <button type="button" disabled={!visible.length} onClick={() => printElements(visible.map((item) => pages.current[item.key]), `Fiche de présence ${frDate(date)}`, { orientation: 'landscape', margin: '8mm', branded: false })} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"><Printer className="h-4 w-4" />Imprimer / PDF ({visible.length})</button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Date<input type="date" value={date} onChange={(event) => event.target.value && setDate(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-800" /></label>
          <TagSelect label="Session" value={sessionId} onChange={(value) => { setSessionId(value); setChosen([]); }} options={sessions.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.libelle}` }))} placeholder="Toutes les sessions" />
          <TagSelect label="Classes à imprimer" multiple value={chosen} onChange={setChosen} options={classes.map((item) => ({ value: item.key, label: `${item.info.salle_code} · ${item.info.groupe_code}`, hint: `${item.info.niveau_libelle} · ${item.rows.length} auditeur(s)` }))} placeholder="Toutes les classes du jour" emptyMessage="Aucune classe ce jour-là." />
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
      {loading && !sheet ? <div role="status" className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Génération des fiches…</div>
        : sheet && !sheet.jour_de_cours ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Pas de cours ce jour : les formations ont lieu du lundi au vendredi.</p>
          : !visible.length ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Aucune classe n’a cours le {frDate(date)} avec ces filtres (jour du groupe, période de la session et de l’année).</p>
            : <div className="space-y-6 overflow-x-auto rounded-2xl bg-slate-200 p-4">
              {visible.map((item, index) => (
                <motion.div key={item.key} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} ref={(node) => { pages.current[item.key] = node?.firstElementChild || null; }}>
                  <Fiche date={date} classe={item} types={types} />
                </motion.div>
              ))}
            </div>}
    </section>
  );
}
