import React from 'react';
import { m } from 'framer-motion';
import {
  Utensils,
  Coffee,
  ChefHat,
  Clock,
  User,
  Check,
  CheckCircle2,
  Loader2,
  X
} from 'lucide-react';

export function KdsOrderCard({
  order,
  style,
  minutesAgo,
  timeColor,
  completingItems,
  handleMarkDone,
  handleMarkAllDone
}) {
  const activeItems = order.items.filter(i => !i.voided && !i.completed);
  const voidedItems = order.items.filter(i => i.voided);

  return (
    <m.div
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
          <m.div
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
          </m.div>
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
    </m.div>
  );
}

export default KdsOrderCard;
