import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { useToast } from '../hooks/useToast';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {
  ChefHat,
  Coffee,
  Check,
  Clock,
  RefreshCw,
  Utensils,
  X,
  CheckCircle2,
  Loader2,
  User,
  Strikethrough,
  Settings,
  History,
  Flame,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  FileText,
  Timer,
  BarChart3,
  Calendar
} from 'lucide-react';

dayjs.extend(utc);
dayjs.extend(timezone);

// Color schemes for production centers
const CENTER_COLORS = {
  'Cocina': { bg: 'bg-orange-50', border: 'border-orange-300', accent: 'text-orange-600', badge: 'bg-orange-500' },
  'Bar': { bg: 'bg-blue-50', border: 'border-blue-300', accent: 'text-blue-600', badge: 'bg-blue-500' },
  'default': { bg: 'bg-emerald-50', border: 'border-emerald-300', accent: 'text-emerald-600', badge: 'bg-emerald-500' }
};

// Category colors
const CATEGORY_COLORS = [
  { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300' },
  { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
  { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
  { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
];

// Time thresholds configuration (in minutes)
const DEFAULT_TIME_THRESHOLDS = {
  green: 5,
  yellow: 10,
  orange: 15
};

// Helper to calculate minutes since sentAt
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
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingItems, setCompletingItems] = useState(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [thresholds, setThresholds] = useState(DEFAULT_TIME_THRESHOLDS);
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportDate, setReportDate] = useState(dayjs().format('YYYY-MM-DD'));
  const toast = useToast();

  // Get time color class based on thresholds
  const getTimeColor = (sentAt) => {
    const minutes = getMinutesSince(sentAt);
    if (minutes < thresholds.green) return { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-100' };
    if (minutes < thresholds.yellow) return { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-100' };
    if (minutes < thresholds.orange) return { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-100' };
    return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-100' };
  };

  const loadData = useCallback(async () => {
    try {
      const [ordersData, centersData] = await Promise.all([
        api.kds.getOrdersWithVoided(selectedCenter),
        api.kds.getProductionCenters()
      ]);
      
      setOrders(ordersData.orders || []);
      setCategories(ordersData.categories || []);
      setCenters(centersData.centers || []);
    } catch (error) {
      toast.error('Error al cargar órdenes');
    } finally {
      setLoading(false);
    }
  }, [selectedCenter, toast]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleMarkDone = async (itemId) => {
    setCompletingItems(prev => new Set([...prev, itemId]));
    try {
      await api.kds.markItemDone(itemId);
      toast.success('¡Listo!');
      loadData();
    } catch (error) {
      toast.error('Error al marcar como listo');
    } finally {
      setCompletingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleMarkAllDone = async (accountId) => {
    try {
      await api.kds.markAccountDone(accountId);
      toast.success('Ticket completado ✓');
      loadData();
    } catch (error) {
      toast.error('Error al completar');
    }
  };

  const loadKdsReport = async () => {
    setReportLoading(true);
    try {
      const data = await api.kds.getKdsReport(reportDate, selectedCenter);
      setReportData(data);
    } catch (error) {
      toast.error('Error al cargar reporte');
    } finally {
      setReportLoading(false);
    }
  };

  const handleShowReport = () => {
    setShowReport(true);
    loadKdsReport();
  };

  const getCenterStyle = (centerName) => {
    return CENTER_COLORS[centerName] || CENTER_COLORS['default'];
  };

  // Separate active and completed orders (must be before categoryCounts)
  const activeOrders = orders.filter(order => 
    order.items.some(i => !i.voided && !i.completed)
  );
  
  const completedOrders = orders.filter(order => 
    order.items.every(i => i.voided || i.completed)
  );

  // Calculate category counts from active orders (by product category)
  const categoryCounts = useMemo(() => {
    const counts = {};
    activeOrders.forEach(order => {
      order.items.forEach(item => {
        if (!item.voided && !item.completed) {
          const catName = item.categoryName || 'Otros';
          counts[catName] = (counts[catName] || 0) + item.qty;
        }
      });
    });
    return counts;
  }, [orders, activeOrders]);

  // Calculate counts by production center (for filter buttons)
  // Each order belongs to ONE center, so we count from activeOrders grouped by centerName
  const centerCounts = useMemo(() => {
    const counts = {};
    activeOrders.forEach(order => {
      const centerName = order.centerName || 'Restaurante';
      const pendingItems = order.items.filter(i => !i.voided && !i.completed);
      if (pendingItems.length > 0) {
        counts[centerName] = (counts[centerName] || 0) + pendingItems.reduce((sum, i) => sum + i.qty, 0);
      }
    });
    return counts;
  }, [orders, activeOrders]);

  const totalItems = activeOrders.reduce((sum, order) => 
    sum + order.items.filter(i => !i.voided && !i.completed).length, 0
  );

  const totalVoided = orders.reduce((sum, order) => 
    sum + order.items.filter(i => i.voided).length, 0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-12 h-12 text-gray-400" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar - Category Counts */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="bg-white border-r border-gray-200 overflow-hidden flex-shrink-0"
          >
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-gray-600" />
                  Categorías
                </h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              
              {/* Total Counter */}
              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 mb-4 text-white">
                <p className="text-sm opacity-90">Total Pendientes</p>
                <p className="text-4xl font-bold">{totalItems}</p>
                <p className="text-xs opacity-80 mt-1">items por preparar</p>
              </div>

              {/* Category List */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {Object.entries(categoryCounts)
                  .filter(([_, count]) => count > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([catName, count], index) => {
                  const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                  return (
                    <motion.div
                      key={catName}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`${color.bg} ${color.border} border rounded-xl p-3`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold ${color.text}`}>{catName}</span>
                        <span className={`text-2xl font-bold ${color.text}`}>{count}</span>
                      </div>
                    </motion.div>
                  );
                })}
                
                {Object.keys(categoryCounts).length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">Sin productos pendientes</p>
                  </div>
                )}
              </div>

              {/* Time Legend */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-2">Tiempos:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-emerald-500"></div>
                    <span className="text-gray-600">0-{thresholds.green}m</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-amber-500"></div>
                    <span className="text-gray-600">{thresholds.green}-{thresholds.yellow}m</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-orange-500"></div>
                    <span className="text-gray-600">{thresholds.yellow}-{thresholds.orange}m</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-red-500"></div>
                    <span className="text-gray-600">&gt;{thresholds.orange}m</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Sidebar Button */}
      {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-r-lg p-2 shadow-lg z-40 hover:bg-gray-50"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <ChefHat className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-900 text-lg">KDS</h1>
                  <p className="text-xs text-gray-500">Kitchen Display</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Status badges */}
              <div className="flex items-center gap-2">
                <div className="px-4 py-2 bg-orange-500 text-white rounded-full font-bold text-sm flex items-center gap-1.5 shadow-lg">
                  <Flame className="w-4 h-4" />
                  {totalItems}
                </div>
                
                {totalVoided > 0 && (
                  <div className="px-3 py-2 bg-red-100 text-red-700 rounded-full font-medium text-sm flex items-center gap-1">
                    <Strikethrough className="w-3 h-3" />
                    {totalVoided}
                  </div>
                )}
              </div>
              
              {/* Completed toggle */}
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className={`p-2 rounded-xl transition-colors ${
                  showCompleted 
                    ? 'bg-emerald-100 text-emerald-600' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title={showCompleted ? 'Ocultar completados' : 'Ver completados'}
              >
                <History className="w-4 h-4" />
              </button>
              
              {/* Report */}
              <button
                onClick={handleShowReport}
                className="p-2 bg-purple-100 text-purple-600 hover:bg-purple-200 rounded-xl transition-colors"
                title="Reporte KDS"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              
              {/* Settings */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-xl transition-colors ${
                  showSettings 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>
              
              {/* Refresh */}
              <button
                onClick={loadData}
                className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Filter */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCenter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCenter === null
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos ({totalItems})
            </button>
            {centers.map(center => {
              const count = centerCounts[center.name] || 0;
              return (
                <button
                  key={center.id}
                  onClick={() => setSelectedCenter(center.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCenter === center.id
                      ? 'bg-gray-900 text-white shadow-md'
                      : count > 0
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {center.name} ({count})
                </button>
              );
            })}
          </div>
        </motion.header>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-blue-50 border-b border-blue-100 overflow-hidden"
            >
              <div className="p-4">
                <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Configurar Alertas de Tiempo
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-blue-700 font-medium flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-emerald-500"></div>
                      Normal (min)
                    </label>
                    <input
                      type="number"
                      value={thresholds.green}
                      onChange={(e) => setThresholds(prev => ({ ...prev, green: parseInt(e.target.value) || 1 }))}
                      className="w-full mt-1 p-2 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-blue-700 font-medium flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-amber-500"></div>
                      Atención (min)
                    </label>
                    <input
                      type="number"
                      value={thresholds.yellow}
                      onChange={(e) => setThresholds(prev => ({ ...prev, yellow: parseInt(e.target.value) || 1 }))}
                      className="w-full mt-1 p-2 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-blue-700 font-medium flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-red-500"></div>
                      Crítico (min)
                    </label>
                    <input
                      type="number"
                      value={thresholds.orange}
                      onChange={(e) => setThresholds(prev => ({ ...prev, orange: parseInt(e.target.value) || 1 }))}
                      className="w-full mt-1 p-2 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      min="1"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Orders Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          {activeOrders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700">¡Todo listo!</h3>
              <p className="text-gray-500 mt-1">No hay órdenes pendientes</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {activeOrders.map((order) => {
                  const style = getCenterStyle(order.centerName);
                  const oldestItem = order.items.filter(i => !i.voided && !i.completed && i.sentAt)[0];
                  const minutesAgo = getMinutesSince(oldestItem?.sentAt);
                  const timeColor = getTimeColor(oldestItem?.sentAt);
                  
                  const activeItems = order.items.filter(i => !i.voided && !i.completed);
                  const voidedItems = order.items.filter(i => i.voided);

                  return (
                    <motion.div
                      key={`A-${order.accountId}`}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={`${style.bg} border-2 ${style.border} rounded-2xl overflow-hidden shadow-md`}
                    >
                      {/* Header */}
                      <div className={`${style.badge} px-4 py-2.5 flex items-center justify-between`}>
                        <div className="flex items-center gap-2 text-white">
                          {order.centerName === 'Cocina' ? (
                            <Utensils className="w-4 h-4" />
                          ) : order.centerName === 'Bar' ? (
                            <Coffee className="w-4 h-4" />
                          ) : (
                            <ChefHat className="w-4 h-4" />
                          )}
                          <span className="font-bold text-sm">{order.centerName}</span>
                        </div>
                        <div className={`${timeColor.light} px-2.5 py-1 rounded-lg flex items-center gap-1`}>
                          <Clock className={`w-3.5 h-3.5 ${timeColor.text}`} />
                          <span className={`text-sm font-bold ${timeColor.text}`}>{minutesAgo}m</span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="px-4 py-3 bg-white border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xl font-bold text-gray-900">Mesa {order.tableCode}</span>
                            <p className="text-xs text-gray-400">#{order.checkNumber}</p>
                          </div>
                          {order.waiterName && (
                            <div className="flex items-center gap-1.5 bg-purple-100 px-2.5 py-1 rounded-lg">
                              <User className="w-3.5 h-3.5 text-purple-600" />
                              <span className="text-xs font-medium text-purple-700">{order.waiterName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="p-3 space-y-2 max-h-[250px] overflow-y-auto">
                        {activeItems.map((item) => (
                          <motion.div
                            key={item.itemId}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleMarkDone(item.itemId)}
                            className={`bg-white rounded-xl p-3 border-2 transition-all cursor-pointer ${
                              completingItems.has(item.itemId)
                                ? 'border-emerald-400 bg-emerald-50'
                                : 'border-gray-100 hover:border-emerald-400 hover:shadow-md'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                                item.seatNo === 1 ? 'bg-blue-500' :
                                item.seatNo === 2 ? 'bg-emerald-500' :
                                item.seatNo === 3 ? 'bg-amber-500' :
                                'bg-purple-500'
                              }`}>S{item.seatNo}</span>
                              <span className="text-lg font-bold text-gray-900">{item.qty}x</span>
                              <span className="text-sm font-semibold text-gray-800 flex-1 truncate">{item.productName}</span>
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                completingItems.has(item.itemId) ? 'bg-emerald-100' : 'bg-emerald-500'
                              }`}>
                                {completingItems.has(item.itemId) ? (
                                  <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4 text-white" />
                                )}
                              </div>
                            </div>
                            {item.modifiers?.length > 0 && (
                              <div className="mt-1.5 ml-9 flex flex-wrap gap-1">
                                {item.modifiers.map((mod, idx) => (
                                  <span key={idx} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{mod}</span>
                                ))}
                              </div>
                            )}
                            {item.notes && (
                              <p className="mt-1 text-xs text-amber-600 font-medium italic ml-9">📝 {item.notes}</p>
                            )}
                          </motion.div>
                        ))}
                        
                        {voidedItems.map((item) => (
                          <div key={item.itemId} className="bg-red-50 rounded-xl p-3 border border-red-200 opacity-60">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-red-200 flex items-center justify-center">
                                <X className="w-4 h-4 text-red-600" />
                              </div>
                              <span className="text-lg font-bold text-red-400 line-through">{item.qty}x</span>
                              <span className="text-sm font-semibold text-red-400 line-through flex-1">{item.productName}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {activeItems.length > 0 && (
                        <div className="px-3 py-2.5 bg-white border-t border-gray-100">
                          <button
                            onClick={() => handleMarkAllDone(order.accountId)}
                            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Completar Todo
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Completed Orders */}
          {showCompleted && completedOrders.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <History className="w-4 h-4" />
                Completados ({completedOrders.length})
              </h2>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {completedOrders.map((order) => (
                  <div key={`C-${order.accountId}`} className="bg-white rounded-xl p-3 border border-gray-200 opacity-60">
                    <p className="font-semibold text-gray-700">Mesa {order.tableCode}</p>
                    <p className="text-xs text-emerald-600">✓ {order.items.length} items</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KDS Report Modal */}
      <AnimatePresence>
        {showReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowReport(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <BarChart3 className="w-6 h-6" />
                  <h2 className="text-xl font-bold">Reporte KDS</h2>
                </div>
                <button
                  onClick={() => setShowReport(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Date Filter */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => {
                      setReportDate(e.target.value);
                      loadKdsReport();
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <button
                  onClick={loadKdsReport}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Actualizar
                </button>
              </div>

              {/* Report Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {reportLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                  </div>
                ) : reportData ? (
                  <div className="space-y-6">
                    {/* Stats Summary */}
                    {reportData.stats && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl p-4 text-white">
                          <p className="text-sm opacity-90">Total Items</p>
                          <p className="text-3xl font-bold">{reportData.stats.totalItems}</p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl p-4 text-white">
                          <p className="text-sm opacity-90">Cantidad Total</p>
                          <p className="text-3xl font-bold">{reportData.stats.totalQty}</p>
                        </div>
                        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-4 text-white">
                          <p className="text-sm opacity-90">Tiempo Promedio</p>
                          <p className="text-3xl font-bold">{reportData.stats.avgTime}m</p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-4 text-white">
                          <p className="text-sm opacity-90">Rango</p>
                          <p className="text-2xl font-bold">{reportData.stats.minTime}-{reportData.stats.maxTime}m</p>
                        </div>
                      </div>
                    )}

                    {/* Category Stats */}
                    {reportData.stats?.byCategory?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <LayoutGrid className="w-4 h-4" />
                          Por Categoría
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {reportData.stats.byCategory.map((cat, idx) => {
                            const colors = ['bg-violet-100 text-violet-700', 'bg-pink-100 text-pink-700', 'bg-cyan-100 text-cyan-700', 'bg-teal-100 text-teal-700'];
                            return (
                              <div key={cat.category} className={`${colors[idx % colors.length]} rounded-xl p-3`}>
                                <p className="font-semibold text-sm truncate">{cat.category}</p>
                                <p className="text-2xl font-bold">{cat.items}</p>
                                <p className="text-xs opacity-75">avg {cat.avgTime}m</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Items List */}
                    {reportData.items?.length > 0 ? (
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Detalle de Items Completados ({reportData.items.length})
                        </h3>
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Producto</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Cant.</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Mesa</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Centro</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Tiempo</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Completado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {reportData.items.map((item, idx) => {
                                const timeColor = item.prep_time_minutes < 5 ? 'text-emerald-600' :
                                  item.prep_time_minutes < 10 ? 'text-amber-600' :
                                  item.prep_time_minutes < 15 ? 'text-orange-600' : 'text-red-600';
                                return (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{item.product_name}</td>
                                    <td className="px-4 py-3 text-center font-semibold">{item.qty}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">{item.table_code}</td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        item.center_name === 'Cocina' ? 'bg-orange-100 text-orange-700' :
                                        item.center_name === 'Bar' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {item.center_name}
                                      </span>
                                    </td>
                                    <td className={`px-4 py-3 text-center font-bold ${timeColor}`}>
                                      {item.prep_time_minutes}m
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-500 text-xs">
                                      {item.completed_at ? dayjs(item.completed_at).format('HH:mm') : '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No hay items completados para esta fecha</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>Selecciona una fecha para ver el reporte</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default KitchenDisplay;
