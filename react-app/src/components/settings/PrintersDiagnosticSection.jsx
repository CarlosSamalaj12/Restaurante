import { useState, useEffect, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Printer,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  Activity,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
  Loader2,
  Send,
  HelpCircle,
  Wifi,
  Store,
  Monitor,
  Utensils,
  ClipboardCheck,
  ArrowRight,
  Receipt,
  Package,
  FileSearch
} from 'lucide-react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';

export function PrintersDiagnosticSection({
  printers: initialPrinters = [],
  productionCenters = [],
  terminals = [],
  products = [],
  onReload,
}) {
  const [printers, setPrinters] = useState(initialPrinters);
  const [loading, setLoading] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [status, setStatus] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobFilter, setJobFilter] = useState('all'); // 'all' | 'success' | 'failed'
  const [showHistory, setShowHistory] = useState(false);
  const [routingMode, setRoutingMode] = useState('auto'); // 'auto' | 'direct' | 'agent'
  const [savingMode, setSavingMode] = useState(false);

  // Modales
  const [modalPrinter, setModalPrinter] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [auditing, setAuditing] = useState(false);

  const toast = useToast();

  // Sincronizar impresoras con props o cargar desde API
  useEffect(() => {
    if (initialPrinters && initialPrinters.length > 0) {
      setPrinters(initialPrinters);
    } else {
      loadPrinters();
    }
  }, [initialPrinters]);

  const loadPrinters = async () => {
    try {
      const res = await api.getPrinters();
      if (res?.printers) setPrinters(res.printers);
    } catch (_) {}
  };

  const loadDiagnostics = async () => {
    setJobsLoading(true);
    try {
      const [s, j, m] = await Promise.all([
        api.getPrintServiceStatus().catch(() => ({ escposAvailable: false })),
        api.getPrintJobs(50).catch(() => ({ jobs: [] })),
        api.getPrinterRoutingMode().catch(() => ({ mode: 'auto' })),
      ]);
      setStatus(s);
      setJobs(j?.jobs || []);
      if (m?.mode) setRoutingMode(m.mode);
    } catch (e) {
      toast.error(`Error cargando diagnóstico: ${e.message}`);
    } finally {
      setJobsLoading(false);
    }
  };

  const handleModeChange = async (newMode) => {
    if (newMode === routingMode) return;
    setSavingMode(true);
    try {
      await api.setPrinterRoutingMode(newMode);
      setRoutingMode(newMode);
      toast.success(
        newMode === 'direct'
          ? 'Modo Local (TCP Directo) activado'
          : newMode === 'agent'
          ? 'Modo Nube/Hostinger (Print Agent) activado'
          : 'Modo Automático Híbrido activado'
      );
      await loadDiagnostics();
    } catch (err) {
      toast.error(`Error al cambiar modo de impresión: ${err.message}`);
    } finally {
      setSavingMode(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  // Probar Impresión directa
  const handleTestPrint = async (printer) => {
    if (!printer.ip) {
      toast.error('Esta impresora no tiene IP configurada');
      return;
    }
    setTestingId(printer.id);
    try {
      await api.testPrinterDirect(printer.id);
      toast.success(`¡Página de prueba enviada a "${printer.name}" (${printer.ip})!`);
      loadDiagnostics();
    } catch (e) {
      toast.error(`Error al imprimir en "${printer.name}": ${e.message}`);
      loadDiagnostics();
    } finally {
      setTestingId(null);
    }
  };

  // Ejecutar Auditoría Integral ("¿Está todo bien hecho?")
  const handleRunAudit = async () => {
    setAuditing(true);
    setShowAuditModal(true);
    try {
      const audit = await api.auditPrinters();
      setAuditData(audit);
    } catch (e) {
      toast.error(`Error al auditar: ${e.message}`);
    } finally {
      setAuditing(false);
    }
  };

  // Guardar Impresora (Crear / Editar)
  const handleSavePrinter = async (formData) => {
    setLoading(true);
    try {
      if (editingPrinter) {
        await api.updatePrinter(editingPrinter.id, formData);
        toast.success(`Impresora "${formData.name}" actualizada`);
      } else {
        await api.createPrinter(formData);
        toast.success(`Impresora "${formData.name}" registrada con éxito`);
      }
      setModalPrinter(false);
      setEditingPrinter(null);
      await loadPrinters();
      if (onReload) await onReload();
    } catch (e) {
      toast.error(e.message || 'Error al guardar impresora');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar Impresora
  const handleDeletePrinter = async () => {
    if (!deleteConfirm) return;
    try {
      await api.deletePrinter(deleteConfirm.id);
      toast.success(`Impresora eliminada`);
      setDeleteConfirm(null);
      await loadPrinters();
      if (onReload) await onReload();
    } catch (e) {
      toast.error(e.message || 'Error al eliminar');
      setDeleteConfirm(null);
    }
  };

  // Obtener uso de cada impresora por estaciones y terminales
  const getPrinterUsage = (printer) => {
    const linkedProd = productionCenters.filter(
      (pc) => pc.printer_id === printer.id || (!pc.printer_id && pc.printer_ip === printer.ip)
    );
    const linkedTerms = terminals.filter(
      (t) => t.printer_id === printer.id || (!t.printer_id && t.printer_ip === printer.ip)
    );
    return {
      prodCenters: linkedProd,
      terminals: linkedTerms,
      totalCount: linkedProd.length + linkedTerms.length,
    };
  };

  const filteredJobs = useMemo(() => {
    if (jobFilter === 'success') return jobs.filter((j) => j.status === 'success');
    if (jobFilter === 'failed') return jobs.filter((j) => j.status === 'failed');
    if (jobFilter === 'pending') return jobs.filter((j) => j.status === 'pending');
    return jobs;
  }, [jobs, jobFilter]);

  const successJobsCount = jobs.filter((j) => j.status === 'success').length;
  const failedJobsCount = jobs.filter((j) => j.status === 'failed').length;
  const pendingJobsCount = jobs.filter((j) => j.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* ── ENCABEZADO Y HERO ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 text-slate-800 shadow-2xs border border-slate-200/90 relative overflow-hidden">
        <div className="absolute right-0 top-0 p-6 opacity-[0.06] pointer-events-none">
          <Printer className="w-36 h-36 text-slate-900" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200/80 rounded-full px-3 py-1 text-xs text-indigo-700 font-bold mb-3 shadow-2xs">
            <Wifi className="w-3.5 h-3.5" /> Impresión Térmica ESC/POS (LAN / WiFi)
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
            Centro de Control de Impresoras
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
            Registra y administra las impresoras de red de tu restaurante (Cocina, Bar y Caja).
            Comprueba la conexión en un clic y audita que cada platillo y terminal esté debidamente enlazado.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setEditingPrinter(null);
                setModalPrinter(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-sm shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Impresora</span>
            </button>

            <button
              onClick={handleRunAudit}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <ClipboardCheck className="w-4 h-4 text-emerald-600 stroke-[2.2]" />
              <span>Auditar Configuración</span>
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium">
              <span className="text-slate-500">Servicio ESC/POS:</span>
              {status?.escposAvailable ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Activo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Emulador / Local
                </span>
              )}
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium">
              <span className="text-slate-500">Print Agent (LAN):</span>
              {status?.printAgent?.hasConnectedAgents ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold" title={`${status.printAgent.connectedCount} agente(s) conectado(s)`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> En línea ({status.printAgent.connectedCount})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-500 font-medium" title="Sin agente conectado. En local envía por TCP directo; en nube espera al agente.">
                  <span className="w-2 h-2 rounded-full bg-slate-400" /> Modo Directo
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SELECTOR DE MODO DE IMPRESIÓN (LOCAL DIRECTO vs HOSTINGER VPS) ── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              Modo de Comunicación de Impresoras
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configura cómo el sistema despacha comandas a las impresoras térmicas de cocina, bar y caja.
            </p>
          </div>
          {savingMode && (
            <span className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-semibold animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando preferencia...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Opción 1: Auto */}
          <button
            type="button"
            onClick={() => handleModeChange('auto')}
            disabled={savingMode}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
              routingMode === 'auto'
                ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-2 ring-indigo-500/20'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                Recomendado
              </span>
              {routingMode === 'auto' && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">Automático Híbrido</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Si hay un Print Agent conectado en la PC de caja, despacha por el agente; si estás en red local, imprime directo por IP.
            </p>
          </button>

          {/* Opción 2: Local Directo */}
          <button
            type="button"
            onClick={() => handleModeChange('direct')}
            disabled={savingMode}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
              routingMode === 'direct'
                ? 'border-emerald-600 bg-emerald-50/40 shadow-xs ring-2 ring-emerald-500/20'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                Instalación Local
              </span>
              {routingMode === 'direct' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">Modo Local (TCP Directo)</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Para cuando SamaPos corre en la misma PC del restaurante. Envía por socket RAW a la IP de la impresora sin requerir Print Agent.
            </p>
          </button>

          {/* Opción 3: Nube / Hostinger */}
          <button
            type="button"
            onClick={() => handleModeChange('agent')}
            disabled={savingMode}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
              routingMode === 'agent'
                ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-2 ring-blue-500/20'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                VPS / Hostinger
              </span>
              {routingMode === 'agent' && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">Modo Nube (Print Agent)</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Para cuando el sistema está en Hostinger. Despacha por WebSocket al Print Agent en la PC de caja con cola offline de respaldo.
            </p>
          </button>
        </div>
      </div>

      {/* ── LISTADO DE IMPRESORAS REGISTRADAS ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Printer className="w-5 h-5 text-indigo-600" />
              Impresoras Físicas Registradas
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-bold">
                {printers.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Cada impresora tiene su dirección IP fija en tu router local (puerto estándar 9100 RAW)
            </p>
          </div>
          <button
            onClick={async () => {
              await loadPrinters();
              await loadDiagnostics();
              if (onReload) onReload();
              toast.success('Lista de impresoras actualizada');
            }}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:bg-slate-50 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refrescar</span>
          </button>
        </div>

        {printers.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Printer className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-800">No hay impresoras registradas</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
              Registra tu primera impresora térmica para comenzar a imprimir comandas de cocina o recibos de cuenta.
            </p>
            <button
              onClick={() => {
                setEditingPrinter(null);
                setModalPrinter(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs inline-flex items-center gap-2 shadow-md cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Primera Impresora</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {printers.map((p) => {
              const usage = getPrinterUsage(p);
              const isTesting = testingId === p.id;
              const isKitchen = p.type === 'production';
              const isReceipt = p.type === 'receipt';
              const isBoth = p.type === 'both';

              return (
                <m.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 group"
                >
                  <div>
                    {/* Fila Superior: Nombre y Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0 ${
                            isKitchen
                              ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                              : isReceipt
                              ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                              : 'bg-gradient-to-br from-indigo-600 to-purple-600'
                          }`}
                        >
                          <Printer className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-base leading-tight">
                              {p.name}
                            </h4>
                            {!p.is_active && (
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                                Inactiva
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono text-indigo-700 font-semibold mt-0.5 flex items-center gap-1.5">
                            <Wifi className="w-3 h-3 text-indigo-500" />
                            {p.ip}:{p.port || 9100}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isKitchen
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : isReceipt
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-purple-50 text-purple-800 border-purple-200'
                          }`}
                        >
                          {isKitchen
                            ? '🍳 Cocina / Comanda'
                            : isReceipt
                            ? '🧾 Recibo / Caja'
                            : '⚡ Cocina + Caja'}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.2 rounded border border-slate-200">
                          Papel {p.paper_width || '80mm'}
                        </span>
                      </div>
                    </div>

                    {/* Descripción opcional */}
                    {p.description && (
                      <p className="text-xs text-slate-500 mt-2.5 italic bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                        {p.description}
                      </p>
                    )}

                    {/* Dónde se usa esta impresora */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Asignada a ({usage.totalCount} destinos):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {usage.prodCenters.map((pc) => (
                          <span
                            key={`pc-${pc.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-lg"
                          >
                            <Utensils className="w-3 h-3" />
                            {pc.name}
                          </span>
                        ))}
                        {usage.terminals.map((t) => (
                          <span
                            key={`t-${t.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-lg"
                          >
                            <Monitor className="w-3 h-3" />
                            {t.name}
                          </span>
                        ))}
                        {usage.totalCount === 0 && (
                          <span className="text-xs text-slate-400 italic">
                            Sin asignar aún a centros o terminales
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Fila Inferior: Botones de Acción */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleTestPrint(p)}
                      disabled={isTesting}
                      className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                      title="Envía un ticket corto de prueba a la impresora para comprobar que responde"
                    >
                      {isTesting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      <span>{isTesting ? 'Imprimiendo...' : 'Probar Impresión'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingPrinter(p);
                        setModalPrinter(true);
                      }}
                      className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      title="Editar impresora"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeleteConfirm(p)}
                      className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      title="Eliminar impresora"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </m.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SECCIÓN COLAPSABLE: HISTORIAL Y DIAGNÓSTICO DE TRABAJOS (`print_jobs`) ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="w-full p-5 sm:p-6 flex items-center justify-between hover:bg-slate-50/60 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <FileSearch className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                Auditoría e Historial de Impresiones
              </h4>
              <p className="text-xs text-slate-500">
                {successJobsCount} impresiones OK · {failedJobsCount} fallos registrados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-600">
              {showHistory ? 'Ocultar auditoría' : 'Ver auditoría de trabajos'}
            </span>
            {showHistory ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        {showHistory && (
          <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 space-y-4">
            {/* Filtros de Historial */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setJobFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    jobFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos ({jobs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setJobFilter('success')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    jobFilter === 'success'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  OK ({successJobsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setJobFilter('failed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    jobFilter === 'failed'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  Fallos ({failedJobsCount})
                </button>
                {pendingJobsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setJobFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      jobFilter === 'pending'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    En cola ({pendingJobsCount})
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={loadDiagnostics}
                disabled={jobsLoading}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${jobsLoading ? 'animate-spin text-indigo-600' : ''}`} />
                <span>Actualizar log</span>
              </button>
            </div>

            {/* Lista de trabajos */}
            {filteredJobs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-2xl">
                No hay trabajos de impresión registrados en este filtro.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
                {filteredJobs.map((j) => (
                  <div key={j.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 flex items-center gap-1">
                          <Printer className="w-3.5 h-3.5 text-slate-400" />
                          {j.printer_target}
                        </span>

                        {j.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-200 text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> OK
                          </span>
                        ) : j.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md border border-amber-200 text-[10px]" title="En cola esperando que el agente local imprima">
                            <Clock className="w-3 h-3 text-amber-600" /> En cola (Agent)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-md border border-rose-200 text-[10px]">
                            <XCircle className="w-3 h-3 text-rose-600" /> Falló
                          </span>
                        )}

                        {j.job_type === 'kitchen_ticket' ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-amber-200/80">
                            <Utensils className="w-3 h-3 text-amber-600" /> Comanda
                          </span>
                        ) : j.job_type === 'customer_receipt' ? (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-blue-200/80">
                            <Receipt className="w-3 h-3 text-blue-600" /> Recibo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-purple-200/80">
                            <Activity className="w-3 h-3 text-purple-600" /> Prueba
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap">
                        <span className="font-mono">
                          {j.printer_ip ? `${j.printer_ip}:${j.printer_port || 9100}` : 'Sin IP'}
                        </span>
                        {j.account_id && (
                          <span className="inline-flex items-center gap-0.5">
                            · Cuenta #{j.account_id}
                          </span>
                        )}
                        {j.created_at && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(j.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {j.error_message && (
                        <p className="text-[11px] text-rose-600 font-mono mt-1 break-all bg-rose-50/50 p-1.5 rounded-lg border border-rose-100">
                          {j.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL: NUEVA / EDITAR IMPRESORA ── */}
      {modalPrinter && (
        <PrinterFormModal
          printer={editingPrinter}
          onClose={() => {
            setModalPrinter(false);
            setEditingPrinter(null);
          }}
          onSave={handleSavePrinter}
          loading={loading}
        />
      )}

      {/* ── MODAL: AUDITORÍA INTEGRAL ("¿ESTÁ BIEN HECHO?") ── */}
      {showAuditModal && (
        <AuditReportModal
          auditData={auditData}
          loading={auditing}
          onClose={() => setShowAuditModal(false)}
        />
      )}

      {/* ── MODAL: CONFIRMAR ELIMINACIÓN ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <m.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
          >
            <div className="text-center">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">¿Eliminar impresora?</h3>
              <p className="text-xs text-slate-500 mb-6">
                Estás por eliminar <strong>{deleteConfirm.name}</strong> ({deleteConfirm.ip}). Las
                estaciones asociadas quedarán sin impresora asignada.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeletePrinter}
                  className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
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

// ─────────────────────────────────────────────────────────────
// COMPONENTE MODAL: FORMULARIO DE IMPRESORA
// ─────────────────────────────────────────────────────────────
function PrinterFormModal({ printer, onClose, onSave, loading }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: printer?.name || '',
    ip: printer?.ip || '',
    port: printer?.port || 9100,
    type: printer?.type || 'production',
    paperWidth: printer?.paper_width || '80mm',
    isActive: printer?.is_active !== 0 && printer?.is_active !== false,
    description: printer?.description || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Ingresa un nombre para la impresora');
    if (!form.ip.trim()) return toast.error('Ingresa la dirección IP de la impresora');
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <m.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {printer ? 'Editar Impresora' : 'Registrar Nueva Impresora'}
            </h3>
            <p className="text-xs text-slate-500">
              Impresora térmica de red con protocolo ESC/POS directo
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nombre de la Impresora
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Ticketera Cocina, Barra Piscina, Caja 1"
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              autoFocus
            />
          </div>

          {/* Tipo de Impresora (Tarjetas) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Función Principal
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'production' })}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  form.type === 'production'
                    ? 'border-amber-500 bg-amber-50/60 text-amber-900 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="text-base mb-1">🍳</div>
                <div className="text-xs">Comandas</div>
                <div className="text-[10px] text-slate-400">Cocina / Bar</div>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'receipt' })}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  form.type === 'receipt'
                    ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="text-base mb-1">🧾</div>
                <div className="text-xs">Recibos</div>
                <div className="text-[10px] text-slate-400">Cuentas / Caja</div>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'both' })}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  form.type === 'both'
                    ? 'border-indigo-500 bg-indigo-50/60 text-indigo-900 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="text-base mb-1">⚡</div>
                <div className="text-xs">Ambas</div>
                <div className="text-[10px] text-slate-400">Doble uso</div>
              </button>
            </div>
          </div>

          {/* Dirección IP y Puerto */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Dirección IP Local
              </label>
              <input
                type="text"
                value={form.ip}
                onChange={(e) => setForm({ ...form, ip: e.target.value })}
                placeholder="192.168.1.51"
                required
                className="w-full px-4 py-2.5 font-mono border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Puerto RAW
              </label>
              <input
                type="number"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: Number(e.target.value) || 9100 })}
                placeholder="9100"
                className="w-full px-4 py-2.5 font-mono border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 -mt-2">
            💡 <strong>Tip:</strong> Para averiguar la IP, apaga la impresora, mantén presionado el botón
            FEED y enciéndela: imprimirá una hoja de prueba con su IP asignada.
          </p>

          {/* Ancho del papel */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ancho del Rollo de Papel
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, paperWidth: '80mm' })}
                className={`p-2.5 rounded-xl border text-center text-xs font-semibold cursor-pointer ${
                  form.paperWidth === '80mm'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900 font-bold'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                80mm (Estándar restaurante)
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, paperWidth: '58mm' })}
                className={`p-2.5 rounded-xl border text-center text-xs font-semibold cursor-pointer ${
                  form.paperWidth === '58mm'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900 font-bold'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                58mm (Pequeña / Portátil)
              </button>
            </div>
          </div>

          {/* Descripción / Notas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ubicación o Notas (Opcional)
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ej: Al lado de la freidora, enchufe 3"
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Impresora'}
            </button>
          </div>
        </form>
      </m.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE MODAL: REPORTE DE AUDITORÍA ("¿ESTÁ BIEN HECHO?")
// ─────────────────────────────────────────────────────────────
function AuditReportModal({ auditData, loading, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <m.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <ClipboardCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Auditoría del Sistema de Impresión
              </h3>
              <p className="text-xs text-slate-500">
                Diagnóstico automático de productos, estaciones e impresoras
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {loading || !auditData ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
              <p className="text-sm font-semibold">Analizando configuración de impresión...</p>
            </div>
          ) : (
            <>
              {/* Tarjetas Resumen */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Productos */}
                <div
                  className={`p-4 rounded-2xl border ${
                    auditData.summary.productsOk
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50/60 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 opacity-75 stroke-[2]" />
                      Productos
                    </span>
                    {auditData.summary.productsOk ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.2]" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 stroke-[2.2]" />
                    )}
                  </div>
                  <p className="text-lg font-bold">
                    {auditData.orphanProducts.length === 0
                      ? '100% Asignados'
                      : `${auditData.orphanProducts.length} Huérfano(s)`}
                  </p>
                  <p className="text-[11px] opacity-80">
                    {auditData.orphanProducts.length === 0
                      ? 'Todos tienen estación de impresión'
                      : 'Sin estación de cocina asignada'}
                  </p>
                </div>

                {/* Estaciones de Cocina */}
                <div
                  className={`p-4 rounded-2xl border ${
                    auditData.summary.prodCentersOk
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50/60 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 opacity-75 stroke-[2]" />
                      Estaciones Cocina
                    </span>
                    {auditData.summary.prodCentersOk ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.2]" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 stroke-[2.2]" />
                    )}
                  </div>
                  <p className="text-lg font-bold">
                    {auditData.productionCenters.length} Estaciones
                  </p>
                  <p className="text-[11px] opacity-80">
                    {auditData.summary.prodCentersOk
                      ? 'Todas tienen IP asignada'
                      : 'Algunas usarán solo KDS'}
                  </p>
                </div>

                {/* Terminales */}
                <div
                  className={`p-4 rounded-2xl border ${
                    auditData.summary.terminalsOk
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50/60 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 opacity-75 stroke-[2]" />
                      Cajas / POS
                    </span>
                    {auditData.summary.terminalsOk ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.2]" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 stroke-[2.2]" />
                    )}
                  </div>
                  <p className="text-lg font-bold">
                    {auditData.terminals.length} Terminales
                  </p>
                  <p className="text-[11px] opacity-80">
                    {auditData.summary.terminalsOk
                      ? 'Todas imprimen recibos'
                      : 'Sin impresora de recibo'}
                  </p>
                </div>
              </div>

              {/* Detalle de Productos Huérfanos si los hay */}
              {auditData.orphanProducts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Productos sin estación de impresión ({auditData.orphanProducts.length})
                  </h4>
                  <p className="text-xs text-amber-800">
                    Estos productos están activos en la carta pero no tienen asignado un Centro de
                    Producción (Cocina/Bar) ni regla en la matriz. Al pedirlos, no saldrán en ninguna ticketera:
                  </p>
                  <div className="divide-y divide-amber-200/60 max-h-40 overflow-y-auto pr-1">
                    {auditData.orphanProducts.map((p) => (
                      <div key={p.id} className="py-1.5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-amber-950">{p.name}</span>
                        <span className="text-amber-700 text-[11px] bg-amber-100/70 px-2 py-0.2 rounded-md">
                          {p.category_name}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-amber-700 italic pt-1 flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
                    <span>Ve a la pestaña <strong>Productos</strong> y asígnales su centro de elaboración (Cocina, Bar, etc.).</span>
                  </p>
                </div>
              )}

              {/* Detalle de Estaciones */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Estado de Centros de Producción
                </h4>
                <div className="divide-y divide-slate-200/60">
                  {auditData.productionCenters.map((pc) => (
                    <div key={pc.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{pc.name}</span>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          {pc.printer_ip ? (
                            <>
                              <Printer className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
                              <span>{pc.printer_ip}:{pc.printer_port || 9100}</span>
                            </>
                          ) : (
                            <>
                              <Monitor className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
                              <span>Sin impresora física (KDS en pantalla)</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        {pc.assigned_products} productos vinculados
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </m.div>
    </div>
  );
}
