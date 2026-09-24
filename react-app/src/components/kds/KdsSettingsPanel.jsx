import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Settings } from 'lucide-react';

export function KdsSettingsPanel({
  showSettings,
  thresholds,
  setThresholds
}) {
  return (
    <AnimatePresence>
      {showSettings && (
        <m.div
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 0 }}
          style={{ transformOrigin: 'top' }}
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
        </m.div>
      )}
    </AnimatePresence>
  );
}

export default KdsSettingsPanel;
