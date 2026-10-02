import { useState } from 'react';
import { m } from 'framer-motion';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import { getOrCreateSerial } from '../../lib/terminalSerial';
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Monitor,
  Printer,
  ChefHat,
  Tv,
  Wine,
  UtensilsCrossed,
  Sparkles,
  Laptop,
  CheckCircle2,
  Layers
} from 'lucide-react';

export function TerminalsSection({
  terminals,
  centers,
  areas = [],
  productionCenters = [],
  licensedTerminals = [],
  onReload
}) {
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
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {terminals.length} {terminals.length === 1 ? 'terminal configurada' : 'terminales configuradas'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Puntos de venta (POS) y pantallas de producción / comanderas (KDS Bar y Cocina)
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTerminal(null);
            setShowWizard(true);
          }}
          className="group bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
          <span>Nueva Terminal / KDS</span>
        </button>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([centerName, termList]) => (
          <div key={centerName}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-500"></span>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{centerName}</h3>
              <span className="text-xs text-gray-400 font-medium">({termList.length})</span>
            </div>
            <div className="space-y-2.5">
              {termList.map(term => {
                const isKds = Number(term.is_kds) === 1;
                const isBar = term.kds_production_center_name?.toLowerCase().includes('bar');

                return (
                  <m.div
                    key={term.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white rounded-2xl p-4 flex items-center gap-3.5 border transition-all ${
                      isKds 
                        ? 'border-indigo-200/80 shadow-sm bg-gradient-to-r from-white via-indigo-50/20 to-white' 
                        : 'border-gray-100 shadow-sm'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                      isKds
                        ? isBar
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                          : 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
                        : 'bg-gradient-to-br from-slate-600 to-slate-800 text-white'
                    }`}>
                      {isKds ? (
                        isBar ? <Wine className="w-6 h-6" /> : <ChefHat className="w-6 h-6" />
                      ) : (
                        <Monitor className="w-6 h-6" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-gray-900 text-base">{term.name}</p>
                        
                        {isKds ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isBar
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            <Tv className="w-3 h-3" />
                            KDS: {term.kds_production_center_name || 'Todas las estaciones'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                            POS Terminal
                          </span>
                        )}

                        {isKds && term.kds_operation_center_name && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            Centro: {term.kds_operation_center_name}
                          </span>
                        )}

                        {term.area_name ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                            📍 {term.area_name}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                        {term.printer_ip ? (
                          <span>
                            🖨️ {term.printer_name ? `${term.printer_name} · ` : ''}{term.printer_ip}:{term.printer_port}
                          </span>
                        ) : isKds ? (
                          <span className="text-gray-400">Pantalla digital sin impresora directa</span>
                        ) : (
                          <span className="text-amber-600 font-medium">⚠️ Sin impresora configurada</span>
                        )}

                        {term.device_serial && (
                          <span className="text-slate-400 flex items-center gap-1 font-mono">
                            <Laptop className="w-3 h-3" />
                            Serial: {term.device_serial}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {term.printer_ip && (
                        <button
                          onClick={() => testPrint('terminal', term.id, term.printer_ip)}
                          disabled={testing === term.id}
                          title="Imprimir página de prueba"
                          className="p-2.5 rounded-xl transition-all duration-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 border border-emerald-200/60 shadow-2xs hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:hover:scale-100"
                        >
                          {testing === term.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                          ) : (
                            <Printer className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingTerminal(term);
                          setShowWizard(true);
                        }}
                        className="p-2.5 rounded-xl transition-all duration-200 bg-blue-50/70 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border border-blue-200/60 shadow-2xs hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                        title="Editar terminal / KDS"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ id: term.id, label: term.name || term.printer_name })}
                        className="p-2.5 rounded-xl transition-all duration-200 bg-rose-50/70 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200/60 shadow-2xs hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                        title="Eliminar terminal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </m.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {showWizard && (
        <TerminalWizardModal
          editingTerminal={editingTerminal}
          centers={centers}
          areas={areas}
          productionCenters={productionCenters}
          licensedTerminals={licensedTerminals}
          onClose={() => {
            setShowWizard(false);
            setEditingTerminal(null);
          }}
          onCreated={handleCreated}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <m.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Eliminar terminal</h3>
              <p className="text-gray-500 mb-6 text-sm">
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
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors shadow-sm"
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
function TerminalWizardModal({
  editingTerminal,
  centers,
  areas = [],
  productionCenters = [],
  licensedTerminals = [],
  onClose,
  onCreated
}) {
  const currentSerial = getOrCreateSerial();
  const [form, setForm] = useState({
    operationCenterId: editingTerminal?.operation_center_id || (centers[0]?.id || ''),
    areaTrabajoId: editingTerminal?.area_trabajo_id || '',
    name: editingTerminal?.name || '',
    isKds: Boolean(editingTerminal?.is_kds),
    kdsProductionCenterId: editingTerminal?.kds_production_center_id || '',
    kdsOperationCenterId: editingTerminal?.kds_operation_center_id || '',
    deviceSerial: editingTerminal?.device_serial || '',
    printerName: editingTerminal?.printer_name || '',
    printerIp: editingTerminal?.printer_ip || '',
    printerPort: editingTerminal?.printer_port || 9100,
    isActive: editingTerminal?.is_active !== false
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleUseCurrentDevice = () => {
    setForm(prev => ({
      ...prev,
      deviceSerial: currentSerial
    }));
    toast.success('Serial de este dispositivo vinculado');
  };

  const handleSave = async () => {
    if (!form.operationCenterId || !form.name.trim()) {
      toast.error('Selecciona un centro y escribe un nombre');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        operationCenterId: Number(form.operationCenterId),
        areaTrabajoId: form.areaTrabajoId ? Number(form.areaTrabajoId) : null,
        name: form.name.trim(),
        isKds: form.isKds ? 1 : 0,
        kdsProductionCenterId: form.isKds && form.kdsProductionCenterId ? Number(form.kdsProductionCenterId) : null,
        kdsOperationCenterId: form.isKds && form.kdsOperationCenterId ? Number(form.kdsOperationCenterId) : null,
        deviceSerial: form.deviceSerial?.trim() || null,
        printerName: form.printerName?.trim() || null,
        printerIp: form.printerIp?.trim() || null,
        printerPort: form.printerPort ? Number(form.printerPort) : 9100,
        isActive: form.isActive !== false
      };

      if (editingTerminal) {
        await api.settings.updateTerminal(editingTerminal.id, payload);
        toast.success('Terminal actualizada exitosamente');
      } else {
        await api.settings.createTerminal(payload);
        toast.success('Terminal creada exitosamente');
      }
      onCreated();
    } catch (error) {
      toast.error(error.message || 'Error al guardar la terminal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl my-8 overflow-hidden border border-gray-100"
      >
        <div className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                {editingTerminal ? 'Editar' : 'Nueva'} Terminal / Pantalla
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Configura esta estación para punto de venta o pantalla de cocina/bar (KDS)
              </p>
            </div>
            <div className={`p-2.5 rounded-2xl ${form.isKds ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
              {form.isKds ? <ChefHat className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
            </div>
          </div>

          <div className="space-y-4 pt-4">
            {/* Tipo de Terminal Toggle */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isKds}
                  onChange={e => {
                    const isChecked = e.target.checked;
                    setForm(prev => ({
                      ...prev,
                      isKds: isChecked,
                      // Si activa KDS y no tiene nombre sugerir
                      name: (!prev.name || prev.name === 'T1') && isChecked ? 'KDS Bar' : prev.name
                    }));
                  }}
                  className="w-5 h-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-900 text-sm">
                      ¿Es una pantalla de preparación KDS?
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                      Bar / Cocina
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Activa filtros automáticos para mostrar únicamente pedidos de bar o cocina de uno o todos los centros.
                  </p>
                </div>
              </label>
            </div>

            {/* Configuración KDS específica cuando está activo */}
            {form.isKds && (
              <m.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3.5"
              >
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Configuración de Visualización KDS
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-950 mb-1">
                    Estación de Producción KDS (Filtro de productos)
                  </label>
                  <select
                    value={form.kdsProductionCenterId}
                    onChange={e => setForm({ ...form, kdsProductionCenterId: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">✨ Todas las estaciones (KDS General / Supervisión)</option>
                    {productionCenters.map(pc => (
                      <option key={pc.id} value={pc.id}>
                        {pc.name.toLowerCase().includes('bar') ? '🍸' : '🍳'} {pc.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-indigo-800/80 mt-1">
                    Ej: Si seleccionas <strong>Bar</strong>, esta pantalla solo mostrará tragos y bebidas asignadas al bar. Al despachar el pedido, solo se completarán los tragos.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-950 mb-1">
                    Centro de Consumo KDS (Filtro de salón)
                  </label>
                  <select
                    value={form.kdsOperationCenterId}
                    onChange={e => setForm({ ...form, kdsOperationCenterId: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">🏢 Todos los centros de consumo</option>
                    {centers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-indigo-800/80 mt-1">
                    Puedes restringir a solo comandas originadas en un centro específico (ej: Vaqueros, Flor de Café, ElDeck) o dejarlo para todos.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-indigo-950">
                      Vincular Pantalla / Dispositivo Físico
                    </label>
                    <button
                      type="button"
                      onClick={handleUseCurrentDevice}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-indigo-200 shadow-2xs"
                    >
                      <Laptop className="w-3 h-3" />
                      Usar esta pantalla actual
                    </button>
                  </div>
                  
                  {licensedTerminals.length > 0 && (
                    <select
                      value={licensedTerminals.some(lt => lt.serial === form.deviceSerial) ? form.deviceSerial : ''}
                      onChange={e => {
                        if (e.target.value) {
                          setForm({ ...form, deviceSerial: e.target.value });
                        }
                      }}
                      className="w-full mb-2 px-3.5 py-1.5 text-xs bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Seleccionar de dispositivos autorizados --</option>
                      {licensedTerminals.map(lt => (
                        <option key={lt.serial} value={lt.serial}>
                          {lt.label || 'Dispositivo'} ({lt.serial}) - {lt.ip_address || 'Sin IP'}
                        </option>
                      ))}
                    </select>
                  )}

                  <input
                    type="text"
                    value={form.deviceSerial}
                    onChange={e => setForm({ ...form, deviceSerial: e.target.value })}
                    className="w-full px-3.5 py-2 font-mono text-xs bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    placeholder="Serial único del navegador / tablet (opcional)"
                  />
                  <p className="text-[11px] text-indigo-800/80 mt-1">
                    Al abrir el KDS desde este dispositivo, se configurará automáticamente en su estación sin necesidad de seleccionar filtros manuales.
                  </p>
                </div>
              </m.div>
            )}

            {/* Datos Generales de la Terminal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Centro de Operación Base *
                </label>
                <select
                  value={form.operationCenterId}
                  onChange={e => setForm({ ...form, operationCenterId: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="">Seleccionar centro...</option>
                  {centers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nombre de la Terminal *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Ej: KDS Bar Principal"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Área de Trabajo (Enrutamiento de Comandas)
              </label>
              <select
                value={form.areaTrabajoId}
                onChange={e => setForm({ ...form, areaTrabajoId: e.target.value ? Number(e.target.value) : '' })}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                <option value="">Sin área de trabajo específica...</option>
                {areas.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                Para terminales POS que emiten comandas según la matriz de enrutamiento térmico.
              </p>
            </div>

            {/* Impresora Opcional */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-gray-500" />
                Impresora Térmica Asociada {form.isKds && '(Opcional para KDS)'}
              </p>
              
              <div className="space-y-2.5">
                <div>
                  <input
                    type="text"
                    value={form.printerName}
                    onChange={e => setForm({ ...form, printerName: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                    placeholder="Nombre impresora (ej: Ticketera Cocina)"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={form.printerIp}
                      onChange={e => setForm({ ...form, printerIp: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs font-mono border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                      placeholder="IP: 192.168.1.100"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.printerPort}
                      onChange={e => setForm({ ...form, printerPort: e.target.value === '' ? 9100 : Number(e.target.value) })}
                      className="w-full px-3.5 py-2 text-xs font-mono border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                      placeholder="9100"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 text-sm shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Configuración'
              )}
            </button>
          </div>
        </div>
      </m.div>
    </div>
  );
}


// Center Wizard Modal
