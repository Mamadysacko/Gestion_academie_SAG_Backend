import { useState, useMemo } from 'react';
import {
  Search,
  ArrowDownToLine,
  UserPlus,
  Eye,
  Edit2,
  GraduationCap,
  Trash2,
  ArrowUpDown,
} from 'lucide-react';
import {
  getAuditeurFullDetails,
  getStatutBadgeConfig,
  exportAuditeursToCSV,
} from './auditeursHelpers';
import { getCurrentSchoolYear } from '../../utils/schoolYear';

export default function ListeAuditeurs({
  data,
  onNewAuditeur,
  onEditAuditeur,
  onDeleteAuditeur,
  onOpenDossier,
  onOpenInscription,
  onOpenStatutChange,
  currentUser,
}) {
  const isAdmin = currentUser?.role_code === 'admin' || currentUser?.role === 'admin';
  const canCreate = isAdmin || (currentUser?.permissions?.auditeurs || []).includes('create');
  const canUpdate = isAdmin || (currentUser?.permissions?.auditeurs || []).includes('update');
  const canDelete = isAdmin || (currentUser?.permissions?.auditeurs || []).includes('delete');
  const canWriteEnrollment = canCreate || canUpdate;
  const [search, setSearch] = useState('');
  const [filterClasse, setFilterClasse] = useState('ALL');
  const [filterSexe, setFilterSexe] = useState('ALL');
  const [filterStatut, setFilterStatut] = useState('ALL');
  const [filterAnnee, setFilterAnnee] = useState('');
  const currentYear = getCurrentSchoolYear(data.annees);
  const effectiveYearFilter = filterAnnee === 'ALL'
    ? 'ALL'
    : filterAnnee && data.annees.some((year) => String(year.id) === filterAnnee)
      ? filterAnnee
      : String(currentYear?.id || 'ALL');

  const [sortField, setSortField] = useState('nom');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  // Construction de la liste enrichie pour l'année sélectionnée
  const detailedList = useMemo(() => {
    return data.auditeurs.map((auditeur) =>
      getAuditeurFullDetails(auditeur, data, effectiveYearFilter === 'ALL' ? null : effectiveYearFilter)
    );
  }, [data, effectiveYearFilter]);

  // Filtrage
  const filteredList = useMemo(() => {
    return detailedList.filter((item) => {
      // Filtre Classe
      if (filterClasse !== 'ALL') {
        if (filterClasse === 'NONE') {
          if (item.currentGroup) return false;
        } else if (String(item.currentGroup?.id) !== filterClasse) {
          return false;
        }
      }

      // Filtre Sexe
      if (filterSexe !== 'ALL' && item.sexe !== filterSexe) {
        return false;
      }

      // Filtre Statut
      if (filterStatut !== 'ALL' && item.currentStatut !== filterStatut) {
        return false;
      }

      // Recherche par nom, prénom, matricule ou téléphone
      if (search.trim()) {
        const term = search.trim().toLowerCase();
        const fullName = `${item.nom} ${item.prenom}`.toLowerCase();
        const mat = (item.matricule || '').toLowerCase();
        const phone = (item.telephone || '').toLowerCase();
        const email = (item.email || '').toLowerCase();
        if (!fullName.includes(term) && !mat.includes(term) && !phone.includes(term) && !email.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [detailedList, filterClasse, filterSexe, filterStatut, search]);

  // Tri multicritères
  const sortedList = useMemo(() => {
    return [...filteredList].sort((a, b) => {
      let valA;
      let valB;

      switch (sortField) {
        case 'matricule':
          valA = a.matricule || '';
          valB = b.matricule || '';
          break;
        case 'classe':
          valA = a.currentGroup?.libelle || 'ZZZ';
          valB = b.currentGroup?.libelle || 'ZZZ';
          break;
        case 'statut':
          valA = a.currentStatut || '';
          valB = b.currentStatut || '';
          break;
        case 'nom':
        default:
          valA = `${a.nom} ${a.prenom}`.toLowerCase();
          valB = `${b.nom} ${b.prenom}`.toLowerCase();
          break;
      }

      const cmp = valA.localeCompare(valB, 'fr');
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredList, sortField, sortDirection]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExportCSV = () => {
    const selectedYear = data.annees.find((y) => String(y.id) === effectiveYearFilter);
    exportAuditeursToCSV(sortedList, selectedYear?.libelle || 'toutes');
  };

  const activeYearObj = data.annees.find((y) => String(y.id) === effectiveYearFilter);

  return (
    <div className="space-y-5">
      {/* Module Action Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Liste des Auditeurs</h2>
          <p className="text-xs text-slate-500">
            Consultation, recherche multicritères, gestion des fiches élèves et inscriptions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={sortedList.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <ArrowDownToLine className="h-4 w-4 text-slate-500" />
            Export Excel / CSV
          </button>
          <button
            type="button"
            onClick={onNewAuditeur}
            hidden={!canCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 transition"
          >
            <UserPlus className="h-4 w-4" />
            Nouvel auditeur
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        {/* Search input + Year Select */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par matricule, nom, prénom, téléphone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Année scolaire */}
            <select
              value={effectiveYearFilter}
              onChange={(e) => setFilterAnnee(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium focus:border-teal-600 focus:outline-none"
            >
              <option value="ALL">Toutes les années</option>
              {data.annees.map((y) => (
                <option key={y.id} value={String(y.id)}>
                  Année : {y.libelle} {y.statut === 1 ? '(Active)' : ''}
                </option>
              ))}
            </select>

            {/* Classe */}
            <select
              value={filterClasse}
              onChange={(e) => setFilterClasse(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium focus:border-teal-600 focus:outline-none"
            >
              <option value="ALL">Toutes les classes</option>
              <option value="NONE">Sans classe affectée</option>
              {data.groupes.map((g) => (
                <option key={g.id} value={String(g.id)}>
                  {g.libelle}
                </option>
              ))}
            </select>

            {/* Sexe */}
            <select
              value={filterSexe}
              onChange={(e) => setFilterSexe(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium focus:border-teal-600 focus:outline-none"
            >
              <option value="ALL">Tous les sexes</option>
              <option value="F">Féminin (F)</option>
              <option value="M">Masculin (M)</option>
            </select>

            {/* Statut d'inscription */}
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium focus:border-teal-600 focus:outline-none"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="active">Active</option>
              <option value="terminee">Terminée</option>
              <option value="abandonnee">Abandonnée</option>
              <option value="annulee">Annulée</option>
              <option value="Non inscrit">Non inscrit</option>
            </select>
          </div>
        </div>

        {/* Counter & Active filters tag */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              <strong>{sortedList.length}</strong> auditeur(s) affiché(s) sur {data.auditeurs.length}
            </span>
            {(search || filterClasse !== 'ALL' || filterSexe !== 'ALL' || filterStatut !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setFilterClasse('ALL');
                  setFilterSexe('ALL');
                  setFilterStatut('ALL');
                }}
                className="text-teal-700 hover:underline font-semibold"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
          <span>Année scolaire de référence : <strong>{activeYearObj?.libelle || 'Toutes'}</strong></span>
        </div>
      </div>

      {/* Table of Students */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th
                  onClick={() => toggleSort('matricule')}
                  className="px-4 py-3 font-bold cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Matricule</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('nom')}
                  className="px-4 py-3 font-bold cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Nom & Prénom</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-3 py-3 font-bold">Genre</th>
                <th
                  onClick={() => toggleSort('classe')}
                  className="px-4 py-3 font-bold cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Classe actuelle</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('statut')}
                  className="px-4 py-3 font-bold cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Statut</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-4 py-3 font-bold">Téléphone / Contact</th>
                <th className="px-4 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedList.map((item) => {
                const stCfg = getStatutBadgeConfig(item.currentStatut);

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    {/* Matricule */}
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">
                      <button
                        type="button"
                        onClick={() => onOpenDossier(item)}
                        className="text-teal-800 hover:underline"
                        title="Ouvrir le dossier complet"
                      >
                        {item.matricule}
                      </button>
                    </td>

                    {/* Nom & Prénom */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                          {item.prenom?.charAt(0)}{item.nom?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">
                            {item.nom} {item.prenom}
                          </p>
                          {(item.position || item.type_employe_libelle) && (
                            <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-52">
                              {[item.position, item.type_employe_libelle].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Sexe */}
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center justify-center rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${
                          item.sexe === 'F'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : item.sexe === 'M'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-50 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {item.sexe || '—'}
                      </span>
                    </td>

                    {/* Classe actuelle */}
                    <td className="px-4 py-3">
                      {item.currentGroup ? (
                        <div>
                          <span className="font-semibold text-slate-900">{item.currentGroup.libelle}</span>
                          <p className="text-[10px] text-slate-500">{item.currentGroup.formation}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Non affecté</span>
                      )}
                    </td>

                    {/* Statut d'inscription */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={!canWriteEnrollment}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.currentEnrollment) {
                            if (canUpdate) onOpenStatutChange(item.currentEnrollment, item, item.currentGroup);
                          } else if (canCreate) {
                            onOpenInscription(item);
                          }
                        }}
                        title="Cliquer pour modifier le statut"
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border transition hover:opacity-80 ${stCfg.bg} ${stCfg.text} ${stCfg.border}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${stCfg.dot}`} />
                        {item.currentStatut}
                      </button>
                    </td>

                    {/* Téléphone */}
                    <td className="px-4 py-3 text-slate-700">
                      <div>{item.telephone || '—'}</div>
                      {item.email && <div className="text-[10px] text-slate-400 truncate max-w-36">{item.email}</div>}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Bouton Voir / Dossier */}
                        <button
                          type="button"
                          onClick={() => onOpenDossier(item)}
                          title="Consulter le dossier complet & historique"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-teal-50 hover:text-teal-800 transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Bouton Inscrire / Transférer */}
                        <button
                          type="button"
                          disabled={!canWriteEnrollment}
                          onClick={() => onOpenInscription(item)}
                          title="Inscrire ou transférer de classe"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-teal-50 hover:text-teal-800 transition"
                        >
                          <GraduationCap className="h-4 w-4" />
                        </button>

                        {/* Bouton Modifier */}
                        <button
                          type="button"
                          hidden={!canUpdate}
                          onClick={() => onEditAuditeur(item)}
                          title="Modifier les coordonnées de l’auditeur"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        {/* Bouton Supprimer */}
                        <button
                          type="button"
                          hidden={!canDelete}
                          onClick={() => onDeleteAuditeur(item)}
                          title="Supprimer la fiche élève"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
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

        {sortedList.length === 0 && (
          <div className="p-12 text-center text-slate-400 text-xs">
            Aucun auditeur ne correspond aux critères de recherche.
          </div>
        )}
      </div>
    </div>
  );
}
