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
  BarChart3
} from 'lucide-react';
import { useKdsData } from '../hooks/useKdsData';
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
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [thresholds, setThresholds] = useState(DEFAULT_TIME_THRESHOLDS);
  const [showReport, setShowReport] = useState(false);

  const {
    orders,
    categories,
    centers,
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
  } = useKdsData(selectedCenter);

  const getTimeColor = (sentAt) => {
    const minutes = getMinutesSince(sentAt);
    if (minutes < thresholds.green) return { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-100' };
    if (minutes < thresholds.yellow) return { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-100' };
    if (minutes < thresholds.orange) return { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-100' };
    return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-100' };
  };

  const getCenterStyle = (centerName) => {
    return CENTER_COLORS[centerName] || CENTER_COLORS['default'];
  };

  const activeOrders = orders.filter(order => 
    order.items.some(i => !i.voided && !i.completed)
  );
  
  const completedOrders = orders.filter(order => 
    order.items.every(i => i.voided || i.completed)
  );

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

  const centerCounts = useMemo(() => {
    const counts = {};
    activeOrders.forEach(order => {
      const center = order.centerName || 'Otros';
      const itemsCount = order.items
        .filter(i => !i.voided && !i.completed)
        .reduce((sum, i) => sum + i.qty, 0);
      counts[center] = (counts[center] || 0) + itemsCount;
    });
    return counts;
  }, [activeOrders]);

  const handleShowReport = () => {
    setShowReport(true);
    loadKdsReport();
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
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
          className="bg-white border-b border-gray-200 px-6 py-3 shadow-sm z-30 flex-shrink-0"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 -ml-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight">KDS Cocina</h1>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-xs text-gray-500 font-medium">Actualización en tiempo real</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
              
              <button
                onClick={handleShowReport}
                className="p-2 bg-purple-100 text-purple-600 hover:bg-purple-200 rounded-xl transition-colors"
                title="Reporte KDS"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              
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
              <h3 className="text-xl font-semibold text-gray-700">¡Todo listo!</h3>
              <p className="text-gray-500 mt-1">No hay órdenes pendientes</p>
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
