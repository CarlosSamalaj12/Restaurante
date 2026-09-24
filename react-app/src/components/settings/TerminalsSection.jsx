import { useState } from 'react';
import { m } from 'framer-motion';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Monitor,
  Printer
} from 'lucide-react';

export function TerminalsSection({ terminals, centers, areas = [], onReload }) {
  const [showWizard, setShowWizard] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [testing, setTesting] = useState(null);
  const toast = useToast();

  const handleCreated = () => {
    setShowWizard(false);
    setEditingTerminal(null);
    if (onReload) onReload();
  };

  const testPrint = async (type, id, hasIp) => {
    if (!hasIp) {
      toast.error('Esta terminal no tiene IP de impresora configurada');
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

  const handleDeleteTerminal = async () => {
    if (!confirmDelete) return;
    try {
      await api.settings.deleteTerminal(confirmDelete.id);
      toast.success('Terminal eliminada');
      setConfirmDelete(null);
      if (onReload) onReload();
    } catch (error) {
      toast.error(error.message || 'Error al eliminar');
      setConfirmDelete(null);
    }
  };

  const grouped = terminals.reduce((acc, t) => {
    const centerName = centers.find(c => c.id === t.operation_center_id)?.name || 'Sin centro';
    if (!acc[centerName]) acc[centerName] = [];
    acc[centerName].push(t);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {terminals.length} terminales configuradas
        </h2>
        <button
          onClick={() => setShowWizard(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva
        </button>
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([centerName, termList]) => (
          <div key={centerName}>
            <h3 className="text-sm font-medium text-gray-500 mb-2">{centerName}</h3>
            <div className="space-y-2">
              {termList.map(term => (
                <m.div
                  key={term.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl p-4 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{term.name}</p>
                      {term.area_name ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                          📍 {term.area_name}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                          ⚠️ Sin área
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {term.printer_name ? `${term.printer_name} · ` : ''}
                      {term.printer_ip ? `${term.printer_ip}:${term.printer_port}` : 'Sin IP configurada'}
                    </p>
                    {term.printer_ip ? null : (
                      <p className="text-xs text-amber-600 mt-0.5">
                        ⚠️ El recibo del cliente se podrá reimprimir desde la pantalla
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => testPrint('terminal', term.id, term.printer_ip)}
                      disabled={!term.printer_ip || testing === term.id}
                      title={term.printer_ip ? 'Imprimir página de prueba' : 'Configurá la IP primero'}
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                    >
                      {testing === term.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Printer className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingTerminal(term);
                        setShowWizard(true);
                      }}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ id: term.id, label: term.name || term.printer_name })}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </m.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showWizard && (
        <TerminalWizardModal
          editingTerminal={editingTerminal}
          centers={centers}
          areas={areas}
          onClose={() => {
            setShowWizard(false);
            setEditingTerminal(null);
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar terminal</h3>
              <p className="text-gray-500 mb-6">
                ¿Estás seguro de eliminar la terminal <strong>{confirmDelete.label}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteTerminal}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
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

// Terminal Wizard Modal
function TerminalWizardModal({ editingTerminal, centers, areas = [], onClose, onCreated }) {
  const [form, setForm] = useState({
    operationCenterId: editingTerminal?.operation_center_id || '',
    areaTrabajoId: editingTerminal?.area_trabajo_id || '',
    name: editingTerminal?.name || '',
    printerName: editingTerminal?.printer_name || '',
    printerIp: editingTerminal?.printer_ip || '',
    printerPort: editingTerminal?.printer_port || 9100,
    isActive: editingTerminal?.is_active !== false
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSave = async () => {
    if (!form.operationCenterId || !form.name.trim()) {
      toast.error('Selecciona un centro y nombre');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        areaTrabajoId: form.areaTrabajoId ? Number(form.areaTrabajoId) : null,
      };
      if (editingTerminal) {
        await api.settings.updateTerminal(editingTerminal.id, payload);
        toast.success('Terminal actualizada');
      } else {
        await api.settings.createTerminal(payload);
        toast.success('Terminal creada');
      }
      onCreated();
    } catch (error) {
      toast.error(error.message || 'Error al guardar');
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
            {editingTerminal ? 'Editar' : 'Nueva'} Terminal
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Centro de Operación</label>
              <select
                value={form.operationCenterId}
                onChange={e => setForm({ ...form, operationCenterId: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Seleccionar centro...</option>
                {centers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Área de Trabajo (Enrutamiento)</label>
              <select
                value={form.areaTrabajoId}
                onChange={e => setForm({ ...form, areaTrabajoId: e.target.value ? Number(e.target.value) : '' })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Seleccionar área (ej: Terraza, Salón, Bar)...</option>
                {areas.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Vincula las comandas emitidas desde esta estación con la Matriz de Enrutamiento.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Ej: T1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Impresora (opcional)</label>
              <input
                type="text"
                value={form.printerName}
                onChange={e => setForm({ ...form, printerName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Ej: Ticketera Mostrador"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IP Impresora</label>
                <input
                  type="text"
                  value={form.printerIp}
                  onChange={e => setForm({ ...form, printerIp: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="192.168.1.100"
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
            <p className="text-xs text-gray-500 -mt-2">IP y puerto de la impresora de tickets</p>
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

// Center Wizard Modal
