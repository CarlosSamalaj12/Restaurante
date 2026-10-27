import { useState, useMemo, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {
  ArrowLeft,
  Flame,
  Strikethrough,
  RefreshCw,
  Settings,
  History,
  CheckCircle2,
  BarChart3,
  Tv,
  Wine,
  ChefHat,
  Lock,
  Unlock,
  Building2,
  Filter,
  LogOut,
  Sparkles,
  AlertCircle,
  ClipboardList,
  Soup,
  Package,
  Clock,
  X,
  Volume2,
  VolumeX,
  ChevronDown,
  LayoutGrid,
  Check,
  CheckCheck
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useKdsData } from '../hooks/useKdsData';
import { useSocket } from '../hooks/useSocket';
import { useToast } from '../hooks/useToast';
import { playNewOrderChime } from '../utils/soundAlerts';
import { BackButton } from '../components/BackButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { KdsSidebar } from '../components/kds/KdsSidebar';
import { KdsSettingsPanel } from '../components/kds/KdsSettingsPanel';
import { KdsOrderCard } from '../components/kds/KdsOrderCard';
import { KdsReportModal } from '../components/kds/KdsReportModal';

dayjs.extend(utc);
dayjs.extend(timezone);

const CENTER_COLORS = {
  'Cocina': { bg: 'bg-orange-50', border: 'border-orange-300', accent: 'text-orange-600', badge: 'bg-orange-500' },
  'Bar': { bg: 'bg-blue-50', border: 'border-blue-300', accent: 'text-blue-600', badge: 'bg-blue-500' },
  'default': { bg: 'bg-emerald-50', border: 'border-emerald-300', accent: 'text-emerald-600', badge: 'bg-emerald-500' }
};

const DEFAULT_TIME_THRESHOLDS = {
  green: 5,
  yellow: 10,
  orange: 15
};

const getMinutesSince = (sentAt) => {
  if (!sentAt) return 0;
  try {
    const safeStr = typeof sentAt === 'string' ? sentAt.replace(' ', 'T') : sentAt;
    const sent = dayjs(safeStr);
    const now = dayjs();
    const diff = now.diff(sent, 'minute');
    return Math.max(0, isNaN(diff) ? 0 : diff);
  } catch (e) {
    return 0;
  }
};

const getFormattedElapsed = (sentAt) => {
  if (!sentAt) return '00:00 min';
  try {
    const safeStr = typeof sentAt === 'string' ? sentAt.replace(' ', 'T') : sentAt;
    const sent = dayjs(safeStr);
    const now = dayjs();
    const totalSecs = Math.max(0, now.diff(sent, 'second'));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} min`;
  } catch {
    return '00:00 min';
  }
};

export function KitchenDisplay({ onBack }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [thresholds, setThresholds] = useState(DEFAULT_TIME_THRESHOLDS);
  const [showReport, setShowReport] = useState(false);

  // Estados exclusivos para Modo Móvil KDS
  const [mobileTab, setMobileTab] = useState('orders'); // 'orders' | 'categories' | 'history'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState('all'); // 'all' | 'normal' | 'warning' | 'critical'
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Temporizador para actualización en vivo del cronómetro
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const {
    orders,
    categories,
    centers,
    operationCenters,
    stationConfig,
    stationLoaded,
    selectedProductionCenter,
    setSelectedProductionCenter,
    selectedOperationCenter,
    setSelectedOperationCenter,
    loading,
    completingItems,
    loadData,
    handleMarkDone,
    handleMarkAllDone,
    reportData,
    reportLoading,
    reportDate,
    setReportDate,
    loadKdsReport,
    moduleEnabled,
    moduleLoading,
    toggleModule,
  } = useKdsData();

  // Escuchar eventos Socket en tiempo real para recarga y campanilla sonora
  useSocket({
    'sales:order': () => {
      loadData();
      if (soundEnabled) playNewOrderChime();
    },
    'orders:self_service_new': () => {
      loadData();
      if (soundEnabled) playNewOrderChime();
    },
    'table:update': () => {
      loadData();
    }
  });

  // Verifica roles y permisos
  const isSuperadmin = String(user?.role || '').toLowerCase() === 'superadmin';
  const [togglingModule, setTogglingModule] = useState(false);

  // Diálogo de Confirmación Moderno
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    itemName: '',
    itemDetail: '',
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    variant: 'danger',
    loading: false,
    onConfirm: () => {},
  });

  const closeConfirm = () => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
  };

  const handleToggleModule = (enable) => {
    if (!isSuperadmin) return;
    setConfirmDialog({
      isOpen: true,
      title: enable ? '¿Activar Módulo de Pantallas KDS?' : '¿Desactivar Módulo de Pantallas KDS?',
      message: enable
        ? 'Se habilitarán las pantallas de cocina en tiempo real para todas las estaciones. Los pedidos se visualizarán al instante en los monitores de cocina y barra.'
        : 'Al desactivar el módulo, las pantallas KDS dejarán de mostrar pedidos y se bloquearán para el personal. Las comandas continuarán imprimiéndose en los tickets físicos normalmente.',
      itemName: enable ? 'Módulo: Pantallas de Cocina (KDS)' : 'Desactivación de KDS',
      itemDetail: enable ? 'Acceso: Cocina, Barra, Despacho y Monitores' : 'Las impresoras térmicas seguirán activas',
      variant: enable ? 'success' : 'warning',
      confirmText: enable ? 'Activar KDS Ahora' : 'Desactivar KDS',
      loading: false,
      onConfirm: async () => {
        try {
          setConfirmDialog((prev) => ({ ...prev, loading: true }));
          setTogglingModule(true);
          await toggleModule(enable);
          closeConfirm();
        } catch (err) {
          console.error('Error toggling KDS module:', err);
          closeConfirm();
        } finally {
          setTogglingModule(false);
        }
      },
    });
  };

  // Verifica si el usuario actual tiene privilegios de supervisor / administrador
  const isAdminOrManager = useMemo(() => {
    if (!user) return false;
    const role = String(user.role || '').toLowerCase();
    const roleNames = String(user.role_names || '').toLowerCase();
    return (
      role === 'superadmin' ||
      role === 'admin' ||
      roleNames.includes('admin') ||
      roleNames.includes('gerente') ||
      roleNames.includes('supervisor')
    );
  }, [user]);

  // Si la terminal física está preconfigurada en Settings y el usuario NO es admin, bloquear filtros
  const isStationLocked = useMemo(() => {
    return Boolean(stationConfig?.kds_production_center_id) && !isAdminOrManager;
  }, [stationConfig, isAdminOrManager]);

  const getTimeColor = (sentAt) => {
    const minutes = getMinutesSince(sentAt);
    if (minutes < thresholds.green) return { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-100' };
    if (minutes < thresholds.yellow) return { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-100' };
    if (minutes < thresholds.orange) return { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-100' };
    return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-100' };
  };

  const getCenterStyle = (centerName = '') => {
    const name = String(centerName).toLowerCase();
    if (name.includes('bar')) return CENTER_COLORS['Bar'];
    if (name.includes('cocina')) return CENTER_COLORS['Cocina'];
    return CENTER_COLORS[centerName] || CENTER_COLORS['default'];
  };

  const activeOrders = useMemo(() => {
    return orders.filter(order => order.items.some(i => !i.voided && !i.completed));
  }, [orders]);
  
  const completedOrders = useMemo(() => {
    return orders.filter(order => order.items.every(i => i.voided || i.completed));
  }, [orders]);

  // Filtro de tiempos y de área para móvil
  const filteredActiveOrders = useMemo(() => {
    return activeOrders.filter(order => {
      if (timeFilter === 'all') return true;
      const oldestItem = order.items.filter(i => !i.voided && !i.completed && i.sentAt)[0];
      const minutes = getMinutesSince(oldestItem?.sentAt);
      if (timeFilter === 'normal') return minutes < thresholds.green;
      if (timeFilter === 'warning') return minutes >= thresholds.green && minutes < thresholds.orange;
      if (timeFilter === 'critical') return minutes >= thresholds.orange;
      return true;
    });
  }, [activeOrders, timeFilter, thresholds]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    activeOrders.forEach(order => {
      order.items.forEach(item => {
        if (!item.voided && !item.completed) {
          const cat = item.categoryName || 'Otros';
          counts[cat] = (counts[cat] || 0) + item.qty;
        }
      });
    });
    return counts;
  }, [activeOrders]);

  const totalItems = useMemo(() => {
    return activeOrders.reduce((sum, order) => {
      return sum + order.items
        .filter(i => !i.voided && !i.completed)
        .reduce((itemSum, item) => itemSum + item.qty, 0);
    }, 0);
  }, [activeOrders]);

  const totalVoided = useMemo(() => {
    return orders.reduce((sum, order) => {
      return sum + order.items
        .filter(i => i.voided)
        .reduce((itemSum, item) => itemSum + item.qty, 0);
    }, 0);
  }, [orders]);

  // Nombre legible de la estación activa
  const activeStationName = useMemo(() => {
    if (selectedProductionCenter) {
      const pc = centers.find(c => c.id === selectedProductionCenter);
      return pc?.name || 'Estación';
    }
    return 'Todas las estaciones';
  }, [selectedProductionCenter, centers]);

  const activeOpCenterName = useMemo(() => {
    if (selectedOperationCenter) {
      const oc = operationCenters.find(c => c.id === selectedOperationCenter);
      return oc?.name || 'Área';
    }
    return 'Todas las áreas';
  }, [selectedOperationCenter, operationCenters]);

  const isBarStation = activeStationName.toLowerCase().includes('bar');

  const handleShowReport = () => {
    setShowReport(true);
    loadKdsReport();
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    toast.success('Comandas sincronizadas');
    setTimeout(() => {
      setIsRefreshing(false);
      setMobileTab('orders');
    }, 400);
  };

  // Vista de bloqueo si el módulo KDS está inactivo
  if (!moduleLoading && !moduleEnabled) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
        <header className="w-full max-w-3xl mx-auto flex items-center justify-between py-2.5 px-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs">
          <div className="flex items-center gap-2">
            <BackButton onClick={onBack} label="Volver" title="Volver al Punto de Venta" />
            <span className="font-bold tracking-wide text-white uppercase text-xs">
              Módulo KDS • Pantallas de Cocina
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Módulo Desactivado
          </span>
        </header>

        <main className="w-full max-w-2xl mx-auto my-auto py-8">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-xs">
              <Lock className="w-8 h-8" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Módulo Premium Opcional
            </span>

            <h2 className="text-2xl font-bold text-white mb-2">
              Pantallas de Cocina y Despacho en Tiempo Real (KDS)
            </h2>
            <p className="text-slate-300 max-w-md mx-auto text-sm mb-6 leading-relaxed">
              Monitorea tiempos de preparación en vivo, gestiona comandas por estación de trabajo (Cocina, Bar, Postres) y optimiza el despacho de platillos sin papel.
            </p>

            {isSuperadmin ? (
              <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-5 max-w-md mx-auto space-y-3">
                <span className="text-xs font-semibold text-slate-300 block">
                  Acceso de Super Administrador detectado
                </span>
                <button
                  disabled={togglingModule}
                  onClick={() => handleToggleModule(true)}
                  className="w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20 transition active:scale-[0.98] cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  {togglingModule ? 'Activando KDS...' : 'Activar Módulo KDS Ahora'}
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700 max-w-md mx-auto text-xs text-slate-400 flex items-center justify-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Este módulo se encuentra desactivado. Solicita al Super Administrador su activación.</span>
              </div>
            )}

            <div className="pt-6 mt-6 border-t border-slate-700/60 flex justify-center">
              <button
                type="button"
                onClick={onBack}
                className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Volver al Punto de Venta
              </button>
            </div>
          </div>
        </main>

        <footer className="w-full max-w-3xl mx-auto text-center text-xs text-slate-500 py-2">
          Restaurante POS • Sistema de Punto de Venta
        </footer>

        {/* Diálogo de Confirmación */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          itemName={confirmDialog.itemName}
          itemDetail={confirmDialog.itemDetail}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          variant={confirmDialog.variant}
          loading={confirmDialog.loading}
          onConfirm={confirmDialog.onConfirm}
          onCancel={closeConfirm}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden select-none">
      {/* Sidebar Desktop (Oculto en móvil) */}
      <div className="hidden sm:flex">
        <KdsSidebar
          showSidebar={showSidebar}
          setShowSidebar={setShowSidebar}
          totalItems={totalItems}
          categoryCounts={categoryCounts}
          thresholds={thresholds}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* ========================================================
            CABECERA MÓVIL (sm:hidden) - Diseño fiel a la referencia
           ======================================================== */}
        <div className="sm:hidden bg-white border-b border-gray-200 px-3.5 py-2.5 shadow-2xs z-30 flex-shrink-0 space-y-2">
          {/* Fila 1: Botón Volver + Título KDS + Pendientes + Bloqueo/Opciones */}
          <div className="flex items-center justify-between gap-1.5">
            {/* Botón Volver Azul (estilo píldora como en referencia) */}
            <button
              onClick={onBack}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1 cursor-pointer flex-shrink-0"
              title="Volver al menú principal"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver</span>
            </button>

            {/* Título Central */}
            <div className="flex flex-col items-center flex-1 min-w-0 px-1">
              <div className="flex items-center gap-1.5 truncate">
                <ChefHat className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <h1 className="text-sm font-black text-gray-900 tracking-tight truncate">
                  KDS Comandas
                </h1>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>En tiempo real</span>
              </div>
            </div>

            {/* Badge de Pendientes y Botones de Control */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="px-2 py-1 rounded-full text-xs font-black bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-2xs flex items-center gap-1">
                <Package className="w-3 h-3" />
                <span>{totalItems} pend.</span>
              </span>

              {/* Indicador de bloqueo de estación */}
              <div className="p-1 rounded-lg bg-gray-100 text-gray-500">
                {isStationLocked ? (
                  <Lock className="w-3.5 h-3.5 text-gray-400" title="Estación fija por configuración de terminal" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-emerald-600" title="Selección libre de estación" />
                )}
              </div>

              {/* Botón de Menú de Opciones */}
              <button
                type="button"
                onClick={() => setShowMobileMenu(true)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                title="Ajustes y Opciones KDS"
              >
                <Settings className="w-4 h-4 text-slate-700" />
              </button>
            </div>
          </div>

          {/* Fila 2: Filtros Compactos Móvil (Estación, Tiempos, Área) */}
          {mobileTab === 'orders' && (
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-0.5 no-scrollbar">
              {/* Filtro 1: Estación de Producción */}
              {(!isStationLocked || isAdminOrManager) && (
                <div className="relative flex-1 min-w-[125px]">
                  <select
                    value={selectedProductionCenter || ''}
                    onChange={(e) => setSelectedProductionCenter(e.target.value ? Number(e.target.value) : null)}
                    className="w-full appearance-none bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-xl pl-2.5 pr-6 py-1.5 truncate focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                  >
                    <option value="">🔍 Todas: Estaciones</option>
                    {centers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}

              {/* Filtro 2: Alertas de Tiempo */}
              <div className="relative flex-1 min-w-[120px]">
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full appearance-none bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-xl pl-2.5 pr-6 py-1.5 truncate focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                >
                  <option value="all">⏱ Tiempos: Todos</option>
                  <option value="normal">🟢 Normal (&lt;{thresholds.green}m)</option>
                  <option value="warning">🟡 Atención ({thresholds.green}-{thresholds.orange}m)</option>
                  <option value="critical">🔴 Crítico (&gt;{thresholds.orange}m)</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Filtro 3: Área / Salón (si existen centros de operación) */}
              {operationCenters.length > 0 && (
                <div className="relative flex-1 min-w-[110px]">
                  <select
                    value={selectedOperationCenter || ''}
                    onChange={(e) => setSelectedOperationCenter(e.target.value ? Number(e.target.value) : null)}
                    className="w-full appearance-none bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-xl pl-2.5 pr-6 py-1.5 truncate focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
                  >
                    <option value="">🏢 Área: Todas</option>
                    {operationCenters.map(oc => (
                      <option key={oc.id} value={oc.id}>{oc.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================
            CABECERA ESCRITORIO (hidden sm:block) - Mantener intacto
           ======================================================== */}
        <m.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="hidden sm:block bg-white border-b border-gray-200 px-6 py-3 shadow-xs z-30 flex-shrink-0"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BackButton
                onClick={onBack}
                label="Volver"
                title="Volver"
              />
              <div>
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${isBarStation ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    {isBarStation ? <Wine className="w-5 h-5" /> : <ChefHat className="w-5 h-5" />}
                  </div>
                  <h1 className="text-xl font-black text-gray-900 tracking-tight">
                    {selectedProductionCenter ? `KDS ${activeStationName}` : 'KDS Comandas'}
                  </h1>

                  {/* Badge de configuración de terminal */}
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    isBarStation
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    <Tv className="w-3.5 h-3.5" />
                    <span>{activeStationName}</span>
                    {selectedOperationCenter && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span>{activeOpCenterName}</span>
                      </>
                    )}
                    {isStationLocked ? (
                      <Lock className="w-3 h-3 text-gray-400 ml-0.5" title="Estación fija por configuración de terminal" />
                    ) : (
                      <Unlock className="w-3 h-3 text-emerald-500 ml-0.5" title="Modo supervisión / Selección libre" />
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-xs text-gray-500 font-medium">
                    {stationConfig?.name ? `Terminal: ${stationConfig.name} · ` : ''}Actualización en tiempo real
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className={`px-4 py-2 text-white rounded-full font-bold text-sm flex items-center gap-1.5 shadow-md ${
                  isBarStation ? 'bg-blue-600' : 'bg-orange-500'
                }`}>
                  <Flame className="w-4 h-4" />
                  {totalItems} platillos
                </div>
                
                {totalVoided > 0 && (
                  <div className="px-3 py-2 bg-red-100 text-red-700 rounded-full font-medium text-sm flex items-center gap-1">
                    <Strikethrough className="w-3 h-3" />
                    {totalVoided}
                  </div>
                )}
              </div>

              {/* Botón Silenciar / Activar Sonido */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  soundEnabled
                    ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
                title={soundEnabled ? 'Sonido activado' : 'Sonido silenciado'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  showCompleted 
                    ? 'bg-emerald-100 text-emerald-600' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title={showCompleted ? 'Ocultar completados' : 'Ver completados'}
              >
                <History className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleShowReport}
                className="p-2 bg-purple-100 text-purple-600 hover:bg-purple-200 rounded-xl transition-colors cursor-pointer"
                title="Reporte KDS"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  showSettings 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title="Ajustes de tiempos"
              >
                <Settings className="w-4 h-4" />
              </button>
              
              <button
                onClick={loadData}
                className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                title="Refrescar comanda"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Botón Salir (PIN) */}
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ml-1"
                title="Cerrar sesión / Salir (PIN)"
              >
                <LogOut className="w-4 h-4 text-red-600" />
                <span className="hidden sm:inline">Salir (PIN)</span>
              </button>

              {/* Botón Desactivar Módulo KDS (Exclusivo Superadmin) */}
              {isSuperadmin && (
                <button
                  type="button"
                  onClick={() => handleToggleModule(false)}
                  disabled={togglingModule}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ml-1"
                  title="Desactivar módulo KDS para todo el restaurante"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden md:inline">Desactivar KDS</span>
                </button>
              )}
            </div>
          </div>

          {/* Selector de Estación y Centro de Consumo Desktop */}
          {(!isStationLocked || isAdminOrManager) && (
            <div className="mt-3 pt-2.5 border-t border-gray-100 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mr-1">
                  <Filter className="w-3 h-3" />
                  Estación:
                </span>

                <button
                  onClick={() => setSelectedProductionCenter(null)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedProductionCenter === null
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Todas las estaciones
                </button>

                {centers.map(center => {
                  const isCurrent = selectedProductionCenter === center.id;
                  const isBar = center.name.toLowerCase().includes('bar');

                  return (
                    <button
                      key={center.id}
                      onClick={() => setSelectedProductionCenter(center.id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                        isCurrent
                          ? isBar ? 'bg-blue-600 text-white shadow-sm' : 'bg-orange-500 text-white shadow-sm'
                          : isBar ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                      }`}
                    >
                      {isBar ? <Wine className="w-3 h-3" /> : <ChefHat className="w-3 h-3" />}
                      {center.name}
                    </button>
                  );
                })}
              </div>

              {operationCenters.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 ml-auto border-l pl-3 border-gray-200">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mr-1">
                    <Building2 className="w-3 h-3" />
                    Área:
                  </span>

                  <button
                    onClick={() => setSelectedOperationCenter(null)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedOperationCenter === null
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Todas
                  </button>

                  {operationCenters.map(oc => {
                    const isCurrent = selectedOperationCenter === oc.id;
                    return (
                      <button
                        key={oc.id}
                        onClick={() => setSelectedOperationCenter(oc.id)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {oc.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </m.header>

        {/* Panel de Ajustes de Tiempos */}
        <KdsSettingsPanel
          showSettings={showSettings}
          thresholds={thresholds}
          setThresholds={setThresholds}
        />

        {/* ========================================================
            CONTENIDO PRINCIPAL (Conmutación según pestaña móvil)
           ======================================================== */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto pb-28 sm:pb-6">
          
          {/* PESTAÑA 1: COMANDAS ACTIVAS */}
          {mobileTab === 'orders' && (
            <>
              {filteredActiveOrders.length === 0 ? (
                <m.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-500" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-gray-800">
                    ¡Todo al día en {activeStationName}!
                  </h3>
                  <p className="text-gray-500 mt-1 text-xs sm:text-sm max-w-sm">
                    No hay pedidos pendientes {timeFilter !== 'all' ? 'para el filtro de tiempo seleccionado' : ''} en {activeStationName}.
                  </p>
                  {timeFilter !== 'all' && (
                    <button
                      onClick={() => setTimeFilter('all')}
                      className="mt-3 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      Ver todos los tiempos
                    </button>
                  )}
                </m.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
                  <AnimatePresence mode="popLayout">
                    {filteredActiveOrders.map((order) => {
                      const style = getCenterStyle(order.centerName);
                      const oldestItem = order.items.filter(i => !i.voided && !i.completed && i.sentAt)[0];
                      const minutesAgo = getMinutesSince(oldestItem?.sentAt);
                      const timeFormatted = getFormattedElapsed(oldestItem?.sentAt);
                      const timeColor = getTimeColor(oldestItem?.sentAt);

                      return (
                        <KdsOrderCard
                          key={`A-${order.accountId}`}
                          order={order}
                          style={style}
                          minutesAgo={minutesAgo}
                          timeFormatted={timeFormatted}
                          timeColor={timeColor}
                          completingItems={completingItems}
                          handleMarkDone={handleMarkDone}
                          handleMarkAllDone={handleMarkAllDone}
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

              {/* Completados Recientemente en Desktop */}
              {showCompleted && completedOrders.length > 0 && (
                <div className="hidden sm:block mt-8 pt-6 border-t border-gray-200">
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Completados Recientemente ({completedOrders.length})
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {completedOrders.map((order) => (
                      <div key={`C-${order.accountId}`} className="bg-white rounded-xl p-3 border border-gray-200 shadow-2xs">
                        <p className="font-bold text-gray-800 text-sm">Mesa {order.tableCode}</p>
                        <p className="text-xs text-emerald-600 font-semibold mt-0.5">✓ {order.items.length} ítems</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* PESTAÑA 2: CATEGORÍAS (Exclusiva Móvil) */}
          {mobileTab === 'categories' && (
            <div className="space-y-4 max-w-lg mx-auto">
              {/* Tarjeta Hero: Total Pendientes */}
              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-5 text-white shadow-md">
                <p className="text-xs font-bold uppercase tracking-wider text-white/80">Total Pendientes</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-4xl font-black">{totalItems}</p>
                  <span className="text-sm text-white/90 font-medium">platillos por preparar</span>
                </div>
                <p className="text-xs text-white/75 mt-2">
                  Distribuidos en {activeOrders.length} comandas activas
                </p>
              </div>

              {/* Lista de Categorías */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-3">
                <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                  <Soup className="w-4 h-4 text-orange-500" />
                  Platillos Pendientes por Categoría
                </h3>

                <div className="space-y-2">
                  {Object.entries(categoryCounts)
                    .filter(([_, count]) => count > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([catName, count]) => (
                      <div
                        key={catName}
                        onClick={() => setMobileTab('orders')}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 active:scale-[0.99] transition cursor-pointer"
                      >
                        <span className="font-bold text-slate-800 text-sm">{catName}</span>
                        <span className="text-base font-black px-2.5 py-0.5 rounded-lg bg-orange-100 text-orange-700 border border-orange-200">
                          {count}
                        </span>
                      </div>
                    ))}

                  {Object.keys(categoryCounts).length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-xs">
                      No hay platillos pendientes por preparar
                    </div>
                  )}
                </div>
              </div>

              {/* Leyenda de Tiempos de Preparación */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-2.5">
                <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  Escala de Alertas de Tiempo
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>0 - {thresholds.green}m (Normal)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span>{thresholds.green} - {thresholds.yellow}m (Atención)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                    <span>{thresholds.yellow} - {thresholds.orange}m (Alerta)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span>&gt; {thresholds.orange}m (Crítico)</span>
                  </div>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMobileTab('orders')}
                  className="px-5 py-2.5 bg-blue-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Volver a las Comandas
                </button>
              </div>
            </div>
          )}

          {/* PESTAÑA 3: HISTORIAL (Exclusiva Móvil) */}
          {mobileTab === 'history' && (
            <div className="space-y-4 max-w-lg mx-auto">
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-600" />
                    Comandas Despachadas
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {completedOrders.length} tickets despachados en este turno
                  </p>
                </div>

                <button
                  onClick={handleShowReport}
                  className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Reporte</span>
                </button>
              </div>

              {completedOrders.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
                  <History className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-700">Sin comandas completadas</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Los tickets que despaches aparecerán listados aquí.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {completedOrders.map((order) => (
                    <div
                      key={`hist-${order.accountId}`}
                      className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-2xs flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-900 text-sm">Mesa {order.tableCode}</span>
                          <span className="text-[11px] text-gray-400 font-mono">#{order.checkNumber}</span>
                        </div>
                        <p className="text-xs text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>{order.items.length} platillos completados</span>
                        </p>
                      </div>

                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                        Despachado ✓
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          BARRA DE NAVEGACIÓN INFERIOR MÓVIL (sm:hidden)
          Exacta a la imagen de referencia: [Comandas] [Categorías] [Historial] [Refrescar]
         ======================================================== */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40 py-1.5 px-3 flex items-center justify-around shadow-lg">
        {/* Pestaña 1: Comandas */}
        <button
          onClick={() => setMobileTab('orders')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            mobileTab === 'orders'
              ? 'text-blue-600 font-black'
              : 'text-gray-400 font-medium hover:text-gray-600'
          }`}
        >
          <div className="relative">
            <ClipboardList className={`w-5 h-5 ${mobileTab === 'orders' ? 'text-blue-600 stroke-[2.5]' : 'text-gray-400'}`} />
            {activeOrders.length > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 bg-blue-600 text-white rounded-full text-[9px] font-black flex items-center justify-center">
                {activeOrders.length}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Comandas</span>
        </button>

        {/* Pestaña 2: Categorías */}
        <button
          onClick={() => setMobileTab('categories')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            mobileTab === 'categories'
              ? 'text-orange-500 font-black'
              : 'text-gray-400 font-medium hover:text-gray-600'
          }`}
        >
          <div className="relative">
            <Soup className={`w-5 h-5 ${mobileTab === 'categories' ? 'text-orange-500 stroke-[2.5]' : 'text-gray-400'}`} />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 bg-orange-500 text-white rounded-full text-[9px] font-black flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Categorías</span>
        </button>

        {/* Pestaña 3: Historial */}
        <button
          onClick={() => setMobileTab('history')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            mobileTab === 'history'
              ? 'text-purple-600 font-black'
              : 'text-gray-400 font-medium hover:text-gray-600'
          }`}
        >
          <div className="relative">
            <History className={`w-5 h-5 ${mobileTab === 'history' ? 'text-purple-600 stroke-[2.5]' : 'text-gray-400'}`} />
            {completedOrders.length > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 bg-purple-600 text-white rounded-full text-[9px] font-black flex items-center justify-center">
                {completedOrders.length}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Historial</span>
        </button>

        {/* Pestaña 4: Refrescar */}
        <button
          onClick={handleManualRefresh}
          className="flex flex-col items-center justify-center flex-1 py-1 text-gray-500 hover:text-blue-600 transition-all active:scale-95"
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-gray-400'}`} />
          <span className="text-[10px] mt-0.5 font-medium">Refrescar</span>
        </button>
      </div>

      {/* ========================================================
          MENÚ FLOTANTE MÓVIL DE OPCIONES (Sheet / Modal)
         ======================================================== */}
      {showMobileMenu && (
        <div
          className="sm:hidden fixed inset-0 bg-slate-900/60 z-50 flex flex-col justify-end p-3 animate-fade-in"
          onClick={() => setShowMobileMenu(false)}
        >
          <div
            className="bg-white rounded-3xl p-5 shadow-2xl space-y-4 max-w-md w-full mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Menú */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-orange-100 text-orange-600">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-base">Opciones de Pantalla KDS</h3>
                  <p className="text-xs text-gray-400 font-medium">{activeStationName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Opciones */}
            <div className="space-y-2.5">
              {/* Opción: Sonido de Alertas */}
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 active:bg-slate-100 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-gray-400" />
                  )}
                  <div className="text-left">
                    <p className="text-xs font-bold text-gray-800">Alerta Sonora de Comandas</p>
                    <p className="text-[11px] text-gray-400">
                      {soundEnabled ? 'Campanilla activada al llegar pedido' : 'Silenciado'}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${soundEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                  {soundEnabled ? 'Activo' : 'Mudo'}
                </span>
              </button>

              {/* Opción: Reporte KDS */}
              <button
                type="button"
                onClick={() => {
                  setShowMobileMenu(false);
                  handleShowReport();
                }}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-purple-50 border border-purple-200/80 text-purple-900 active:bg-purple-100 transition cursor-pointer"
              >
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <div className="text-left">
                  <p className="text-xs font-bold">Ver Reporte KDS del Día</p>
                  <p className="text-[11px] text-purple-600/80">Estadísticas y tiempos de preparación</p>
                </div>
              </button>

              {/* Opción: Ajustes de Tiempos y Alertas */}
              <button
                type="button"
                onClick={() => {
                  setShowMobileMenu(false);
                  setShowSettings(!showSettings);
                }}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-900 active:bg-blue-100 transition cursor-pointer"
              >
                <Settings className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <p className="text-xs font-bold">Configurar Tiempos de Alerta</p>
                  <p className="text-[11px] text-blue-600/80">Minutos para colores verde, amarillo y rojo</p>
                </div>
              </button>

              {/* Opción: Desactivar Módulo KDS (Superadmin) */}
              {isSuperadmin && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleToggleModule(false);
                  }}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 active:bg-amber-100 transition cursor-pointer"
                >
                  <Lock className="w-5 h-5 text-amber-600" />
                  <div className="text-left">
                    <p className="text-xs font-bold">Desactivar Módulo KDS</p>
                    <p className="text-[11px] text-amber-700/80">Suspende el monitoreo en pantalla</p>
                  </div>
                </button>
              )}

              {/* Opción: Salir / Cerrar Sesión PIN */}
              <button
                type="button"
                onClick={() => {
                  setShowMobileMenu(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs active:scale-[0.98] transition cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-600" />
                <span>Cerrar Sesión / Salir (PIN)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reporte KDS */}
      <KdsReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        reportDate={reportDate}
        setReportDate={setReportDate}
        loadKdsReport={loadKdsReport}
        reportLoading={reportLoading}
        reportData={reportData}
      />

      {/* Diálogo de Confirmación */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        itemName={confirmDialog.itemName}
        itemDetail={confirmDialog.itemDetail}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        loading={confirmDialog.loading}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}

export default KitchenDisplay;
