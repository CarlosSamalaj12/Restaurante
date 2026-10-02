import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Check,
  ShieldAlert,
  Power,
  PowerOff,
  AlertCircle,
  Store,
  Receipt,
  Clock,
  LayoutGrid,
  Users,
  Monitor,
  Layers,
  Sparkles
} from 'lucide-react';
import { CenterIconBadge } from '../../utils/productIcons';

export function CentersSection({ centers, onReload }) {
  const [showWizard, setShowWizard] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null); // { center, usage, loading }
  const [togglingId, setTogglingId] = useState(null);
  const toast = useToast();

  const handleCreated = () => {
    setShowWizard(false);
    setEditingCenter(null);
    if (onReload) onReload();
  };

  const handleToggleActive = async (center, forcedStatus = null) => {
    setTogglingId(center.id);
    const currentIsActive = center.is_active !== false && center.is_active !== 0;
    const newStatus = forcedStatus !== null ? forcedStatus : !currentIsActive;
    try {
      await api.settings.updateOperationCenter(center.id, {
        name: center.name,
        isActive: newStatus ? 1 : 0,
      });
      toast.success(`Centro "${center.name}" ${newStatus ? 'activado' : 'desactivado'}`);
      if (onReload) await onReload();
      if (deleteModal) setDeleteModal(null);
    } catch (error) {
      toast.error(error.message || 'Error al actualizar estado del centro');
    } finally {
      setTogglingId(null);
    }
  };

  const handleRequestDelete = async (center) => {
    setDeleteModal({ center, usage: null, loading: true });
    try {
      const usage = await api.settings.getCenterUsage(center.id);
      setDeleteModal({ center, usage, loading: false });
    } catch (err) {
      console.warn('Error fetching center usage:', err);
      // Fallback a confirmación estándar si no responde usage
      setDeleteModal({ center, usage: null, loading: false });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal || !deleteModal.center) return;
    try {
      await api.settings.deleteCenter(deleteModal.center.id);
      toast.success('Centro eliminado permanentemente');
      setDeleteModal(null);
      if (onReload) onReload();
    } catch (error) {
      toast.error(error.message || 'Error al eliminar');
      // Si el backend rechazó por tener datos, recargamos el usage para mostrar la opción de desactivar
      try {
        const usage = await api.settings.getCenterUsage(deleteModal.center.id);
        setDeleteModal({ center: deleteModal.center, usage, loading: false });
      } catch (_) {}
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {centers.length} {centers.length === 1 ? 'centro de consumo' : 'centros de consumo'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Administra los centros de venta, salones y puntos operativos de tu negocio
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCenter(null);
            setShowWizard(true);
          }}
          className="group bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
          <span>Nuevo Centro</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {centers.map(center => {
          const isActive = center.is_active !== false && center.is_active !== 0;
          const isToggling = togglingId === center.id;

          return (
            <m.div
              key={center.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`group bg-white rounded-2xl p-4 flex items-center gap-3.5 border transition-all duration-200 hover:shadow-sm ${
                isActive 
                  ? 'border-slate-200 hover:border-slate-300' 
                  : 'border-slate-200 bg-slate-50/60 opacity-80 hover:opacity-100'
              }`}
            >
              <CenterIconBadge centerName={center.name} size="md" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <p className="font-bold text-slate-900 truncate text-[15px]">{center.name}</p>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border transition-colors ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`}
                    />
                    {isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isActive
                    ? 'Disponible en el sistema para comandas y turnos'
                    : 'Oculto en operaciones (historial preservado)'}
                </p>
              </div>

              {/* Botones de Acción Modernos con Color Minimalista */}
              <div className="flex items-center gap-1.5">
                {/* Botón de Activar / Desactivar con color temático */}
                <button
                  onClick={() => handleToggleActive(center)}
                  disabled={isToggling}
                  title={isActive ? 'Desactivar centro' : 'Activar centro'}
                  className={`p-2.5 rounded-xl transition-all duration-200 border flex items-center justify-center shadow-2xs hover:scale-105 active:scale-95 ${
                    isActive
                      ? 'bg-amber-50/70 hover:bg-amber-100 text-amber-600 hover:text-amber-700 border-amber-200/60'
                      : 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 border-emerald-200/60'
                  }`}
                >
                  {isToggling ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  ) : isActive ? (
                    <PowerOff className="w-4 h-4" />
                  ) : (
                    <Power className="w-4 h-4" />
                  )}
                </button>

                {/* Botón de Editar Moderno */}
                <button
                  onClick={() => {
                    setEditingCenter(center);
                    setShowWizard(true);
                  }}
                  title="Editar centro de consumo"
                  className="p-2.5 rounded-xl transition-all duration-200 bg-blue-50/70 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border border-blue-200/60 shadow-2xs hover:scale-105 active:scale-95 flex items-center justify-center"
                >
                  <Edit className="w-4 h-4" />
                </button>

                {/* Botón de Eliminar Moderno */}
                <button
                  onClick={() => handleRequestDelete(center)}
                  title="Eliminar o retirar centro"
                  className="p-2.5 rounded-xl transition-all duration-200 bg-rose-50/70 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200/60 shadow-2xs hover:scale-105 active:scale-95 flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </m.div>
          );
        })}
      </div>

      {/* Modal Wizard de Crear / Editar */}
      {showWizard && (
        <CenterWizardModal
          editingCenter={editingCenter}
          onClose={() => {
            setShowWizard(false);
            setEditingCenter(null);
          }}
          onCreated={handleCreated}
        />
      )}

      {/* Modal Inteligente de Blindaje / Confirmación de Eliminación */}
      {deleteModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <m.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden"
          >
            {deleteModal.loading ? (
              <div className="py-10 text-center space-y-3">
                <Loader2 className="w-9 h-9 animate-spin text-indigo-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">
                  Verificando integridad de datos del centro...
                </p>
                <p className="text-xs text-slate-400">
                  Analizando cuentas, turnos y operaciones vinculadas
                </p>
              </div>
            ) : deleteModal.usage?.hasLinkedData ? (
              /* Caso Blindado: Tiene historial o dependencias vinculadas */
              <div className="text-center">
                {/* Ícono de escudo con resplandor moderno */}
                <div className="relative mx-auto w-16 h-16 mb-4 flex items-center justify-center">
                  <div className="absolute inset-0 bg-amber-400/20 rounded-2xl blur-xl" />
                  <div className="relative w-16 h-16 bg-gradient-to-b from-amber-100 to-amber-200/90 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-300/70 shadow-inner">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-1.5 tracking-tight">
                  Centro con datos protegidos
                </h3>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  El centro <strong className="text-slate-900 font-semibold">"{deleteModal.center.name}"</strong> cuenta con registros históricos en el sistema.
                </p>

                {/* Resumen de uso / blindaje con ICONOS MINIMALISTAS CON COLOR */}
                <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 mb-4 text-left shadow-2xs">
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    Registros asociados detectados:
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {deleteModal.usage.accountsCount > 0 && (
                      <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-emerald-50/90 border border-emerald-200/80 text-xs shadow-2xs">
                        <div className="w-5 h-5 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600">
                          <Receipt className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-emerald-950">{deleteModal.usage.accountsCount}</span>
                        <span className="text-emerald-700 font-medium">cuenta(s)</span>
                      </div>
                    )}

                    {deleteModal.usage.shiftsCount > 0 && (
                      <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-xs shadow-2xs">
                        <div className="w-5 h-5 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-600">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-amber-950">{deleteModal.usage.shiftsCount}</span>
                        <span className="text-amber-700 font-medium">turno(s) de caja</span>
                      </div>
                    )}

                    {deleteModal.usage.tablesCount > 0 && (
                      <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-blue-50/90 border border-blue-200/80 text-xs shadow-2xs">
                        <div className="w-5 h-5 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-600">
                          <LayoutGrid className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-blue-950">{deleteModal.usage.tablesCount}</span>
                        <span className="text-blue-700 font-medium">mesa(s)</span>
                      </div>
                    )}

                    {deleteModal.usage.usersCount > 0 && (
                      <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-purple-50/90 border border-purple-200/80 text-xs shadow-2xs">
                        <div className="w-5 h-5 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-600">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-purple-950">{deleteModal.usage.usersCount}</span>
                        <span className="text-purple-700 font-medium">usuario(s)</span>
                      </div>
                    )}

                    {deleteModal.usage.terminalsCount > 0 && (
                      <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-cyan-50/90 border border-cyan-200/80 text-xs shadow-2xs">
                        <div className="w-5 h-5 rounded-lg bg-cyan-500/15 flex items-center justify-center text-cyan-600">
                          <Monitor className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-cyan-950">{deleteModal.usage.terminalsCount}</span>
                        <span className="text-cyan-700 font-medium">terminal(es)</span>
                      </div>
                    )}

                    {deleteModal.usage.categoriesCount > 0 && (
                      <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-indigo-50/90 border border-indigo-200/80 text-xs shadow-2xs">
                        <div className="w-5 h-5 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-600">
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-indigo-950">{deleteModal.usage.categoriesCount}</span>
                        <span className="text-indigo-700 font-medium">categoría(s)</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-200/60 leading-relaxed">
                    Para no corromper reportes de ventas, cortes de caja ni auditorías, este centro no puede eliminarse de raíz.
                  </p>
                </div>

                <p className="text-xs text-slate-600 mb-5 text-left leading-relaxed">
                  <strong className="text-slate-800">Recomendación:</strong> Desactiva el centro para que ya no aparezca en la operación diaria, manteniendo 100% seguros tus reportes contables.
                </p>

                {/* Acciones del Modal con Estilo Moderno */}
                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={() => handleToggleActive(deleteModal.center, false)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all duration-150 hover:scale-[1.01] active:scale-[0.98]"
                  >
                    <PowerOff className="w-4 h-4 text-amber-200" />
                    <span>Desactivar centro en su lugar</span>
                  </button>

                  <button
                    onClick={() => setDeleteModal(null)}
                    className="w-full py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              /* Caso Sin Datos: Puede eliminarse físicamente de forma segura */
              <div className="text-center">
                <div className="relative mx-auto w-16 h-16 mb-4 flex items-center justify-center">
                  <div className="absolute inset-0 bg-rose-400/20 rounded-2xl blur-xl" />
                  <div className="relative w-16 h-16 bg-gradient-to-b from-rose-100 to-rose-200/90 text-rose-600 rounded-2xl flex items-center justify-center border border-rose-300/70 shadow-inner">
                    <Trash2 className="w-8 h-8" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-1.5 tracking-tight">
                  Eliminar centro
                </h3>
                <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                  ¿Estás seguro de eliminar el centro <strong className="text-slate-900 font-semibold">"{deleteModal.center.name}"</strong>?
                </p>

                <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3.5 mb-6 text-xs text-emerald-800 text-left flex items-start gap-2.5 shadow-2xs">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Este centro no tiene cuentas, turnos ni dependencias vinculadas. Se puede eliminar de forma segura y permanente.</span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteModal(null)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl font-semibold text-sm text-slate-700 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl font-semibold text-sm shadow-md shadow-rose-500/25 transition-all hover:scale-[1.01] active:scale-[0.98]"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </m.div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Wizard Modal para Crear y Editar Centros de Operación
// ============================================================================

function CenterWizardModal({ editingCenter, onClose, onCreated }) {
  const isEditing = Boolean(editingCenter);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: editingCenter ? editingCenter.name : '',
    isActive: editingCenter ? (editingCenter.is_active !== false && editingCenter.is_active !== 0) : true,
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (editingCenter) {
      setForm({
        name: editingCenter.name || '',
        isActive: editingCenter.is_active !== false && editingCenter.is_active !== 0,
      });
    } else {
      setForm({ name: '', isActive: true });
    }
    setStep(1);
  }, [editingCenter]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Ingresa el nombre del centro');
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await api.settings.updateOperationCenter(editingCenter.id, {
          name: form.name.trim(),
          isActive: form.isActive ? 1 : 0,
        });
        toast.success('¡Centro de consumo actualizado con éxito!');
      } else {
        await api.settings.createOperationCenter({
          name: form.name.trim(),
        });
        toast.success('¡Centro de consumo creado con éxito!');
      }
      onCreated();
    } catch (error) {
      toast.error(error.message || (isEditing ? 'Error al actualizar centro' : 'Error al crear centro'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <m.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="flex justify-center pt-3 pb-2 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Encabezado y Step Indicator */}
        <div className="px-6 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-lg">
              {isEditing ? 'Editar Centro de Consumo' : 'Nuevo Centro de Consumo'}
            </h3>
            {isEditing && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                ID #{editingCenter.id}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step > 1 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <span className="text-xs font-medium text-gray-600">Datos</span>
            <div className={`flex-1 h-0.5 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`} />
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step > 2 ? <Check className="w-4 h-4" /> : '2'}
            </div>
            <span className="text-xs font-medium text-gray-600">Confirmación</span>
          </div>
        </div>

        {/* Contenido por Pasos */}
        <div className="p-6 overflow-y-auto space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Nombre del centro
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg font-medium focus:border-primary-500 focus:outline-none transition-colors"
                  placeholder="Ej: Terraza, Flor de Cafe, Bar..."
                  autoFocus
                />
              </div>

              {/* Selector de Estado Operativo */}
              <div className="pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Estado operativo
                </label>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${
                    form.isActive
                      ? 'border-emerald-500/80 bg-emerald-50/40 text-emerald-950'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3.5 h-3.5 rounded-full ${
                        form.isActive ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-slate-400'
                      }`}
                    />
                    <div className="text-left">
                      <p className="font-bold text-sm">
                        {form.isActive ? 'Centro Activo' : 'Centro Inactivo'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {form.isActive
                          ? 'Habilitado para comandas, turnos y asignaciones'
                          : 'Oculto en las operaciones diarias (historial seguro)'}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      form.isActive ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">
                Revisa los datos antes de {isEditing ? 'guardar los cambios' : 'crear el centro'}:
              </p>

              <div className="bg-gradient-to-br from-slate-50 to-blue-50/60 rounded-2xl p-6 text-center border border-blue-100/80">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
                  <span className="text-3xl text-white font-bold">
                    {form.name ? form.name.charAt(0).toUpperCase() : <Store className="w-8 h-8" />}
                  </span>
                </div>
                <p className="text-xl font-bold text-gray-900">{form.name}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                      form.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        form.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    {form.isActive ? 'Operación Activa' : 'Desactivado / Inactivo'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  {isEditing
                    ? 'Los cambios se aplicarán inmediatamente en los módulos vinculados.'
                    : 'Podrás vincular mesas, impresoras y turnos a este centro.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer con Acciones */}
        <div className="p-5 border-t border-gray-100 flex gap-3 bg-gray-50/50">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Atrás
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          )}

          {step < 2 ? (
            <button
              onClick={() => {
                if (!form.name.trim()) {
                  toast.error('Ingresa el nombre del centro');
                  return;
                }
                setStep(step + 1);
              }}
              className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isEditing ? (
                'Guardar Cambios'
              ) : (
                'Crear Centro'
              )}
            </button>
          )}
        </div>
      </m.div>
    </div>
  );
}


// Tables Section
