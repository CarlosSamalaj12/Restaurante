import { useState, useEffect } from 'react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import {
  Loader2,
  Plus,
  Trash2,
  Shield,
  Save,
  Undo2,
  CheckSquare,
  Square,
  Check,
  LayoutGrid,
  Home,
  ChefHat,
  Receipt,
  Eye,
  UtensilsCrossed,
  Boxes,
  Users,
  Building2,
  Sliders,
  Layers
} from 'lucide-react';

const MODULE_CONFIG = {
  views: { label: 'Vistas y Pantallas Permitidas', icon: Eye, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  restaurant: { label: 'Restaurante y Salón (Órdenes y Cobros)', icon: UtensilsCrossed, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  erp: { label: 'Inventario y Recetas (ERP)', icon: Boxes, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  crm: { label: 'Clientes y Cuentas por Cobrar', icon: Users, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  pms: { label: 'Módulo Hotel / PMS', icon: Building2, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  general: { label: 'General y Configuración', icon: Sliders, color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

const LANDING_VIEWS = [
  {
    id: 'tables',
    title: 'Mesas y Salón',
    desc: 'Entra directo a tomar pedidos (Ideal Meseros)',
    icon: LayoutGrid,
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'dashboard',
    title: 'Inicio / Dashboard',
    desc: 'Pantalla principal con accesos (Admin / Gerente)',
    icon: Home,
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'kds',
    title: 'Cocina / KDS',
    desc: 'Pantalla de preparación de comandas (Cocineros)',
    icon: ChefHat,
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 'shifts',
    title: 'Turnos y Cajas',
    desc: 'Aperturas y cobros de turno (Cajeros dedicados)',
    icon: Receipt,
    color: 'from-purple-500 to-pink-600',
  },
];

export function RolesSection({ roles, permissions, permByRole, rolesByUser, staffUsers, onReload }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPermIds, setSelectedPermIds] = useState([]);
  const [selectedDefaultView, setSelectedDefaultView] = useState('dashboard');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showUserAssign, setShowUserAssign] = useState(false);
  const toast = useToast();

  // Organizar permisos por módulo
  const permsByModule = {};
  for (const p of permissions) {
    const mod = p.module_code || 'general';
    if (!permsByModule[mod]) permsByModule[mod] = [];
    permsByModule[mod].push(p);
  }

  // Cuando cambia el rol seleccionado, cargar sus permisos en estado local
  useEffect(() => {
    if (selectedRole) {
      const activeIds = permByRole[selectedRole.id] || [];
      setSelectedPermIds(activeIds);
      setSelectedDefaultView(selectedRole.default_view || 'dashboard');
      setHasChanges(false);
    } else if (roles && roles.length > 0) {
      setSelectedRole(roles[0]);
    }
  }, [selectedRole?.id]);

  const handleTogglePermission = (permissionId) => {
    setSelectedPermIds((prev) => {
      const exists = prev.includes(permissionId);
      const next = exists ? prev.filter((id) => id !== permissionId) : [...prev, permissionId];
      return next;
    });
    setHasChanges(true);
  };

  const handleSelectAllInModule = (perms) => {
    const idsToAdd = perms.map((p) => p.id);
    setSelectedPermIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
    setHasChanges(true);
  };

  const handleDeselectAllInModule = (perms) => {
    const idsToRemove = new Set(perms.map((p) => p.id));
    setSelectedPermIds((prev) => prev.filter((id) => !idsToRemove.has(id)));
    setHasChanges(true);
  };

  const handleSelectDefaultView = (viewId) => {
    setSelectedDefaultView(viewId);
    setHasChanges(true);
  };

  const handleResetChanges = () => {
    if (!selectedRole) return;
    setSelectedPermIds(permByRole[selectedRole.id] || []);
    setSelectedDefaultView(selectedRole.default_view || 'dashboard');
    setHasChanges(false);
    toast.info('Cambios descartados');
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setIsSaving(true);
    try {
      await api.roles.setPermissions(selectedRole.id, selectedPermIds, selectedDefaultView);
      await api.refreshSession();
      toast.success('¡Ajustes de permisos y pantalla inicial guardados!');
      setHasChanges(false);
      onReload();
    } catch (e) {
      toast.error(e.message || 'Error al guardar ajustes de permisos');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.is_system) {
      toast.error('No se pueden eliminar roles protegidos del sistema');
      return;
    }
    if (!window.confirm(`¿Eliminar el rol "${role.name}"? Los usuarios perderán esta asignación.`)) return;
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
        onCreated={() => {
          setShowCreate(false);
          onReload();
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Roles y Control de Acceso</h2>
          <p className="text-xs text-gray-500">
            Define la pantalla a la que entra cada empleado y qué módulos tiene permitido utilizar.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="group bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
          Nuevo Rol
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Columna Izquierda: Lista de Roles */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs space-y-2">
          <h3 className="font-bold text-gray-700 mb-2 text-xs uppercase tracking-wider px-1">
            Roles Configurados
          </h3>
          <div className="space-y-1.5">
            {roles.map((role) => {
              const isSelected = selectedRole?.id === role.id;
              const count = (permByRole[role.id] || []).length;
              return (
                <button
                  key={role.id}
                  onClick={() => {
                    if (hasChanges && !window.confirm('Tienes cambios sin guardar en este rol. ¿Deseas descartarlos y cambiar de rol?')) {
                      return;
                    }
                    setSelectedRole(role);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl transition-all border ${
                    isSelected
                      ? 'bg-primary-50/80 border-primary-500 shadow-xs ring-1 ring-primary-500/20'
                      : 'bg-gray-50/60 border-gray-100 hover:bg-gray-100/70 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                        {role.name}
                        {role.is_system ? (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-semibold">
                            Sistema
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-1">{role.description || 'Sin descripción'}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-200/50">
                    <span className="font-medium text-primary-700">
                      Entra a: {LANDING_VIEWS.find((v) => v.id === role.default_view)?.title || 'Inicio'}
                    </span>
                    <span className="bg-gray-200/70 text-gray-700 px-2 py-0.5 rounded-full font-mono font-bold">
                      {count} perms
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha: Editor de Permisos y Pantalla Inicial */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-gray-100 shadow-2xs flex flex-col justify-between">
          {selectedRole ? (
            <div className="space-y-6">
              {/* Encabezado del Rol */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-gray-900 text-xl">{selectedRole.name}</h3>
                    {selectedRole.is_system ? (
                      <span className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-md font-semibold">
                        Rol Protegido
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedRole.description || 'Configura la pantalla de inicio y los permisos correspondientes.'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowUserAssign(true)}
                    className="text-xs font-semibold px-3.5 py-2 bg-blue-50/80 text-blue-700 border border-blue-200/80 rounded-xl hover:bg-blue-100 transition-all shadow-2xs hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Asignar Empleados
                  </button>
                  {!selectedRole.is_system && (
                    <button
                      onClick={() => handleDeleteRole(selectedRole)}
                      className="p-2.5 text-rose-600 bg-rose-50/70 hover:bg-rose-100 border border-rose-200/60 rounded-xl transition-all shadow-2xs hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                      title="Eliminar este rol"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* 1. Selector de Pantalla Inicial al Ingresar con PIN */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                  1. Pantalla Inicial al Entrar con PIN
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LANDING_VIEWS.map((lv) => {
                    const isSelected = selectedDefaultView === lv.id;
                    const IconComp = lv.icon;
                    return (
                      <button
                        key={lv.id}
                        type="button"
                        onClick={() => handleSelectDefaultView(lv.id)}
                        className={`text-left p-3 rounded-xl border-2 transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'border-primary-600 bg-primary-50/70 shadow-xs'
                            : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 bg-gradient-to-br ${lv.color}`}
                        >
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-sm text-gray-900">{lv.title}</p>
                            {isSelected && <Check className="w-4 h-4 text-primary-600 stroke-[3]" />}
                          </div>
                          <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{lv.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Lista de Permisos por Módulo con Selección Múltiple */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    2. Permisos y Módulos Autorizados
                  </label>
                  <span className="text-xs font-mono font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {selectedPermIds.length} seleccionados
                  </span>
                </div>

                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                  {Object.entries(permsByModule).map(([moduleCode, perms]) => {
                    const modConfig = MODULE_CONFIG[moduleCode] || {
                      label: moduleCode.toUpperCase(),
                      icon: Layers,
                      color: 'text-gray-700 bg-gray-50 border-gray-200',
                    };
                    const ModIcon = modConfig.icon || Layers;
                    const allChecked = perms.every((p) => selectedPermIds.includes(p.id));
                    const someChecked = perms.some((p) => selectedPermIds.includes(p.id));

                    return (
                      <div
                        key={moduleCode}
                        className="border border-gray-100 rounded-2xl p-3.5 bg-gray-50/40"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-gray-200/60">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${modConfig.color}`}>
                              <ModIcon className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-bold text-xs text-gray-900 tracking-wide">
                              {modConfig.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSelectAllInModule(perms)}
                              className="text-[10px] font-bold text-primary-700 hover:bg-primary-100/60 px-2 py-1 rounded transition-colors"
                            >
                              Marcar todos
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              type="button"
                              onClick={() => handleDeselectAllInModule(perms)}
                              className="text-[10px] font-medium text-gray-500 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                            >
                              Desmarcar
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {perms.map((p) => {
                            const isChecked = selectedPermIds.includes(p.id);
                            return (
                              <label
                                key={p.id}
                                className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                                  isChecked
                                    ? 'bg-white border-primary-500 shadow-2xs text-gray-900 ring-1 ring-primary-500/20'
                                    : 'bg-white/80 border-gray-200 hover:border-gray-300 text-gray-600'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(p.id)}
                                  className="mt-0.5 w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold leading-tight">{p.name}</p>
                                  {p.description && (
                                    <p className="text-[10px] text-gray-400 leading-tight mt-0.5 line-clamp-2">
                                      {p.description}
                                    </p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Barra Flotante / Sticky de Guardar Cambios */}
              <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-white sticky bottom-0">
                <div className="text-xs">
                  {hasChanges ? (
                    <span className="inline-flex items-center gap-1.5 font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Tienes ajustes pendientes por guardar
                    </span>
                  ) : (
                    <span className="text-gray-400">Todos los cambios están guardados</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {hasChanges && (
                    <button
                      type="button"
                      onClick={handleResetChanges}
                      disabled={isSaving}
                      className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      Descartar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSavePermissions}
                    disabled={!hasChanges || isSaving}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Guardar Ajustes de Permisos</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Selecciona un rol a la izquierda para configurar su acceso</p>
            </div>
          )}
        </div>
      </div>

      {showUserAssign && selectedRole && (
        <AssignUsersModal
          role={selectedRole}
          staffUsers={staffUsers}
          rolesByUser={rolesByUser}
          roles={roles}
          onClose={() => setShowUserAssign(false)}
          onAssigned={onReload}
        />
      )}
    </div>
  );
}

function CreateRoleModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [defaultView, setDefaultView] = useState('tables');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error('Nombre y slug son requeridos');
      return;
    }
    setLoading(true);
    try {
      await api.roles.create({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        defaultView,
      });
      toast.success('Rol creado');
      onCreated();
    } catch (e) {
      toast.error(e.message || 'Error al crear rol');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full sm:max-w-md rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-gray-900 text-lg">Nuevo Rol</h3>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSlug(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
            }}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-primary-500 focus:outline-none"
            placeholder="Ej: Mesero de Terraza"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Identificador (Slug)</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 font-mono text-gray-600 focus:outline-none"
            placeholder="mesero_terraza"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Pantalla Inicial al Entrar</label>
          <select
            value={defaultView}
            onChange={(e) => setDefaultView(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-primary-500 focus:outline-none bg-white font-medium"
          >
            <option value="tables">Mesas y Salón (Recomendado Meseros)</option>
            <option value="dashboard">Inicio / Dashboard (Admin / Gerente)</option>
            <option value="kds">Cocina / KDS (Cocineros y Barra)</option>
            <option value="shifts">Turnos y Cajas (Cajeros)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Descripción</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-primary-500 focus:outline-none"
            placeholder="Descripción de funciones"
          />
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading}
            className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Rol'}
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
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
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
          : previousRoles.filter((id) => id !== role.id);
        await api.users.setRoles(user.id, updatedRoles);
      }
      await api.refreshSession();
      toast.success('Empleados asignados al rol');
      onAssigned();
      onClose();
    } catch (e) {
      toast.error('Error al asignar empleados');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full sm:max-w-md rounded-2xl p-6 shadow-xl space-y-4">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Asignar Empleados</h3>
          <p className="text-xs text-gray-500">
            Selecciona qué empleados tendrán el rol: <strong>{role.name}</strong>
          </p>
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {staffUsers.map((user) => {
            const isChecked = selectedUserIds.includes(user.id);
            return (
              <label
                key={user.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  isChecked
                    ? 'border-primary-500 bg-primary-50/70 font-semibold'
                    : 'border-gray-200 bg-gray-50/40 hover:bg-gray-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleUser(user.id)}
                  className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{user.full_name}</p>
                  <p className="text-[10px] text-gray-400 font-mono">PIN: {user.pin_code || '---'}</p>
                </div>
              </label>
            );
          })}
        </div>
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-[0.98] cursor-pointer"
          >
            Guardar Asignaciones
          </button>
        </div>
      </div>
    </div>
  );
}
