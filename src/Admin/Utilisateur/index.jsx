import { useCallback, useEffect, useState } from 'react';
import { useLiveRefresh } from '../../composant/useLiveRefresh';
import {
  Users, Shield, Layers, Plus, Check, LayoutDashboard
} from 'lucide-react';
import DashboardUtilisateurs from './DashboardUtilisateurs';
import ListeUtilisateurs from './ListeUtilisateurs';
import GestionRoles from './GestionRoles';
import MatricePermissions from './MatricePermissions';
import ModalUtilisateur from './ModalUtilisateur';
import ModalRole from './ModalRole';
import { rolesApi, usersApi } from '../../config/apiService';
import { useConfirm } from '../../composant/confirmContext';
import SubTabNav from '../../composant/SubTabNav';

const roleColors = [
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-amber-100 text-amber-700 border-amber-200',
];

const normalizeRole = (role, index) => ({
  ...role,
  id: Number(role.id),
  usersCount: Number(role.users_count || 0),
  isSystem: role.code === 'admin',
  permissions: role.permissions || {},
  badgeColor: roleColors[index % roleColors.length],
});

const normalizeUser = (user) => ({
  ...user,
  id: Number(user.id),
  role_id: Number(user.role_id),
  actif: Number(user.actif),
  avatar: `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase(),
});

export default function UtilisateurModule({ onBack, currentUser, openCreateUser = false, onCreateUserHandled, initialTab }) {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState(initialTab || 'dashboard');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Modals state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  // Notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  const loadData = useCallback(async () => {
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        usersApi.getAll(),
        rolesApi.getAll(),
      ]);
      setUsers((usersResponse.data || []).map(normalizeUser));
      setRoles((rolesResponse.data || []).map(normalizeRole));
      setLoadError('');
    } catch (error) {
      setLoadError(error.message || 'Impossible de charger les utilisateurs et les rôles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useLiveRefresh(() => loadData(), { intervalMs: 60000 });

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadData();
    });
    return () => {
      active = false;
    };
  }, [loadData]);

  const hasAccess = (action) =>
    currentUser?.role === 'admin' ||
    currentUser?.role_code === 'admin' ||
    (currentUser?.permissions?.utilisateurs || []).includes(action);

  // Tab definitions
  const tabs = [
    { id: 'dashboard', label: 'Vue d’ensemble', icon: LayoutDashboard },
    { id: 'liste', label: 'Comptes Utilisateurs', icon: Users, badge: users.length },
    { id: 'roles', label: 'Rôles & Profils', icon: Shield, badge: roles.length },
    { id: 'matrice', label: 'Matrice des Droits', icon: Layers },
  ];

  /* ═══════════════ ACTIONS UTILISATEUR ═══════════════ */
  const handleAddUser = () => {
    setEditingUser(null);
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (userData) => {
    try {
      const payload = {
        nom: userData.nom,
        prenom: userData.prenom,
        email: userData.email || null,
        telephone: userData.telephone || null,
        password: userData.password,
        role_id: userData.role_id,
        actif: userData.actif,
      };
      if (userData.role_code === 'formateur') payload.matricule = userData.matricule;
      if (editingUser) {
        await usersApi.update(editingUser.id, payload);
        showToast(`Compte de ${userData.prenom} ${userData.nom} mis à jour.`);
      } else {
        await usersApi.create(payload);
        showToast(`Utilisateur ${userData.prenom} ${userData.nom} créé avec succès.`);
      }
      setIsUserModalOpen(false);
      onCreateUserHandled?.();
      await loadData();
    } catch (error) {
      showToast(error.message || 'Échec de l’enregistrement du compte.', 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    if (await confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de ${target.prenom} ${target.nom} ?`)) {
      usersApi.delete(userId)
        .then(async (response) => {
          showToast(response.message || 'Compte utilisateur supprimé.');
          await loadData();
        })
        .catch((error) => showToast(error.message || 'La suppression a échoué.', 'error'));
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const response = await usersApi.toggleActif(userId);
      showToast(response.message || 'Statut du compte mis à jour.');
      await loadData();
    } catch (error) {
      showToast(error.message || 'La modification du statut a échoué.', 'error');
    }
  };

  const handleResetPassword = (user) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let newPass = '';
    for (let i = 0; i < 10; i++) newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    
    usersApi.update(user.id, { password: newPass })
      .then(() => {
        alert(`Nouveau mot de passe pour ${user.prenom} ${user.nom} :\n\n${newPass}\n\nTransmettez-le à l’utilisateur de manière sécurisée.`);
        showToast(`Mot de passe réinitialisé pour ${user.email || user.telephone}.`);
      })
      .catch((error) => showToast(error.message || 'La réinitialisation du mot de passe a échoué.', 'error'));
  };

  /* ═══════════════ ACTIONS RÔLES ═══════════════ */
  const handleAddRole = () => {
    setEditingRole(null);
    setIsRoleModalOpen(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async (roleData) => {
    try {
      const payload = { code: roleData.code, nom: roleData.nom };
      if (!editingRole?.isSystem) payload.permissions = roleData.permissions;
      if (editingRole) {
        await rolesApi.update(editingRole.id, payload);
        showToast(`Rôle ${roleData.nom} mis à jour.`);
      } else {
        await rolesApi.create(payload);
        showToast(`Nouveau rôle ${roleData.nom} créé.`);
      }
      setIsRoleModalOpen(false);
      await loadData();
    } catch (error) {
      showToast(error.message || 'Échec de l’enregistrement du rôle.', 'error');
    }
  };

  const handleDeleteRole = async (roleId) => {
    const target = roles.find((r) => r.id === roleId);
    if (!target) return;
    if (await confirm(`Supprimer le rôle "${target.nom}" ?`)) {
      rolesApi.delete(roleId)
        .then(async (response) => {
          showToast(response.message || 'Rôle supprimé.');
          await loadData();
        })
        .catch((error) => showToast(error.message || 'La suppression du rôle a échoué.', 'error'));
    }
  };

  const handleUpdateRolePermissions = async (roleId, updatedPermissions) => {
    try {
      await rolesApi.updatePermissions(roleId, updatedPermissions);
      await loadData();
      showToast('Permissions mises à jour pour le rôle.');
      return true;
    } catch (error) {
      showToast(error.message || 'La mise à jour des permissions a échoué.', 'error');
      return false;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen space-y-6 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-[600] flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-slate-700 animate-in slide-in-from-top-4">
          <Check className={`w-4 h-4 ${toast.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Top */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {onBack && (
            <button
              onClick={onBack}
              className="mb-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1"
            >
              ← Retour au tableau de bord
            </button>
          )}
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-600" />
            Gestion des Utilisateurs & Rôles
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Comptes et permissions enregistrés en base de données, appliqués côté API et filtrés selon le rôle connecté.
          </p>
        </div>

        {loadError && (
          <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <span>{loadError}</span>
            <button type="button" onClick={loadData} className="font-bold underline">Réessayer</button>
          </div>
        )}
        {loading && <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Chargement des comptes et des rôles…</div>}

        <div className="flex items-center gap-2">
          {hasAccess('create') && roles.length > 0 && <button
            onClick={handleAddUser}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un Utilisateur</span>
          </button>}
        </div>
      </div>

      {/* Sub-tabs Navigation Bar */}
      <SubTabNav label="Sections des utilisateurs et rôles" items={tabs} active={activeTab} onChange={setActiveTab} />

      {/* Sub-tab Content Area */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm min-h-[500px]">
        {activeTab === 'dashboard' && (
          <DashboardUtilisateurs
            users={users}
            roles={roles}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'liste' && (
          <ListeUtilisateurs
            users={users}
            roles={roles}
            onAddUser={handleAddUser}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
            onToggleStatus={handleToggleStatus}
            onResetPassword={handleResetPassword}
            canCreate={hasAccess('create') && roles.length > 0}
            canUpdate={hasAccess('update')}
            canDelete={hasAccess('delete')}
            canExport={hasAccess('export')}
          />
        )}

        {activeTab === 'roles' && (
          <GestionRoles
            roles={roles}
            users={users}
            onAddRole={handleAddRole}
            onEditRole={handleEditRole}
            onDeleteRole={handleDeleteRole}
            onNavigateMatrix={() => setActiveTab('matrice')}
            canCreate={hasAccess('create')}
            canUpdate={hasAccess('update')}
            canDelete={hasAccess('delete')}
          />
        )}

        {activeTab === 'matrice' && (
          <MatricePermissions
            key={JSON.stringify(roles.map((role) => [role.id, role.permissions]))}
            roles={roles}
            onUpdateRolePermissions={handleUpdateRolePermissions}
            canUpdate={hasAccess('update')}
          />
        )}

      </div>

      {/* Modals */}
      <ModalUtilisateur
        key={`${isUserModalOpen || (openCreateUser && roles.length > 0) ? 'open' : 'closed'}-${editingUser?.id ?? 'new'}-${openCreateUser ? 'formateur' : 'default'}`}
        isOpen={isUserModalOpen || (openCreateUser && hasAccess('create') && roles.length > 0)}
        onClose={() => {
          setIsUserModalOpen(false);
          if (openCreateUser) onCreateUserHandled?.();
        }}
        onSave={handleSaveUser}
        editingUser={isUserModalOpen ? editingUser : null}
        roles={roles}
        defaultRoleCode={openCreateUser ? 'formateur' : undefined}
      />

      <ModalRole
        key={`${isRoleModalOpen ? 'open' : 'closed'}-${editingRole?.id ?? 'new'}`}
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        onSave={handleSaveRole}
        editingRole={editingRole}
      />
    </div>
  );
}
