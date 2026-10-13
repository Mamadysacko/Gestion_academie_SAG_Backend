import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Award, BookOpen, ClipboardCheck, FileText, IdCard, Pencil, Plus, Printer, Route, X } from 'lucide-react';
import { auditeursApi } from '../../config/apiService';
import { useLiveRefresh } from '../../composant/useLiveRefresh';
import { printElements } from '../../utils/print';
import { jourLabel } from '../EmploisDuTemps/emploisHelpers';
import { AppreciationBadge, ResultBadge } from '../EvaluationsNotes/ResultatsComponents';
import { DECISION_LABELS, formatAverage } from '../EvaluationsNotes/resultatsHelpers';
import ReleveDocument from '../EvaluationsNotes/ReleveDocument';
import { formatShortDate } from './affectationHelpers';

const TABS = [
  { id: 'identite', label: 'Identité', icon: IdCard },
  { id: 'parcours', label: 'Parcours & affectations', icon: Route },
  { id: 'presences', label: 'Présences', icon: ClipboardCheck },
  { id: 'resultats', label: 'Notes & résultats', icon: BookOpen },
  { id: 'releves', label: 'Relevés & décisions', icon: FileText },
];

const STATUS_LABELS = { present: 'Présent', absent: 'Absent', permissionnaire: 'Permissionnaire', malade: 'Malade', conge: 'Congé' };
const STATUS_TONES = { present: 'text-emerald-700', absent: 'text-rose-700', permissionnaire: 'text-amber-700', malade: 'text-violet-700', conge: 'text-sky-700' };
const INSCRIPTION_LABELS = { active: 'Active', terminee: 'Terminée', abandonnee: 'Abandonnée', annulee: 'Annulée' };

/**
 * Dossier individuel centralisé : identité, affectations successives, présences,
 * notes et appréciations par évaluation et par session, relevés et décisions de passage.
 */
