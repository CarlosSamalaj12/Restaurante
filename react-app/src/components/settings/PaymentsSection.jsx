import React, { useState } from 'react';
import {
  CreditCard,
  Banknote,
  Landmark,
  FileText,
  FileSpreadsheet,
  Wallet,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  Sparkles,
  Percent,
  CheckCircle2,
  XCircle,
  Smartphone
} from 'lucide-react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';

const SYSTEM_METHODS = ['cash', 'card', 'cxc'];

function getMethodIcon(code = '') {
  const c = code.toLowerCase();
  if (c === 'cash' || c.includes('efectivo')) return { Icon: Banknote, bg: 'bg-emerald-100 text-emerald-600' };
  if (c === 'card' || c.includes('tarjeta')) return { Icon: CreditCard, bg: 'bg-blue-100 text-blue-600' };
  if (c === 'transfer' || c.includes('transferencia')) return { Icon: Landmark, bg: 'bg-indigo-100 text-indigo-600' };
  if (c === 'cxc' || c.includes('cuenta')) return { Icon: FileText, bg: 'bg-amber-100 text-amber-600' };
  if (c === 'credit_folio' || c.includes('folio')) return { Icon: FileSpreadsheet, bg: 'bg-cyan-100 text-cyan-600' };
  if (c.includes('yappy') || c.includes('nequi') || c.includes('movil') || c.includes('qr')) {
    return { Icon: Smartphone, bg: 'bg-orange-100 text-orange-600' };
  }
  return { Icon: Wallet, bg: 'bg-slate-100 text-slate-600' };
}

function slugify(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 30);
}

