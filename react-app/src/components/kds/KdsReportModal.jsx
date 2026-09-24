import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import {
  BarChart3,
  Calendar,
  RefreshCw,
  Loader2,
  LayoutGrid,
  FileText,
  X
} from 'lucide-react';

export function KdsReportModal({
  isOpen,
  onClose,
  reportDate,
  setReportDate,
  loadKdsReport,
  reportLoading,
  reportData
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <m.div
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
              onClick={onClose}
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
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}

export default KdsReportModal;