export default function DossierAuditeurComplet({ auditeurId, onClose, onEdit, onInscrire }) {
  const [dossier, setDossier] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('identite');
  const [presenceSession, setPresenceSession] = useState('');
  const releves = useRef({});
  const sheet = useRef(null);

  const load = useCallback(async () => {
    try {
      const response = await auditeursApi.getDossier(auditeurId);
      setDossier(response.data);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Impossible de charger le dossier.');
    }
  }, [auditeurId]);

  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);
  useLiveRefresh(load, { intervalMs: 0 });
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const presences = useMemo(() => (dossier?.presences?.historique || [])
    .filter((row) => !presenceSession || row.session_code === presenceSession), [dossier, presenceSession]);

  if (!dossier && !error) {
    return <Overlay onClose={onClose}><p className="p-10 text-center text-sm text-slate-500">Chargement du dossier…</p></Overlay>;
  }
  if (!dossier) {
    return <Overlay onClose={onClose}><p role="alert" className="p-10 text-center text-sm text-rose-700">{error}</p></Overlay>;
  }

  const { auditeur, inscriptions } = dossier;
  const parcours = dossier.resultats || [];
  const active = inscriptions.find((item) => item.statut === 'active');
  const presenceStats = dossier.presences?.synthese;
  const visibleTabs = TABS.filter((item) => (item.id !== 'presences' || dossier.presences) && (!['resultats', 'releves'].includes(item.id) || dossier.resultats));

  return (
    <Overlay onClose={onClose}>
      <div ref={sheet}>
        <header className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-700 text-lg font-bold text-white">{auditeur.prenom?.[0]}{auditeur.nom?.[0]}</span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-teal-800">Dossier individuel de l’auditeur</p>
              <h2 className="text-xl font-bold text-slate-900">{auditeur.nom} {auditeur.prenom}</h2>
              <p className="text-xs text-slate-500"><span className="font-mono">{auditeur.matricule}</span>{auditeur.position ? ` · ${auditeur.position}` : ''}{auditeur.type_employe_libelle ? ` · ${auditeur.type_employe_libelle}` : ''}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="border border-teal-200 bg-teal-50 px-2 py-0.5 font-bold text-teal-800">Niveau actuel : {auditeur.niveau_libelle || 'non défini'}</span>
                {active && <span className="border border-slate-200 bg-white px-2 py-0.5 text-slate-700">{active.session_code} · groupe {active.groupe_code} · salle {active.salle_code} · {jourLabel(active.jour_semaine)}</span>}
              </div>
            </div>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            {onEdit && <button type="button" onClick={() => onEdit(auditeur)} className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><Pencil className="h-3.5 w-3.5" />Modifier</button>}
            {onInscrire && <button type="button" onClick={() => onInscrire(auditeur)} className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><Plus className="h-3.5 w-3.5" />Inscrire</button>}
            <button type="button" onClick={() => printElements(sheet.current, `Dossier ${auditeur.matricule}`)} className="inline-flex items-center gap-1.5 bg-teal-800 px-3 py-2 text-xs font-semibold text-white"><Printer className="h-3.5 w-3.5" />Imprimer</button>
            <button type="button" onClick={onClose} aria-label="Fermer" className="p-2 text-slate-500 hover:bg-slate-200"><X className="h-4 w-4" /></button>
          </div>
        </header>

        <nav className="no-print flex gap-1 overflow-x-auto border-b border-slate-200 px-4" aria-label="Sections du dossier">
          {visibleTabs.map((item) => { const Icon = item.icon; const selected = tab === item.id; return <button key={item.id} type="button" onClick={() => setTab(item.id)} aria-current={selected ? 'page' : undefined} className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-xs font-semibold ${selected ? 'border-teal-700 text-teal-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Icon className="h-4 w-4" />{item.label}</button>; })}
        </nav>

        <div className="space-y-4 p-6">
          {tab === 'identite' && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card title="Informations personnelles">
                <Info label="Nom et prénom" value={`${auditeur.nom} ${auditeur.prenom}`} />
                <Info label="Matricule" value={auditeur.matricule} mono />
                <Info label="Sexe" value={auditeur.sexe === 'F' ? 'Féminin' : auditeur.sexe === 'M' ? 'Masculin' : '—'} />
                <Info label="Téléphone" value={auditeur.telephone} />
                <Info label="E-mail" value={auditeur.email} />
              </Card>
              <Card title="Informations administratives">
                <Info label="Position" value={auditeur.position} />
                <Info label="Type d’employé" value={auditeur.type_employe_libelle} />
                <Info label="Département (inscription en cours)" value={active ? `${active.departement_code} · ${active.departement_libelle}` : null} />
                <Info label="Niveau actuel" value={auditeur.niveau_libelle} />
                <Info label="Sessions suivies" value={String(new Set(inscriptions.map((item) => item.id_session)).size)} />
              </Card>
              {presenceStats && <Card title="Assiduité (toutes sessions)">
                <Info label="Séances pointées" value={String(presenceStats.total)} />
                <Info label="Taux de présence" value={presenceStats.taux_presence === null ? '—' : `${presenceStats.taux_presence} %`} />
                <Info label="Taux d’absence" value={presenceStats.taux_absence === null ? '—' : `${presenceStats.taux_absence} %`} />
              </Card>}
              {parcours.length > 0 && <Card title="Derniers résultats">
                <Info label="Session" value={`${parcours[0].session.code} · ${parcours[0].session.libelle}`} />
                <Info label="Moyenne générale" value={formatAverage(parcours[0].resultat.moyenne_generale)} />
                <div className="flex items-center justify-between py-1 text-sm"><span className="text-slate-500">Appréciation</span><AppreciationBadge appreciation={parcours[0].resultat.appreciation_generale} /></div>
                <div className="flex items-center justify-between py-1 text-sm"><span className="text-slate-500">Résultat</span><ResultBadge resultat={parcours[0].resultat.resultat} motif={parcours[0].resultat.motif} /></div>
              </Card>}
            </div>
          )}

          {tab === 'parcours' && (
            <Card title="Historique des niveaux, sessions, groupes et affectations">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2">Année / session</th><th className="px-3 py-2">Niveau</th><th className="px-3 py-2">Groupe · jour</th><th className="px-3 py-2">Salle · formateur</th><th className="px-3 py-2">Département</th><th className="px-3 py-2">Inscription</th><th className="px-3 py-2">Décision</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {inscriptions.map((item) => {
                      const result = parcours.find((entry) => Number(entry.resultat.id_inscription) === Number(item.id));
                      return <tr key={item.id}>
                        <td className="px-3 py-2"><p className="font-semibold text-slate-800">{item.session_code} · {item.session_libelle}</p><p className="text-slate-500">{item.annee_libelle}</p></td>
                        <td className="px-3 py-2">{result?.session.niveau_libelle || '—'}</td>
                        <td className="px-3 py-2">{item.groupe_code} · {item.groupe_libelle}<span className="block text-slate-500">{jourLabel(item.jour_semaine)}</span></td>
                        <td className="px-3 py-2">{item.salle_code} · {item.salle_libelle}<span className="block text-slate-500">{item.formateur_prenom} {item.formateur_nom}</span></td>
                        <td className="px-3 py-2">{item.departement_libelle}</td>
                        <td className="px-3 py-2">{formatShortDate(item.date_inscription)}<span className="block text-slate-500">{INSCRIPTION_LABELS[item.statut]}</span></td>
                        <td className="px-3 py-2">{result?.resultat.passage ? `${DECISION_LABELS[result.resultat.passage.decision]}${result.resultat.passage.decision === 'admis' ? ` → ${result.resultat.passage.niveau_arrivee_libelle || 'fin de cursus'}` : ''}` : '—'}</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {tab === 'presences' && dossier.presences && (
            <>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
                <Stat label="Séances" value={presenceStats.total} />
                {Object.entries(STATUS_LABELS).map(([key, label]) => <Stat key={key} label={label} value={presenceStats[key]} />)}
                <Stat label="Taux de présence" value={presenceStats.taux_presence === null ? '—' : `${presenceStats.taux_presence} %`} />
              </div>
              <Card title="Historique complet des présences" action={<select value={presenceSession} onChange={(event) => setPresenceSession(event.target.value)} className="no-print border border-slate-300 bg-white px-2 py-1.5 text-xs"><option value="">Toutes les sessions</option>{[...new Set(dossier.presences.historique.map((row) => row.session_code))].map((code) => <option key={code} value={code}>{code}</option>)}</select>}>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Session · groupe · salle</th><th className="px-3 py-2">Formateur</th><th className="px-3 py-2">Observation</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{presences.map((row) => <tr key={row.id}><td className="px-3 py-1.5 tabular-nums">{formatShortDate(row.date_presence)}</td><td className={`px-3 py-1.5 font-semibold ${STATUS_TONES[row.statut]}`}>{STATUS_LABELS[row.statut]}{row.statut === 'conge' && row.conge_date_debut ? <span className="block text-[10px] font-normal text-slate-500">{formatShortDate(row.conge_date_debut)} → {formatShortDate(row.conge_date_fin)}</span> : null}</td><td className="px-3 py-1.5">{row.session_code} · {row.groupe_code} · {row.salle_code}</td><td className="px-3 py-1.5">{row.formateur_prenom} {row.formateur_nom}</td><td className="px-3 py-1.5 text-slate-500">{row.observation || ''}</td></tr>)}</tbody>
                  </table>
                  {!presences.length && <p className="py-6 text-center text-xs text-slate-500">Aucun pointage enregistré.</p>}
                </div>
              </Card>
            </>
          )}

          {tab === 'resultats' && (
            parcours.length ? parcours.map(({ session, evaluations, resultat }) => (
              <Card key={resultat.id_inscription} title={`${session.code} · ${session.libelle} — ${session.niveau_libelle}`} action={<ResultBadge resultat={resultat.resultat} motif={resultat.motif} />}>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2">Évaluation</th><th className="px-3 py-2">Critères</th><th className="px-3 py-2">Moyenne /4</th><th className="px-3 py-2">Appréciation</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {evaluations.map((evaluation, index) => {
                      const item = resultat.evaluations[index];
                      return <tr key={evaluation.id}>
                        <td className="px-3 py-2"><p className="font-semibold">Évaluation {evaluation.numero}</p><p className="text-slate-500">{evaluation.libelle} · {formatShortDate(evaluation.date_evaluation)}</p></td>
                        <td className="px-3 py-2 text-slate-600">{evaluation.criteres.map((criterion) => { const note = (dossier.notes || []).find((n) => Number(n.id_inscription) === Number(resultat.id_inscription) && Number(n.id_evaluation) === Number(evaluation.id) && Number(n.id_parametre) === Number(criterion.id)); return <span key={criterion.id} className="mr-3 inline-block">{criterion.libelle} : <strong>{note?.note == null ? '—' : Number(note.note)}</strong>/{criterion.bareme}</span>; })}</td>
                        <td className="px-3 py-2 font-bold tabular-nums text-teal-800">{item.complete ? item.moyenne.toFixed(2) : <span className="font-normal text-amber-700">{item.notes_saisies}/{item.notes_attendues} notes</span>}</td>
                        <td className="px-3 py-2"><AppreciationBadge appreciation={item.appreciation} /></td>
                      </tr>;
                    })}
                  </tbody>
                  <tfoot className="border-t border-slate-200"><tr><td className="px-3 py-2 font-bold" colSpan="2">Moyenne générale de la session</td><td className="px-3 py-2 font-bold tabular-nums text-teal-800">{formatAverage(resultat.moyenne_generale)}</td><td className="px-3 py-2"><AppreciationBadge appreciation={resultat.appreciation_generale} /></td></tr></tfoot>
                </table>
              </Card>
            )) : <p className="text-sm text-slate-500">Aucun résultat enregistré.</p>
          )}

          {tab === 'releves' && (
            <>
              <Card title="Décisions de passage">
                <ul className="divide-y divide-slate-100 text-xs">
                  {parcours.map(({ session, resultat }) => <li key={resultat.id_inscription} className="flex flex-wrap items-center justify-between gap-2 py-2"><span className="font-semibold">{session.code} · {session.niveau_libelle}</span>{resultat.passage ? <span>{DECISION_LABELS[resultat.passage.decision]}{resultat.passage.decision === 'admis' ? ` → ${resultat.passage.niveau_arrivee_libelle || 'fin de cursus'}` : ''} · moyenne {formatAverage(resultat.passage.moyenne)} · {formatShortDate(resultat.passage.date_decision)} ({resultat.passage.mode_validation})</span> : <span className="text-slate-500">Non validée — <ResultBadge resultat={resultat.resultat} /></span>}</li>)}
                  {!parcours.length && <li className="py-3 text-slate-500">Aucune session.</li>}
                </ul>
              </Card>
              {parcours.map(({ session, evaluations, resultat }) => (
                <div key={resultat.id_inscription} className="space-y-2 bg-slate-100 p-3">
                  <div className="no-print flex justify-end"><button type="button" onClick={() => printElements(releves.current[resultat.id_inscription], `Relevé ${auditeur.matricule} ${session.code}`)} className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold"><Printer className="h-3.5 w-3.5" />Imprimer le relevé {session.code}</button></div>
                  <ReleveDocument ref={(node) => { releves.current[resultat.id_inscription] = node; }} session={session} evaluations={evaluations} resultat={resultat} notes={dossier.notes || []} />
                </div>
              ))}
            </>
          )}
          {!dossier.resultats && ['identite', 'parcours'].includes(tab) && <p className="flex items-center gap-2 text-xs text-slate-500"><Award className="h-3.5 w-3.5" />Les notes et résultats nécessitent le droit de consultation des évaluations.</p>}
        </div>
      </div>
    </Overlay>
  );
}

function Overlay({ children, onClose }) {
  return <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div role="dialog" aria-modal="true" className="my-4 w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">{children}</div></div>;
}

function Card({ title, action, children }) {
  return <section className="break-inside-avoid border border-slate-200"><div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">{title}</h3>{action}</div><div className="p-4">{children}</div></section>;
}

function Info({ label, value, mono = false }) {
  return <div className="flex justify-between gap-4 py-1 text-sm"><span className="text-slate-500">{label}</span><span className={`text-right font-medium text-slate-800 ${mono ? 'font-mono' : ''}`}>{value || '—'}</span></div>;
}

function Stat({ label, value }) {
  return <div className="border border-slate-200 bg-white p-3"><p className="text-[10px] font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{value ?? 0}</p></div>;
}
