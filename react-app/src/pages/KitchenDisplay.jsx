import { useState, useMemo } from 'react';
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
  LogOut
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useKdsData } from '../hooks/useKdsData';
import { BackButton } from '../components/BackButton';
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
    const sent = dayjs(sentAt);
    const now = dayjs();
    const diff = now.diff(sent, 'minute');
    return Math.max(0, diff);
  } catch (e) {
    return 0;
  }
};

export function KitchenDisplay({ onBack }) {
  const { user, logout } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [thresholds, setThresholds] = useState(DEFAULT_TIME_THRESHOLDS);
  const [showReport, setShowReport] = useState(false);

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
  } = useKdsData();

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

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden select-none">
      {/* Sidebar */}
      <KdsSidebar
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        totalItems={totalItems}
        categoryCounts={categoryCounts}
        thresholds={thresholds}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <m.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white border-b border-gray-200 px-6 py-3 shadow-xs z-30 flex-shrink-0"
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

                  {/* Badge de configuración de terminal / dispositivo */}
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
            </div>
          </div>

          {/* Selector de Estación y Centro de Consumo (Visible para administradores o terminales no bloqueadas) */}
          {(!isStationLocked || isAdminOrManager) && (
            <div className="mt-3 pt-2.5 border-t border-gray-100 flex flex-wrap items-center gap-3">
              {/* Estación de Producción */}
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

              {/* Centro de Consumo / Área */}
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

        {/* Settings Panel */}
        <KdsSettingsPanel
          showSettings={showSettings}
          thresholds={thresholds}
          setThresholds={setThresholds}
        />

        {/* Orders Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          {activeOrders.length === 0 ? (
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">¡Todo listo en {activeStationName}!</h3>
              <p className="text-gray-500 mt-1 text-sm">
                No hay órdenes pendientes para {activeStationName} {selectedOperationCenter ? `en ${activeOpCenterName}` : ''}
              </p>
            </m.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {activeOrders.map((order) => {
                  const style = getCenterStyle(order.centerName);
                  const oldestItem = order.items.filter(i => !i.voided && !i.completed && i.sentAt)[0];
                  const minutesAgo = getMinutesSince(oldestItem?.sentAt);
                  const timeColor = getTimeColor(oldestItem?.sentAt);

                  return (
                    <KdsOrderCard
                      key={`A-${order.accountId}`}
                      order={order}
                      style={style}
                      minutesAgo={minutesAgo}
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

          {/* Completed Orders */}
          {showCompleted && completedOrders.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
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
        </div>
      </div>

      {/* KDS Report Modal */}
      <KdsReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        reportDate={reportDate}
        setReportDate={setReportDate}
        loadKdsReport={loadKdsReport}
        reportLoading={reportLoading}
        reportData={reportData}
      />
    </div>
  );
}

export default KitchenDisplay;
