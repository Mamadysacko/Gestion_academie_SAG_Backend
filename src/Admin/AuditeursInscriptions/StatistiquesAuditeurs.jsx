import { useState, useMemo } from 'react';
import {
  GraduationCap,
  UserCheck,
  AlertTriangle,
  TrendingUp,
  BarChart2,
  PieChart,
  School,
  CheckCircle,
  Percent,
  FileSpreadsheet,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
  Search,
} from 'lucide-react';
import { calculateStatistics, exportStatistiquesToCSV } from './auditeursHelpers';
import { getCurrentSchoolYear } from '../../utils/schoolYear';

export default function StatistiquesAuditeurs({ data }) {
  const [selectedYearId, setSelectedYearId] = useState('');
  const currentYear = getCurrentSchoolYear(data.annees);
  const effectiveYearId = selectedYearId && data.annees.some((year) => String(year.id) === selectedYearId)
    ? selectedYearId
    : String(currentYear?.id || '');

  const [classFilter, setClassFilter] = useState('');
  const [sortByRate, setSortByRate] = useState(false);

  const stats = useMemo(() => {
    return calculateStatistics(data, effectiveYearId);
  }, [data, effectiveYearId]);

  // Filtre et tri des statistiques de classe
  const filteredClassStats = useMemo(() => {
    let list = [...stats.classStats];
    if (classFilter.trim()) {
      const term = classFilter.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.libelle.toLowerCase().includes(term) ||
          c.code.toLowerCase().includes(term) ||
          c.formation.toLowerCase().includes(term) ||
          c.formateur.toLowerCase().includes(term)
      );
    }
    if (sortByRate) {
      list.sort((a, b) => b.tauxRemplissage - a.tauxRemplissage);
    }
    return list;
  }, [stats.classStats, classFilter, sortByRate]);

  const handleExportCSV = () => {
    exportStatistiquesToCSV(stats, stats.activeYear?.libelle || 'annee_scolaire');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Year Filter & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 print:border-none">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">3.7 Indicateurs & Statistiques Académiques</h2>
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-800 border border-teal-200">
              {stats.activeYear?.libelle} {stats.activeYear?.statut === 1 ? '(Année active)' : ''}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Suivi des effectifs, taux de remplissage, parité de genre, typologie des inscriptions et évolution pluriannuelle.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <label className="text-xs font-semibold text-slate-600">Année :</label>
          <select
            value={effectiveYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-teal-600 focus:outline-none"
          >
            {data.annees.map((y) => (
              <option key={y.id} value={String(y.id)}>
                {y.libelle} {y.statut === 1 ? '· (Active)' : ''}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
            Exporter CSV
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" />
            Imprimer
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (8 Indicateurs clés) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* 1. Total Auditeurs Inscrits (Année active) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-teal-700">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Inscrits Année</span>
            <GraduationCap className="h-4 w-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums text-slate-900">{stats.totalInscritsAnnee}</span>
            <span className="text-xs text-slate-400">élèves</span>
          </div>
          <p className="mt-1 text-[11px] text-teal-700 font-medium">
            dont <strong>{stats.totalInscritsActifs}</strong> actifs en classe
          </p>
        </div>

        {/* 2. Taux de Remplissage Global */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Taux Remplissage</span>
            <Percent className="h-4 w-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-slate-900">{stats.globalRate}%</span>
            <span className="text-xs text-slate-400">({stats.totalEnrolled}/{stats.totalCapacity})</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                stats.globalRate >= 85 ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(stats.globalRate, 100)}%` }}
            />
          </div>
        </div>

        {/* 3. Nouvelles Inscriptions */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nouvelles Inscriptions</span>
            <UserCheck className="h-4 w-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums text-slate-900">{stats.nouvellesInscriptions}</span>
            <span className="text-xs text-emerald-600 font-semibold">({stats.pctNouvelles}%)</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Primo-arrivants</p>
        </div>

        {/* 4. Réinscriptions */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-purple-700">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Réinscriptions</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums text-slate-900">{stats.reinscriptions}</span>
            <span className="text-xs text-purple-600 font-semibold">({stats.pctReinscriptions}%)</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Fidélisation anciens</p>
        </div>

        {/* 5. Abandons */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Abandons</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums text-rose-700">{stats.abandons}</span>
            <span className="text-xs text-rose-600 font-semibold">(Taux : {stats.tauxAbandon}%)</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Départs enregistrés</p>
        </div>

        {/* 6. Formations Terminées / En attente */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">En attente / Réussite</span>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-amber-800">{stats.enAttente}</span>
            <span className="text-xs text-slate-400">att. · <strong>{stats.terminees}</strong> validés</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">{stats.transferees} transferts de classe</p>
        </div>
      </div>

      {/* Two Column Layout: Effectif par classe (2 cols) & Répartition par sexe (1 col) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Section Effectif et Taux de Remplissage par Classe */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <School className="h-4 w-4 text-teal-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Effectif & Taux de Remplissage par Classe ({stats.activeYear?.libelle})
              </h3>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrer classe..."
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="rounded-md border border-slate-300 py-1 pl-8 pr-2 text-xs focus:border-teal-600 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setSortByRate(!sortByRate)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                  sortByRate
                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Trier par taux
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredClassStats.map((cls) => {
              const isFull = cls.effectif >= cls.capacite;
              const isWarning = cls.tauxRemplissage >= 80;
              return (
                <div key={cls.id} className="py-3 space-y-2 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{cls.libelle}</span>
                        <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                          {cls.code}
                        </span>
                        {isFull ? (
                          <span className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                            Complet (100%)
                          </span>
                        ) : isWarning ? (
                          <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Presque plein
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Places disponibles
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {cls.formation} · Formateur : {cls.formateur} · {cls.salle}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold tabular-nums text-slate-900">
                        {cls.effectif} / {cls.capacite} places
                      </span>
                      <span className="ml-2 text-xs font-bold text-teal-800 tabular-nums">
                        ({cls.tauxRemplissage}%)
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {cls.placesRestantes > 0
                          ? `${cls.placesRestantes} place(s) libre(s)`
                          : '0 place libre'} · <span>{cls.classFemale} F / {cls.classMale} M</span>
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar with Color Indicator */}
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isFull
                          ? 'bg-rose-600'
                          : isWarning
                          ? 'bg-amber-500'
                          : 'bg-teal-600'
                      }`}
                      style={{ width: `${Math.min(cls.tauxRemplissage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {filteredClassStats.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400">
                Aucune classe ne correspond au filtre de recherche.
              </p>
            )}
          </div>
        </div>

        {/* Section Répartition par sexe & Typologie */}
        <div className="space-y-6">
          {/* Répartition par Sexe */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-teal-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Répartition par Sexe (Parité)
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                Ratio F/M : {stats.ratioFemmeHomme}
              </span>
            </div>

            <div className="space-y-3">
              {/* Dual Visual Bar */}
              <div className="flex h-5 w-full overflow-hidden rounded-full shadow-inner">
                <div
                  className="bg-teal-600 text-[10px] font-bold text-white flex items-center justify-center transition-all duration-500"
                  style={{ width: `${stats.femalePercent}%` }}
                  title={`Femmes: ${stats.femalePercent}%`}
                >
                  {stats.femalePercent > 15 ? `F ${stats.femalePercent}%` : ''}
                </div>
                <div
                  className="bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center transition-all duration-500"
                  style={{ width: `${stats.malePercent}%` }}
                  title={`Hommes: ${stats.malePercent}%`}
                >
                  {stats.malePercent > 15 ? `M ${stats.malePercent}%` : ''}
                </div>
              </div>

              {/* Legend & Details */}
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-3">
                  <div className="flex items-center gap-1.5 font-bold text-teal-900">
                    <span className="h-2.5 w-2.5 rounded-full bg-teal-600" />
                    <span>Féminin (F)</span>
                  </div>
                  <div className="mt-1 text-xl font-bold text-teal-950 tabular-nums">
                    {stats.femaleCount} <span className="text-xs font-normal text-teal-700">({stats.femalePercent}%)</span>
                  </div>
                </div>

                <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                    <span>Masculin (M)</span>
                  </div>
                  <div className="mt-1 text-xl font-bold text-indigo-950 tabular-nums">
                    {stats.maleCount} <span className="text-xs font-normal text-indigo-700">({stats.malePercent}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Types d'inscriptions */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
              Types d’inscription ({stats.activeYear?.libelle})
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Nouvelles inscriptions
                </span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {stats.nouvellesInscriptions} ({stats.pctNouvelles}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  Réinscriptions (Anciens)
                </span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {stats.reinscriptions} ({stats.pctReinscriptions}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Transferts de classe
                </span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {stats.transferts}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Taux d'abandon
                </span>
                <span className="font-bold text-rose-700 tabular-nums">
                  {stats.tauxAbandon}% ({stats.abandons} abandons)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Year Evolution Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-teal-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Évolution pluriannuelle des effectifs (Suivi académique)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Comparatif historique sur {stats.multiYearEvolution.length} promotions
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {stats.multiYearEvolution.map((yearItem) => (
            <div
              key={yearItem.id}
              className={`rounded-xl border p-4 transition ${
                yearItem.activeYear
                  ? 'border-teal-400 bg-teal-50/40 ring-1 ring-teal-300'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">{yearItem.libelle}</span>
                {yearItem.activeYear ? (
                  <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                    Année en cours
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    Clôturée
                  </span>
                )}
              </div>

              {/* Croissance vs N-1 */}
              {yearItem.growthRate != null && (
                <div className="mt-2 flex items-center gap-1 text-xs font-semibold">
                  {yearItem.growthRate >= 0 ? (
                    <span className="inline-flex items-center text-emerald-700">
                      <ArrowUpRight className="h-3.5 w-3.5" /> +{yearItem.growthRate}% vs année précédente
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-rose-700">
                      <ArrowDownRight className="h-3.5 w-3.5" /> {yearItem.growthRate}% vs année précédente
                    </span>
                  )}
                </div>
              )}

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Auditeurs inscrits :</span>
                  <span className="font-bold text-slate-900 tabular-nums">{yearItem.totalInscrits}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Inscriptions actives :</span>
                  <span className="font-semibold text-emerald-700 tabular-nums">{yearItem.actifs}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Cycles validés / Terminés :</span>
                  <span className="font-semibold text-blue-700 tabular-nums">{yearItem.termines}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Abandons :</span>
                  <span className="font-semibold text-rose-600 tabular-nums">{yearItem.abandons}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
