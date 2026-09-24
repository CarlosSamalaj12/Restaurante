import { useState } from 'react';
import { m } from 'framer-motion';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Check
} from 'lucide-react';

export function UsersSection({ centers, roles, staffUsers, onReload }) {
  const [showWizard, setShowWizard] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const toast = useToast();

  const handleCreated = () => {
    setShowWizard(false);
    onReload();
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`¿Eliminar usuario "${user.full_name}"?`)) return;
    try {
      await api.settings.deleteStaffUser(user.id);
      toast.success('Usuario eliminado');
      onReload();
    } catch (e) {
      toast.error(e.message || 'Error al eliminar usuario');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Usuarios del Sistema
        </h2>
        <button
          onClick={() => setShowWizard(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
        <p className="text-yellow-800 text-sm">
          Usa el PIN de acceso para identificarte en el sistema.
        </p>
      </div>

      {/* User list */}
      <div className="space-y-2 mb-6">
        {staffUsers.map(user => (
          <div key={user.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{user.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{user.role_names || user.role}</p>
            </div>
            <span className="text-xs text-gray-400 font-mono shrink-0">PIN: {user.pin_code || '---'}</span>
            <button
              onClick={() => setEditingUser(user)}
              className="p-2 rounded-xl hover:bg-blue-50 text-blue-600 transition-colors"
              title="Editar"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(user)}
              className="p-2 rounded-xl hover:bg-red-50 text-red-500 transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
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
    if (!form.roleId) {
      toast.error('Selecciona un rol');
      return;
    }
    setLoading(true);
    try {
      const result = await api.settings.createStaffUser({
        fullName: form.name,
        pinCode: form.pin,
        role: 'waiter',
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
                placeholder="••••"
                maxLength={6}
                autoFocus
              />
              <p className="text-center text-xs text-gray-400">Mínimo 4 dígitos numéricos</p>
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
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const handleSave = async () => {
    if (!fullName.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      await api.settings.updateStaffUser(user.id, {
        fullName: fullName.trim(),
        pinCode: pinCode.trim() || undefined,
        operationCenterId: centerId || null,
      });
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
