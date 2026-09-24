import { useState, useEffect } from 'react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import {
  Loader2,
  Plus,
  Trash2,
  Shield
} from 'lucide-react';

export function RolesSection({ roles, permissions, permByRole, rolesByUser, staffUsers, onReload }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showUserAssign, setShowUserAssign] = useState(false);
  const toast = useToast();

  const permsByModule = {};
  for (const p of permissions) {
    const mod = p.module_code || 'general';
    if (!permsByModule[mod]) permsByModule[mod] = [];
    permsByModule[mod].push(p);
  }

  const handleTogglePermission = async (roleId, permissionId, enabled) => {
    const current = permByRole[roleId] || [];
    const updated = enabled
      ? [...current, permissionId]
      : current.filter(id => id !== permissionId);
    try {
      await api.roles.setPermissions(roleId, updated);
      await api.refreshSession();
      toast.success('Permiso actualizado');
      onReload();
    } catch (e) {
      toast.error('Error al actualizar permiso');
    }
  };

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`¿Eliminar el rol "${role.name}"?`)) return;
    try {
      await api.roles.delete(role.id);
      toast.success('Rol eliminado');
      setSelectedRole(null);
      onReload();
    } catch (e) {
      toast.error(e.message || 'Error al eliminar rol');
    }
  };

  if (showCreate) {
    return (
      <CreateRoleModal
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); onReload(); }}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Roles y Permisos</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Rol
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lista de roles */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Roles</h3>
          <div className="space-y-2">
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className={`w-full text-left p-3 rounded-xl transition-all ${
                  selectedRole?.id === role.id
                    ? 'bg-primary-50 border-2 border-primary-500'
                    : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{role.name}</p>
                    <p className="text-xs text-gray-500">{role.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      role.is_system ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {role.is_system ? 'Sistema' : 'Personalizado'}
                    </span>
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(permByRole[role.id] || []).length > 0 && (
                    <span className="text-xs text-gray-400">
                      {(permByRole[role.id] || []).length} permisos
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detalle del rol seleccionado */}
        <div className="lg:col-span-2 bg-white rounded-xl p-4 border border-gray-100">
          {selectedRole ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selectedRole.name}</h3>
                  <p className="text-sm text-gray-500">{selectedRole.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowUserAssign(true)}
                    className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                  >
                    Asignar Usuarios
                  </button>
                  {!selectedRole.is_system && (
                    <button
                      onClick={() => handleDeleteRole(selectedRole)}
                      className="text-sm px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {showUserAssign && (
                <AssignUsersModal
                  role={selectedRole}
                  staffUsers={staffUsers}
                  rolesByUser={rolesByUser}
                  roles={roles}
                  onClose={() => setShowUserAssign(false)}
                  onAssigned={onReload}
                />
              )}

              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {Object.entries(permsByModule).map(([module, perms]) => (
                  <div key={module}>
                    <h4 className="text-sm font-semibold text-gray-700 uppercase mb-2">
                      {module === 'restaurant' ? 'Restaurante' :
                       module === 'erp' ? 'Inventario/ERP' :
                       module === 'crm' ? 'CRM' :
                       module === 'pms' ? 'PMS' : 'General'}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {perms.map(p => {
                        const enabled = (permByRole[selectedRole.id] || []).includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                              enabled
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={(e) => handleTogglePermission(selectedRole.id, p.id, e.target.checked)}
                              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{p.name}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Selecciona un rol para ver y editar sus permisos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function CreateRoleModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error('Nombre y slug son requeridos');
      return;
    }
    setLoading(true);
    try {
      await api.roles.create({ name: name.trim(), slug: slug.trim(), description: description.trim() });
      toast.success('Rol creado');
      onCreated();
    } catch (e) {
      toast.error(e.message || 'Error al crear rol');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl p-6">
        <h3 className="font-bold text-gray-900 text-lg mb-4">Nuevo Rol</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')); }}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
              placeholder="Ej: Capturista"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (identificador)</label>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none bg-gray-50 text-gray-500"
              placeholder="capturista"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
              placeholder="Descripción opcional"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl">
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex-1 py-3 bg-primary-600 text-white font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear Rol'}
          </button>
        </div>
      </div>
    </div>
  );
}


function AssignUsersModal({ role, staffUsers, rolesByUser, roles, onClose, onAssigned }) {
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const toast = useToast();

  useEffect(() => {
    const userIds = [];
    for (const [uid, rids] of Object.entries(rolesByUser)) {
      if (rids.includes(role.id)) userIds.push(Number(uid));
    }
    setSelectedUserIds(userIds);
  }, [role, rolesByUser]);

  const toggleUser = (userId) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSave = async () => {
    try {
      for (const user of staffUsers) {
        const previousRoles = rolesByUser[user.id] || [];
        const hadRole = previousRoles.includes(role.id);
        const wantsRole = selectedUserIds.includes(user.id);
        if (hadRole === wantsRole) continue;
        const updatedRoles = wantsRole
          ? [...previousRoles, role.id]
          : previousRoles.filter(id => id !== role.id);
        await api.users.setRoles(user.id, updatedRoles);
      }
      await api.refreshSession();
      toast.success('Usuarios asignados al rol');
      onAssigned();
      onClose();
    } catch (e) {
      toast.error('Error al asignar usuarios');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl p-6">
        <h3 className="font-bold text-gray-900 text-lg mb-1">Asignar Usuarios</h3>
        <p className="text-sm text-gray-500 mb-4">Usuarios con rol: <strong>{role.name}</strong></p>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {staffUsers.map(user => (
            <label
              key={user.id}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                selectedUserIds.includes(user.id)
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedUserIds.includes(user.id)}
                onChange={() => toggleUser(user.id)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <div>
                <p className="font-medium text-gray-900">{user.full_name}</p>
                <p className="text-xs text-gray-400">ID: {user.id}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-primary-600 text-white font-medium rounded-xl"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// User Wizard Modal
