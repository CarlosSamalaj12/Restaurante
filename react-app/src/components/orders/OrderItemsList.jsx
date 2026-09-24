import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Package, Trash2 } from 'lucide-react';

export function OrderItemsList({
  items,
  account,
  totals,
  handleVoidItem
}) {
  return (
    <m.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="lg:w-72 bg-white border-b lg:border-b-0 lg:border-r border-gray-100 flex-shrink-0"
    >
      {/* Order Header */}
      <div className="px-4 py-3 border-b border-gray-50">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-gray-500" />
            <h2 className="font-medium text-gray-900 text-sm">Tu Orden</h2>
          </div>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
            {items.length} items
          </span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: Math.max(account?.guest_count || 4, 1) }, (_, i) => i + 1).map(seat => {
            const count = items.filter(it => (it.seat_no || 1) === seat).length;
            return count > 0 ? (
              <span key={seat} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                seat === 1 ? 'bg-blue-100 text-blue-700' :
                seat === 2 ? 'bg-emerald-100 text-emerald-700' :
                seat === 3 ? 'bg-amber-100 text-amber-700' :
                'bg-purple-100 text-purple-700'
              }`}>
                S{seat}: {count}
              </span>
            ) : null;
          })}
        </div>
      </div>
      
      {/* Items List */}
      <div className="p-3 space-y-2 max-h-[30vh] lg:max-h-[calc(100vh-280px)] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {items.length === 0 ? (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Package className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Sin productos</p>
            </m.div>
          ) : (
            items.map((item) => (
              <m.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="p-2.5 bg-gray-50 rounded-xl"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        (item.seat_no || 1) === 1 ? 'bg-blue-100 text-blue-700' :
                        (item.seat_no || 1) === 2 ? 'bg-emerald-100 text-emerald-700' :
                        (item.seat_no || 1) === 3 ? 'bg-amber-100 text-amber-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        S{(item.seat_no || 1)}
                      </span>
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                    </div>
                    {item.modifiers?.length > 0 && (
                      <p className="text-[10px] text-gray-500 mt-0.5 truncate ml-7">
                        {item.modifiers.map(m => m.name).join(', ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-[10px] text-amber-600 italic mt-0.5 ml-7">
                        Nota: {item.notes}
                      </p>
                    )}
                  </div>
                  <m.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleVoidItem(item)}
                    className="p-1.5 text-red-500/70 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </m.button>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-gray-500">
                    {item.qty} × Q{Number(item.unit_price || 0).toFixed(2)}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    Q{Number(item.line_total || 0).toFixed(2)}
                  </span>
                </div>
                {item.sent_at && (
                  <span className="inline-block mt-1 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    ✓ Enviado
                  </span>
                )}
              </m.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Totals */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>Q {Number(totals.subtotal || 0).toFixed(2)}</span>
          </div>
          {Number(totals.discountTotal || 0) > 0 && (
            <div className="flex justify-between text-red-500">
              <span>Descuento</span>
              <span>-Q {Number(totals.discountTotal || 0).toFixed(2)}</span>
            </div>
          )}
          {Number(totals.tipAmount || 0) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Propina</span>
              <span>Q {Number(totals.tipAmount || 0).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200">
            <span>Total</span>
            <span className="text-primary-600">Q {Number(totals.total || 0).toFixed(2)}</span>
          </div>
          {Number(totals.pending || 0) > 0 && (
            <div className="flex justify-between text-amber-600 font-medium">
              <span>Pendiente</span>
              <span>Q {Number(totals.pending || 0).toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </m.div>
  );
}

export default OrderItemsList;
