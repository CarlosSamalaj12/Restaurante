import { useState } from 'react';
import { m } from 'framer-motion';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Printer
} from 'lucide-react';

export function ProductionCentersSection({ productionCenters, centers, onReload }) {
  const [showWizard, setShowWizard] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [testing, setTesting] = useState(null);
  const toast = useToast();

  const handleCreated = () => {
    setShowWizard(false);
    setEditingCenter(null);
    if (onReload) onReload();
  };

  const testPrint = async (type, id, hasIp) => {
    if (!hasIp) {
      toast.error('Esta impresora no tiene IP configurada');
      return;
    }
    setTesting(id);
    try {
      await api.testPrint(type, id);
      toast.success('Página de prueba enviada');
    } catch (e) {
      toast.error(`No se pudo imprimir: ${e.message}`);
    } finally {
      setTesting(null);
    }
  };

  const handleDeleteCenter = async () => {
    if (!confirmDelete) return;
    try {
      await api.settings.deleteProductionCenter(confirmDelete.id);
      toast.success('Centro eliminado');
      setConfirmDelete(null);
      if (onReload) onReload();
    } catch (error) {
      toast.error(error.message || 'No se pudo eliminar');
      setConfirmDelete(null);
    }
  };

  const getCenterColor = (centerName) => {
    const name = (centerName || '').toLowerCase();
    if (name.includes('cocina')) return 'from-orange-500 to-red-600';
    if (name.includes('bar')) return 'from-blue-500 to-indigo-600';
    return 'from-emerald-500 to-teal-600';
  };

  const getOperationCenterName = (centerId) => {
    if (!centerId) return null;
    const center = centers?.find(c => c.id === centerId);
    return center?.name;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Centros de Producción
          </h2>
          <p className="text-sm text-gray-500">
            Define dónde se preparan los productos (cocina, bar, etc.)
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Centro
        </button>
      </div>

      <div className="space-y-3">
        {productionCenters.map(center => (
          <m.div
            key={center.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-4 flex items-center gap-4 border border-gray-200"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getCenterColor(center.name)} flex items-center justify-center shadow-sm`}>
              <div className="w-5 h-5 rounded-full bg-white/30" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{center.name}</p>
                {!center.is_active && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Inactivo</span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {center.printer_name ? `Impresora: ${center.printer_name}` : 'Sin impresora'}
              </p>
              {center.printer_ip ? (
                <p className="text-xs text-emerald-700 mt-0.5">
                  {center.printer_ip}:{center.printer_port || 9100}
                </p>
              ) : (
                <p className="text-xs text-amber-600 mt-0.5">
                  ⚠️ Sin IP — la cocina usará el KDS en pantalla
                </p>
              )}
              {getOperationCenterName(center.operation_center_id) && (
                <p className="text-xs text-blue-600 mt-1">
                  Centro: {getOperationCenterName(center.operation_center_id)}
                </p>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => testPrint('production_center', center.id, center.printer_ip)}
                disabled={!center.printer_ip || testing === center.id}
                title={center.printer_ip ? 'Imprimir página de prueba' : 'Configurá la IP primero'}
                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
              >
                {testing === center.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => {
                  setEditingCenter(center);
                  setShowWizard(true);
                }}
                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => setConfirmDelete({ id: center.id, name: center.name })}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </m.div>
        ))}
        
        {productionCenters.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <p className="text-gray-500">No hay centros de producción</p>
            <p className="text-sm text-gray-400 mt-1">Crea uno para empezar</p>
          </div>
        )}
      </div>

      {showWizard && (
        <ProductionCenterWizardModal
          editingCenter={editingCenter}
          centers={centers}
          onClose={() => {
            setShowWizard(false);
            setEditingCenter(null);
          }}
          onCreated={handleCreated}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <m.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar centro</h3>
              <p className="text-gray-500 mb-6">
                ¿Eliminar <strong>{confirmDelete.name}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteCenter}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </m.div>
        </div>
      )}
    </div>
  );
}

// Production Center Wizard Modal
function ProductionCenterWizardModal({ onClose, onCreated, editingCenter, centers }) {
  const [form, setForm] = useState({
    name: editingCenter?.name || '',
    printerName: editingCenter?.printer_name || '',
    printerIp: editingCenter?.printer_ip || '',
    printerPort: editingCenter?.printer_port || 9100,
    isActive: editingCenter?.is_active !== false,
    operationCenterId: editingCenter?.operation_center_id || ''
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        printerName: form.printerName,
        printerIp: form.printerIp,
        printerPort: form.printerPort,
        isActive: form.isActive ? 1 : 0,
        operationCenterId: form.operationCenterId || null
      };
      if (editingCenter) {
        await api.updateProductionCenter(editingCenter.id, payload);
        toast.success('Centro actualizado');
      } else {
        await api.createProductionCenter(payload);
        toast.success('Centro de producción creado');
      }
      onCreated();
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-md"
      >
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {editingCenter ? 'Editar' : 'Nuevo'} Centro de Producción
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Ej: Cocina Principal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Centro (opcional)</label>
              <select
                value={form.operationCenterId}
                onChange={e => setForm({ ...form, operationCenterId: e.target.value ? Number(e.target.value) : '' })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                <option value="">Sin centro específico</option>
                {centers && centers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Deja vacío si es común a todos los centros</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Impresora (etiqueta)</label>
              <input
                type="text"
                value={form.printerName}
                onChange={e => setForm({ ...form, printerName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Ej: TM-COCINA-01"
              />
              <p className="text-xs text-gray-500 mt-1">Solo una etiqueta para identificar la impresora</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">IP de la impresora</label>
                <input
                  type="text"
                  value={form.printerIp}
                  onChange={e => setForm({ ...form, printerIp: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="192.168.1.51"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Puerto</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.printerPort}
                  onFocus={e => e.target.select()}
                  onChange={e => setForm({ ...form, printerPort: e.target.value === '' ? 9100 : Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="9100"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 -mt-2">
              Impresora de red en la misma LAN. Puerto estándar RAW: 9100. Si no configuras IP, SamaPos usa el KDS en pantalla como respaldo.
            </p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </m.div>
    </div>
  );
}

// Terminals Section
