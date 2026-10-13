import { useEffect, useState } from 'react';
import { BookOpen, CalendarDays, Layers, Users } from 'lucide-react';
import { anneesScolairesApi, groupesApi, sessionsApi, typesFormationsApi } from '../../config/apiService';
import { getCurrentSchoolYear } from '../../utils/schoolYear';

const EMPTY = { years: [], sessions: [], groups: [], types: [] };

export default function DashboardPedagogique({ currentUser }) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const canRead = currentUser?.role_code === 'admin' || currentUser?.role === 'admin'
    || (currentUser?.permissions?.['organisation-pedagogique'] || []).includes('read');

  useEffect(() => {
    let mounted = true;
    const request = canRead ? Promise.all([
      anneesScolairesApi.getAll(),
      sessionsApi.getAll(),
      groupesApi.getAll(),
      typesFormationsApi.getAll(),
    ]) : Promise.resolve(null);
    request.then((responses) => {
      if (!responses) return;
      const [yearResponse, sessionResponse, groupResponse, typeResponse] = responses;
      if (!mounted) return;
      setData({
        years: yearResponse.data || [],
        sessions: sessionResponse.data || [],
        groups: groupResponse.data || [],
        types: typeResponse.data || [],
      });
    }).catch((loadError) => {
      if (mounted) setError(loadError.message || 'Impossible de charger le tableau de bord pédagogique.');
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [canRead]);

  const activeYear = getCurrentSchoolYear(data.years);
  const activeSessions = data.sessions.filter((session) => (
    (!activeYear || Number(session.id_annee) === Number(activeYear.id))
    && ['ouverte', 'en_cours'].includes(session.statut)
  )).length;
  const activeGroups = data.groups.filter((group) => Number(group.statut) === 1).length;
  const cards = [
    { label: 'Année active', value: activeYear?.libelle || 'Aucune', detail: activeYear ? `${activeYear.date_debut} au ${activeYear.date_fin}` : 'Définissez une année active', icon: CalendarDays, color: 'text-indigo-700 bg-indigo-50' },
    { label: 'Sessions ouvertes / en cours', value: activeSessions, detail: 'Pour l’année active', icon: Layers, color: 'text-emerald-700 bg-emerald-50' },
    { label: 'Groupes actifs', value: activeGroups, detail: 'Tous les groupes du référentiel', icon: Users, color: 'text-amber-700 bg-amber-50' },
    { label: 'Types de formation', value: data.types.length, detail: 'Types enregistrés en base', icon: BookOpen, color: 'text-purple-700 bg-purple-50' },
  ];

  if (!canRead) return <p role="alert" className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Vous n’avez pas la permission de consulter l’organisation pédagogique.</p>;

  return <section className="space-y-6">
    <header className="border-b border-slate-200 pb-4"><h2 className="text-xl font-bold text-slate-800">Tableau de bord pédagogique</h2><p className="mt-1 text-sm text-slate-500">Indicateurs calculés à partir des référentiels enregistrés dans la base.</p></header>
    {error && <p role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {loading ? <p role="status" className="p-10 text-center text-sm text-slate-500">Chargement des indicateurs…</p> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => { const Icon = card.icon; return <article key={card.label} className="border border-slate-200 bg-white p-5"><span className={`inline-flex p-3 ${card.color}`}><Icon size={22} /></span><p className="mt-4 text-sm font-medium text-slate-500">{card.label}</p><p className="mt-1 text-2xl font-bold text-slate-800">{card.value}</p><p className="mt-2 text-xs text-slate-500">{card.detail}</p></article>; })}</div>
      <section className="border border-slate-200 bg-white"><header className="border-b border-slate-200 p-4"><h3 className="font-bold text-slate-800">Sessions récentes</h3></header><div className="divide-y divide-slate-100">{[...data.sessions].sort((a, b) => String(b.date_debut).localeCompare(String(a.date_debut))).slice(0, 5).map((session) => <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold text-slate-800">{session.libelle}</p><p className="mt-1 text-xs text-slate-500">{session.code} · {session.annee_libelle || 'Année'} · {session.type_formation_libelle || 'Formation'} · {session.niveau_libelle || 'Niveau'}</p></div><span className="border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">{session.statut}</span></div>)}{data.sessions.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Aucune session en base.</p>}</div></section>
    </>}
  </section>;
}
