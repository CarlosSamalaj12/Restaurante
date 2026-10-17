import { useState } from 'react';
import { m } from 'framer-motion';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../ConfirmDialog';
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Check,
  Shield
} from 'lucide-react';

export function UsersSection({ centers, roles, staffUsers, onReload }) {
  const [showWizard, setShowWizard] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const toast = useToast();

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    itemName: '',
    itemDetail: '',
    confirmText: 'Eliminar Usuario',
    variant: 'danger',
    loading: false,
    onConfirm: () => {},
  });

  const closeConfirm = () => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
  };

  const handleCreated = () => {
    setShowWizard(false);
    onReload();
  };

  const handleDelete = (user) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar usuario del sistema?',
      message: 'El usuario perderá el acceso a las terminales y su PIN quedará deshabilitado.',
      itemName: user.full_name,
      itemDetail: `Rol asignado: ${user.role || 'Staff'}`,
      variant: 'danger',
      confirmText: 'Eliminar Usuario',
      loading: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, loading: true }));
        try {
          await api.settings.deleteStaffUser(user.id);
          toast.success('Usuario eliminado');
          onReload();
          closeConfirm();
        } catch (e) {
          toast.error(e.message || 'Error al eliminar usuario');
          closeConfirm();
        }
      },
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Usuarios del Sistema
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Administra cajeros, meseros, gerentes y códigos PIN de acceso
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="group bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 mb-4 text-xs text-amber-900 flex items-center gap-2 shadow-2xs">
        <span className="font-semibold">Nota:</span> Cada usuario utiliza su código PIN único para iniciar sesión y operar en los terminales.
      </div>

      {/* User list */}
      <div className="space-y-2.5 mb-6">
        {staffUsers.map(user => {
          const isSuper = user.role === 'superadmin' || String(user.role_names || '').toLowerCase().includes('superadmin');
          return (
            <div key={user.id} className="group bg-white rounded-2xl p-4 border border-slate-200 hover:border-slate-300 transition-all duration-200 hover:shadow-sm flex items-center gap-4">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-sm ${
                isSuper
                  ? 'bg-gradient-to-br from-purple-600 to-indigo-700'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600'
              }`}>
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900 text-[15px]">{user.full_name}</p>
                  {isSuper && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                      <Shield className="w-2.5 h-2.5" /> Superadmin
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">{user.role_names || user.role}</p>
              </div>
              <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80 shrink-0 font-medium">
                PIN: {user.pin_code || '---'}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setEditingUser(user)}
                  className="p-2.5 rounded-xl transition-all duration-200 bg-blue-50/70 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border border-blue-200/60 shadow-2xs hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                  title="Editar usuario"
                >
                  <Edit className="w-4 h-4" />
                </button>
                {isSuper ? (
                  <button
                    disabled
                    className="p-2.5 rounded-xl bg-slate-100 text-slate-300 border border-slate-200/60 cursor-not-allowed flex items-center justify-center"
                    title="El Superadministrador está protegido y no puede ser eliminado"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleDelete(user)}
                    className="p-2.5 rounded-xl transition-all duration-200 bg-rose-50/70 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200/60 shadow-2xs hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                    title="Eliminar usuario"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showWizard && (
        <UserWizardModal
          centers={centers}
          roles={roles}
          onClose={() => setShowWizard(false)}
          onCreated={handleCreated}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          centers={centers}
          roles={roles}
          onClose={() => setEditingUser(null)}
          onSaved={onReload}
        />
      )}

      {/* Modal de confirmación estilizado */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        itemName={confirmDialog.itemName}
        itemDetail={confirmDialog.itemDetail}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        loading={confirmDialog.loading}
      />
    </div>
  );
}

// Roles Section

function UserWizardModal({ centers, roles, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', pin: '', roleId: '', operationCenterId: '' });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const ROLE_COLORS = ['from-amber-400 to-orange-500', 'from-emerald-400 to-green-500', 'from-purple-400 to-indigo-500', 'from-blue-400 to-cyan-500', 'from-pink-400 to-rose-500'];
  const ROLE_ICONS = ['🍽️', '💰', '👑', '⚙️', '📋'];

  const handleSave = async () => {
    if (!form.operationCenterId) {
      toast.error('Selecciona un centro de trabajo');
      return;
    }
    if (!form.pin || form.pin.length !== 6) {
      toast.error('El PIN debe tener exactamente 6 dígitos numéricos');
      setStep(2);
      return;
    }
    if (!form.roleId) {
      toast.error('Selecciona un rol');
      return;
    }
    setLoading(true);
    try {
      const selectedRoleObj = (roles || []).find(r => r.id === form.roleId);
      const roleSlug = selectedRoleObj?.slug || 'waiter';
      const result = await api.settings.createStaffUser({
        fullName: form.name,
        pinCode: form.pin,
        role: roleSlug,
        operationCenterId: form.operationCenterId
      });
      await api.users.setRoles(result.userId, [form.roleId]);
      toast.success('¡Usuario creado!');
      onCreated();
    } catch (error) {
      toast.error(error.message || 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <m.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden"
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-5 pb-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">Nuevo Usuario</h3>
          <div className="flex items-center justify-between mt-3">
            {['Nombre', 'PIN', 'Rol', 'Centro', 'Confirmar'].map((label, i) => (
              <div key={i} className="flex items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step > i + 1 ? 'bg-primary-600 text-white' : step === i + 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {step > i + 1 ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                {i < 4 && <div className={`w-5 h-0.5 mx-1 ${step > i + 1 ? 'bg-primary-600' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿Cuál es el nombre del usuario?</p>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="Ej: Juan Perez"
                autoFocus
              />
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿Cuál es el PIN de acceso?</p>
              <input
                type="password"
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-2xl font-bold text-center tracking-widest focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="••••••"
                maxLength={6}
                autoFocus
              />
              <p className="text-center text-xs text-gray-400">Exactamente 6 dígitos numéricos</p>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿Cuál es su rol?</p>
              <div className="space-y-3">
                {(roles.length ? roles : []).map((role, idx) => (
                  <m.button
                    key={role.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setForm({ ...form, roleId: role.id });
                      setStep(4);
                    }}
                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                      form.roleId === role.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${ROLE_COLORS[idx % ROLE_COLORS.length]} rounded-xl flex items-center justify-center text-2xl`}>
                      {ROLE_ICONS[idx % ROLE_ICONS.length]}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">{role.name}</p>
                      <p className="text-xs text-gray-500">{role.description || role.slug}</p>
                    </div>
                  </m.button>
                ))}
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿En qué centro trabaja?</p>
              <div className="space-y-2">
                {centers.map(center => (
                  <m.button
                    key={center.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setForm({ ...form, operationCenterId: center.id });
                      setStep(5);
                    }}
                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                      form.operationCenterId === center.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-white/30" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">{center.name}</p>
                      <p className="text-xs text-gray-500">Centro de consumo</p>
                    </div>
                  </m.button>
                ))}
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">Confirma los datos</p>
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 text-center">
                <div className={`w-16 h-16 bg-gradient-to-br ${ROLE_COLORS[roles.findIndex(r => r.id === form.roleId) % ROLE_COLORS.length]} rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl`}>
                  {ROLE_ICONS[roles.findIndex(r => r.id === form.roleId) % ROLE_ICONS.length]}
                </div>
                <p className="text-xl font-bold text-gray-900">{form.name}</p>
                <p className="text-sm text-gray-500">PIN: •••••{form.pin.slice(-2)}</p>
                <p className="text-sm font-medium text-primary-600 mt-1">{roles.find(r => r.id === form.roleId)?.name}</p>
                <p className="text-sm font-medium text-blue-600 mt-1">
                  Centro: {centers.find(c => c.id === form.operationCenterId)?.name}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl">
              Atrás
            </button>
          ) : (
            <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl">
              Cancelar
            </button>
          )}
          {step < 5 ? (
            <button
              onClick={() => {
                if (step === 1 && !form.name.trim()) {
                  toast.error('Ingresa el nombre');
                  return;
                }
                if (step === 2 && form.pin.length < 4) {
                  toast.error('PIN debe tener al menos 4 dígitos');
                  return;
                }
                setStep(step + 1);
              }}
              className="flex-1 py-3 bg-primary-600 text-white font-medium rounded-xl"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-3 bg-emerald-600 text-white font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear Usuario'}
            </button>
          )}
        </div>
      </m.div>
    </div>
  );
}

// Edit User Modal

function EditUserModal({ user, centers, roles, onClose, onSaved }) {
  const [fullName, setFullName] = useState(user.full_name || '');
  const [pinCode, setPinCode] = useState(user.pin_code || '');
  const [centerId, setCenterId] = useState(user.operation_center_id || '');
  const [roleSlug, setRoleSlug] = useState(user.role || 'waiter');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const handleSave = async () => {
    if (!fullName.trim()) { toast.error('El nombre es requerido'); return; }
    if (pinCode.trim() && pinCode.trim().length !== 6) {
      toast.error('El nuevo PIN debe tener exactamente 6 dígitos numéricos');
      return;
    }

    setSaving(true);
    try {
      await api.settings.updateStaffUser(user.id, {
        fullName: fullName.trim(),
        pinCode: pinCode.trim() || undefined,
        role: roleSlug,
        operationCenterId: centerId || null,
      });

      const targetRole = (roles || []).find(r => r.slug === roleSlug);
      if (targetRole) {
        await api.users.setRoles(user.id, [targetRole.id]);
      }

      toast.success('Usuario actualizado');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.message || 'Error al actualizar usuario');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl p-6">
        <h3 className="font-bold text-gray-900 text-lg mb-4">Editar Usuario</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
            <input
              type="password"
              value={pinCode}
              onChange={e => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
              placeholder="Dejar vacío para mantener el actual"
              maxLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select
              value={roleSlug}
              onChange={e => setRoleSlug(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
            >
              {(roles || []).map(r => (
                <option key={r.id} value={r.slug}>{r.name} ({r.slug})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Centro de trabajo</label>
            <select
              value={centerId}
              onChange={e => setCenterId(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
            >
              <option value="">Seleccionar centro</option>
              {centers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-primary-600 text-white font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Payments Section
