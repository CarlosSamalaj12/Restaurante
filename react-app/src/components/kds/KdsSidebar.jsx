import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';

const CATEGORY_COLORS = [
  { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300' },
  { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
  { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
  { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
];

export function KdsSidebar({
  showSidebar,
  setShowSidebar,
  totalItems,
  categoryCounts,
  thresholds
}) {
  return (
    <>
      <AnimatePresence>
        {showSidebar && (
          <m.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="bg-white border-r border-gray-200 flex flex-col overflow-hidden flex-shrink-0"
          >
            <div className="p-4 flex flex-col h-full">
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
                    <m.div
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
                    </m.div>
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
          </m.div>
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
    </>
  );
}

export default KdsSidebar;