export function PaymentsSection({ methods = [], onReload }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingCode, setDeletingCode] = useState(null);
  const [togglingCode, setTogglingCode] = useState(null);
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    label: '',
    isActive: true,
    sortOrder: 1,
    appliesTip: true,
  });

  const toast = useToast();

  const handleOpenCreate = () => {
    setIsEditing(false);
    setCodeManuallyEdited(false);
    setFormData({
      code: '',
      label: '',
      isActive: true,
      sortOrder: (methods?.length || 0) + 1,
      appliesTip: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (method) => {
    setIsEditing(true);
    setCodeManuallyEdited(true);
    setFormData({
      code: method.code,
      label: method.label,
      isActive: method.is_active !== false && method.is_active !== 0,
      sortOrder: method.sort_order ?? 0,
      appliesTip: method.applies_tip !== false && method.applies_tip !== 0,
    });
    setModalOpen(true);
  };

  const handleLabelChange = (val) => {
    setFormData(prev => ({
      ...prev,
      label: val,
      code: !isEditing && !codeManuallyEdited ? slugify(val) : prev.code
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const cleanLabel = String(formData.label || '').trim();
    const cleanCode = slugify(formData.code);

    if (!cleanLabel) {
      toast.error('El nombre de la forma de pago es requerido');
      return;
    }
    if (!cleanCode) {
      toast.error('El código es requerido');
      return;
    }

    setSaving(true);
    try {
      await api.settings.savePaymentMethod({
        code: cleanCode,
        label: cleanLabel,
        isActive: formData.isActive ? 1 : 0,
        sortOrder: Number(formData.sortOrder) || 0,
        appliesTip: formData.appliesTip ? 1 : 0,
      });

      toast.success(isEditing ? 'Forma de pago actualizada' : 'Forma de pago creada');
      setModalOpen(false);
      if (onReload) await onReload();
    } catch (err) {
      console.error('Error saving payment method:', err);
      toast.error(err.message || 'Error al guardar la forma de pago');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (method) => {
    setTogglingCode(method.code);
    const newStatus = !(method.is_active !== false && method.is_active !== 0);
    try {
      await api.settings.savePaymentMethod({
        code: method.code,
        label: method.label,
        isActive: newStatus ? 1 : 0,
        sortOrder: method.sort_order ?? 0,
        appliesTip: method.applies_tip !== false && method.applies_tip !== 0 ? 1 : 0,
      });
      toast.success(`Forma de pago ${newStatus ? 'activada' : 'desactivada'}`);
      if (onReload) await onReload();
    } catch (err) {
      console.error('Error toggling payment method:', err);
      toast.error(err.message || 'Error al cambiar estado');
    } finally {
      setTogglingCode(null);
    }
  };

  const handleDelete = async (method) => {
    if (SYSTEM_METHODS.includes(method.code)) {
      toast.error(`La forma de pago '${method.label}' es del sistema y no puede eliminarse. Puedes desactivarla.`);
      return;
    }

    if (!window.confirm(`¿Estás seguro de eliminar la forma de pago "${method.label}" (${method.code})?`)) {
      return;
    }

    setDeletingCode(method.code);
    try {
      await api.settings.deletePaymentMethod(method.code);
      toast.success('Forma de pago eliminada');
      if (onReload) await onReload();
    } catch (err) {
      console.error('Error deleting payment method:', err);
      toast.error(err.message || 'Error al eliminar');
    } finally {
      setDeletingCode(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-bold text-gray-900">Formas de Pago</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-700">
              {methods.length} configuradas
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Administra los métodos de cobro disponibles en el sistema POS, terminales y reportes de ventas.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white text-sm font-medium rounded-xl shadow-sm transition-all hover:shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Forma de Pago</span>
        </button>
      </div>

      {/* Lista de formas de pago */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {methods.map(method => {
          const { Icon, bg } = getMethodIcon(method.code);
          const isActive = method.is_active !== false && method.is_active !== 0;
          const appliesTip = method.applies_tip !== false && method.applies_tip !== 0;
          const isSystem = SYSTEM_METHODS.includes(method.code);
          const isToggling = togglingCode === method.code;
          const isDeleting = deletingCode === method.code;

          return (
            <div
              key={method.code}
              className={`bg-white rounded-2xl p-5 border transition-all hover:shadow-md flex flex-col justify-between ${
                isActive ? 'border-gray-200' : 'border-gray-200 bg-gray-50/50 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 text-base">{method.label}</h3>
                        {isSystem && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                            Sistema
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-gray-400 mt-0.5">
                        código: <span className="font-semibold text-gray-600">{method.code}</span>
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'bg-gray-100 text-gray-500 border border-gray-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    {isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                {/* Tags / Config */}
                <div className="flex items-center gap-2 flex-wrap text-xs text-gray-600 my-3">
                  <span className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 font-medium ${
                    appliesTip 
                      ? 'bg-blue-50/60 text-blue-700 border-blue-200/60' 
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>
                    <Percent className="w-3 h-3" />
                    {appliesTip ? 'Aplica propina' : 'Sin propina'}
                  </span>

                  <span className="px-2 py-1 rounded-lg bg-gray-50 text-gray-500 border border-gray-200 font-mono">
                    Prioridad #{method.sort_order ?? 0}
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleActive(method)}
                  disabled={isToggling}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors inline-flex items-center gap-1.5 ${
                    isActive
                      ? 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-red-600'
                      : 'border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50'
                  }`}
                >
                  {isToggling ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isActive ? (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-gray-400" />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Activar
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(method)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {!isSystem && (
                    <button
                      type="button"
                      onClick={() => handleDelete(method)}
                      disabled={isDeleting}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Eliminar forma de pago"
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin text-red-600" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {methods.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-700 mb-1">No hay formas de pago registradas</h3>
          <p className="text-sm text-gray-400 mb-4">Crea una nueva forma de pago para comenzar a cobrar en el POS.</p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Crear primera forma de pago
          </button>
        </div>
      )}

      {/* Modal para Crear / Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-scale-up">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {isEditing ? 'Editar Forma de Pago' : 'Nueva Forma de Pago'}
                </h3>
                <p className="text-xs text-gray-500">
                  {isEditing ? 'Modifica los datos del método de pago' : 'Ingresa la información del nuevo método'}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Nombre / Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre visible *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Yappy, Tarjeta de Regalo, Vales"
                  value={formData.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm transition-all"
                  autoFocus
                />
              </div>

              {/* Código */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código identificador *
                </label>
                <input
                  type="text"
                  required
                  disabled={isEditing}
                  placeholder="Ej: yappy, vales, giftcard"
                  value={formData.code}
                  onChange={(e) => {
                    setCodeManuallyEdited(true);
                    setFormData(prev => ({ ...prev, code: slugify(e.target.value) }));
                  }}
                  className={`w-full px-3.5 py-2.5 border rounded-xl font-mono text-sm outline-none transition-all ${
                    isEditing
                      ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                      : 'border-gray-300 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500'
                  }`}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  {isEditing
                    ? 'El código interno no se puede modificar para preservar el historial de pagos.'
                    : 'Solo letras en minúsculas, números y guiones bajos (máx. 30 caracteres).'}
                </p>
              </div>

              {/* Orden de prioridad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orden de aparición
                </label>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm transition-all"
                />
              </div>

              {/* Switches / Checkboxes */}
              <div className="pt-2 space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.appliesTip}
                    onChange={(e) => setFormData(prev => ({ ...prev, appliesTip: e.target.checked }))}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 block">Aplica propina</span>
                    <span className="text-xs text-gray-500 block">
                      Permite calcular y agregar propina sugerida cuando se cobra con este método
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 block">Forma de pago activa</span>
                    <span className="text-xs text-gray-500 block">
                      Disponible para selección al momento de pagar cuentas en el POS
                    </span>
                  </div>
                </label>
              </div>

              {/* Botones del modal */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-all disabled:opacity-50 shadow-sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {isEditing ? 'Guardar Cambios' : 'Crear Forma de Pago'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
