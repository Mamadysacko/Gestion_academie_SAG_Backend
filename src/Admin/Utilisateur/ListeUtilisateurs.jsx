import { useState, useMemo } from 'react';
import {
  Users, Search, Plus, Edit2, Trash2, KeyRound,
  UserCheck, UserX, Download, Mail, Phone, Shield
} from 'lucide-react';
import { exportTable } from '../../utils/exportExcel';
import Pagination from '../../composant/Pagination';
import { usePagination } from '../../composant/usePagination';

export default function ListeUtilisateurs({
  users,
  roles,
  onAddUser,
  onEditUser,
  onDeleteUser,
  onToggleStatus,
  onResetPassword,
  canCreate = false,
  canUpdate = false,
  canDelete = false,
  canExport = false,
}) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filtrage
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const term = search.toLowerCase();
      const matchSearch =
        (u.nom || '').toLowerCase().includes(term) ||
        (u.prenom || '').toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (u.telephone && u.telephone.includes(term));

      const matchRole = roleFilter === 'all' || String(u.role_id) === String(roleFilter);
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'actif' && u.actif === 1) ||
        (statusFilter === 'inactif' && u.actif === 0);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);
  const { pageRows, pagerProps } = usePagination(filteredUsers, 25);

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredUsers.length) return;
    const headers = ['ID', 'Nom', 'Prénom', 'Email', 'Téléphone', 'Rôle', 'Statut', 'Dernière Connexion'];
    const rows = filteredUsers.map((u) => [
      u.id,
      u.nom,
      u.prenom,
      u.email || '',
      u.telephone || '',
      u.role_nom,
      u.actif === 1 ? 'Actif' : 'Suspendu',
      u.last_login || '',
    ]);

    exportTable({
      filename: `Utilisateurs_Academie_${new Date().toISOString().slice(0, 10)}`,
      title: 'Liste des utilisateurs',
      headings: headers,
      rows,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Répertoire des Comptes Utilisateurs ({filteredUsers.length})
          </h2>
          <p className="text-xs text-slate-500">
            Gestion des profils d'accès, permissions et états des comptes administratifs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {canExport && <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exporter CSV</span>
          </button>}

          {canCreate && <button
            onClick={onAddUser}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvel Utilisateur</span>
          </button>}
        </div>
      </div>

      {/* Barre de Recherche & Filtres */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom, email ou téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:border-indigo-600"
          />
        </div>

        {/* Filtre Rôle */}
        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-xs">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-transparent border-0 outline-none text-slate-700 font-medium cursor-pointer"
          >
            <option value="all">Tous les rôles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nom}
              </option>
            ))}
          </select>
        </div>

        {/* Filtre Statut */}
        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-xs">
          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent border-0 outline-none text-slate-700 font-medium cursor-pointer"
          >
            <option value="all">Tous les statuts</option>
            <option value="actif">Actif uniquement</option>
            <option value="inactif">Suspendu uniquement</option>
          </select>
        </div>
      </div>

      {/* Table des Utilisateurs */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <th className="py-3 px-4">Utilisateur</th>
              <th className="py-3 px-4">Coordonnées</th>
              <th className="py-3 px-4">Rôle / Profil</th>
              <th className="py-3 px-4">Statut</th>
              <th className="py-3 px-4">Dernière Connexion</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-600 text-sm">Aucun utilisateur trouvé</p>
                  <p className="text-xs">Modifiez vos filtres de recherche ou ajoutez un nouveau compte.</p>
                </td>
              </tr>
            ) : (
              pageRows.map((u) => {
                const isActif = u.actif === 1;
                const roleObj = roles.find((r) => r.id === u.role_id);
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    {/* Nom + Avatar */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 font-extrabold flex items-center justify-center text-xs shadow-sm">
                          {u.avatar || u.nom.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{u.prenom} {u.nom}</p>
                          <p className="text-[11px] text-slate-400 font-mono">ID: #{u.id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Email & Téléphone */}
                    <td className="py-3.5 px-4 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[180px]">{u.email}</span>
                      </div>
                      {u.telephone && (
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{u.telephone}</span>
                        </div>
                      )}
                    </td>

                    {/* Rôle */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleObj?.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {u.role_nom}
                      </span>
                      {u.formateur_matricule && (
                        <p className="mt-1 text-[10px] text-slate-500 font-mono">
                          Matricule : {u.formateur_matricule}
                        </p>
                      )}
                    </td>

                    {/* Statut */}
                    <td className="py-3.5 px-4">
                      {canUpdate ? <button
                        onClick={() => onToggleStatus(u.id)}
                        title="Cliquer pour basculer le statut"
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                          isActif
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        {isActif ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                        <span>{isActif ? 'Actif' : 'Suspendu'}</span>
                      </button> : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          isActif ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>{isActif ? 'Actif' : 'Suspendu'}</span>
                      )}
                    </td>

                    {/* Dernière connexion */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {u.last_login || 'Jamais'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canUpdate && <button
                          onClick={() => onResetPassword(u)}
                          title="Réinitialiser mot de passe"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>}
                        {canUpdate && <button
                          onClick={() => onEditUser(u)}
                          title="Modifier"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>}
                        {canDelete && <button
                          onClick={() => onDeleteUser(u.id)}
                          title="Supprimer"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <Pagination {...pagerProps} />
      </div>
    </div>
  );
}
