import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FolderTree } from 'lucide-react';
import { anneesScolairesApi, groupesApi, sessionsApi, typesFormationsApi } from '../../config/apiService';
import { getCurrentSchoolYear } from '../../utils/schoolYear';

const dayNames = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

function TreeNode({ node, depth, expanded }) {
  const [isOpen, setIsOpen] = useState(expanded);
  const hasChildren = node.children.length > 0;
  return <div>
    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 hover:bg-slate-50" style={{ paddingLeft: `${16 + depth * 24}px` }}>
      <button type="button" disabled={!hasChildren} onClick={() => setIsOpen((value) => !value)} aria-label={isOpen ? 'Réduire' : 'Développer'} className="w-5 text-slate-400 disabled:opacity-0">{hasChildren ? (isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />) : null}</button>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{node.label}</p>{node.detail && <p className="mt-0.5 text-xs text-slate-500">{node.detail}</p>}</div>
      {node.status && <span className="border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600">{node.status}</span>}
      {node.capacity != null && <span className="text-xs text-slate-500">Capacité : {node.capacity}</span>}
    </div>
    {isOpen && hasChildren && <div>{node.children.map((child) => <TreeNode key={child.key} node={child} depth={depth + 1} expanded={expanded} />)}</div>}
  </div>;
}

export default function VueHierarchique({ currentUser }) {
  const [years, setYears] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [types, setTypes] = useState([]);
  const [yearId, setYearId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(true);
  const canRead = currentUser?.role_code === 'admin' || currentUser?.role === 'admin'
    || (currentUser?.permissions?.['organisation-pedagogique'] || []).includes('read');

  useEffect(() => {
    let mounted = true;
    const request = canRead
      ? Promise.all([anneesScolairesApi.getAll(), sessionsApi.getAll(), groupesApi.getAll(), typesFormationsApi.getAll()])
      : Promise.resolve(null);
    request.then((responses) => {
        if (!responses) return;
        const [yearResponse, sessionResponse, groupResponse, typeResponse] = responses;
        if (!mounted) return;
        const nextYears = (yearResponse.data || []).map((row) => ({ ...row, id: Number(row.id), statut: Number(row.statut) }));
        setYears(nextYears);
        setSessions((sessionResponse.data || []).map((row) => ({ ...row, id: Number(row.id), id_annee: Number(row.id_annee), id_type_formation: Number(row.id_type_formation), id_niveau: Number(row.id_niveau) })));
        setGroups((groupResponse.data || []).map((row) => ({ ...row, id: Number(row.id), id_session: Number(row.id_session), jour_semaine: Number(row.jour_semaine), capacite: row.capacite == null ? null : Number(row.capacite), statut: Number(row.statut) })));
        setTypes((typeResponse.data || []).map((row) => ({ ...row, id: Number(row.id) })));
        const activeYear = getCurrentSchoolYear(nextYears);
        if (activeYear) setYearId(String(activeYear.id));
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message || 'Impossible de charger la hiérarchie pédagogique.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [canRead]);

  const tree = useMemo(() => {
    const selectedYear = years.find((year) => String(year.id) === yearId);
    if (!selectedYear) return null;
    const yearSessions = sessions.filter((session) => session.id_annee === selectedYear.id);
    const typeNodes = types.map((type) => {
      const typeSessions = yearSessions.filter((session) => session.id_type_formation === type.id);
      return {
        key: `type-${type.id}`,
        label: type.libelle,
        detail: `${typeSessions.length} session(s)`,
        children: typeSessions.map((session) => {
          const sessionGroups = groups.filter((group) => group.id_session === session.id);
          return {
            key: `session-${session.id}`,
            label: `${session.libelle} · ${session.code}`,
            detail: `${session.date_debut} – ${session.date_fin}`,
            status: session.statut,
            children: sessionGroups.map((group) => ({
              key: `group-${group.id}`,
              label: `${group.libelle} · ${group.code}`,
              detail: `${dayNames[group.jour_semaine] || 'Jour inconnu'} · ${group.statut ? 'Actif' : 'Inactif'}`,
              capacity: group.capacite,
              status: null,
              children: [],
            })),
          };
        }),
      };
    });
    const untypedSessions = yearSessions.filter((session) => !types.some((type) => type.id === session.id_type_formation));
    if (untypedSessions.length) {
      typeNodes.push({
        key: 'type-unassigned',
        label: 'Type de formation non disponible',
        detail: `${untypedSessions.length} session(s)`,
        children: untypedSessions.map((session) => ({
          key: `session-${session.id}`,
          label: `${session.libelle} · ${session.code}`,
          detail: `${session.date_debut} – ${session.date_fin}`,
          status: session.statut,
          children: groups.filter((group) => group.id_session === session.id).map((group) => ({
            key: `group-${group.id}`,
            label: `${group.libelle} · ${group.code}`,
            detail: `${dayNames[group.jour_semaine] || 'Jour inconnu'} · ${group.statut ? 'Actif' : 'Inactif'}`,
            capacity: group.capacite,
            status: null,
            children: [],
          })),
        })),
      });
    }
    return {
      key: `year-${selectedYear.id}`,
      label: `Année scolaire ${selectedYear.libelle}`,
      detail: `${selectedYear.date_debut} – ${selectedYear.date_fin}`,
      status: selectedYear.statut ? 'Active' : 'Inactive',
      children: typeNodes,
    };
  }, [groups, sessions, types, yearId, years]);

  if (!canRead) return <p role="alert" className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Vous n’avez pas la permission de consulter l’organisation pédagogique.</p>;

  return <section className="space-y-5">
    <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center"><div><h2 className="text-xl font-bold text-slate-800">Vue hiérarchique</h2><p className="mt-1 text-sm text-slate-500">Arborescence réelle : année scolaire, type de formation, session et groupes.</p></div><button type="button" disabled={!tree} onClick={() => setExpanded((value) => !value)} className="inline-flex items-center gap-2 border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"><FolderTree size={16} />{expanded ? 'Tout plier' : 'Tout développer'}</button></header>
    <label className="block max-w-md text-xs font-semibold text-slate-600">Année scolaire<select value={yearId} onChange={(event) => setYearId(event.target.value)} className="mt-1 w-full border border-slate-300 bg-white px-3 py-2.5 text-sm">{years.map((year) => <option key={year.id} value={year.id}>{year.libelle}{year.statut ? ' · Active' : ''}</option>)}</select></label>
    {error && <p role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {loading ? <p role="status" className="p-10 text-center text-sm text-slate-500">Chargement de l’arborescence…</p> : <div className="overflow-hidden border border-slate-200 bg-white">{tree ? <TreeNode key={`${tree.key}-${expanded}`} node={tree} depth={0} expanded={expanded} /> : <p className="p-10 text-center text-sm text-slate-500">Aucune année scolaire n’est enregistrée.</p>}</div>}
  </section>;
}
