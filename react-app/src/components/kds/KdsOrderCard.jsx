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
  X,
  QrCode
} from 'lucide-react';

function getModifierStyle(mod = '') {
  const m = String(mod).toLowerCase();
  if (m.includes('plancha') || m.includes('termino') || m.includes('término') || m.includes('coccion') || m.includes('cocción') || m.includes('bien')) {
    return 'bg-amber-100 text-amber-900 border-amber-300';
  }
  if (m.includes('sin') || m.includes('alergia') || m.includes('chirmol') || m.includes('no ') || m.includes('chile')) {
    return 'bg-rose-100 text-rose-800 border-rose-200';
  }
  if (m.includes('extra') || m.includes('doble') || m.includes('adicional')) {
    return 'bg-blue-100 text-blue-900 border-blue-200';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export function KdsOrderCard({
  order,
  style,
  minutesAgo,
  timeFormatted,
  timeColor,
  completingItems,
  handleMarkDone,
  handleMarkAllDone
}) {
  const activeItems = order.items.filter(i => !i.voided && !i.completed);
  const voidedItems = order.items.filter(i => i.voided);

  const isQrOrder = order.orderSource === 'qr_guest' || String(order.waiterName || '').toLowerCase().includes('auto-comanda');

  return (
    <m.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`${style.bg} border-2 ${style.border} rounded-2xl overflow-hidden shadow-md flex flex-col justify-between`}
    >
      <div>
        {/* Header de Estación y Temporizador */}
        <div className={`${style.badge} px-4 py-2.5 flex items-center justify-between text-white`}>
          <div className="flex items-center gap-2">
            {order.centerName === 'Cocina' ? (
              <Utensils className="w-4 h-4" />
            ) : order.centerName === 'Bar' ? (
              <Coffee className="w-4 h-4" />
            ) : (
              <ChefHat className="w-4 h-4" />
            )}
            <span className="font-extrabold text-sm tracking-wide">{order.centerName}</span>
          </div>

          <div className={`${timeColor.light} px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs`}>
            <Clock className={`w-3.5 h-3.5 ${timeColor.text}`} />
            <span className={`text-xs sm:text-sm font-black ${timeColor.text}`}>
              {timeFormatted || `${minutesAgo} min`}
            </span>
          </div>
        </div>

        {/* Sub-header: Mesa, Ticket y Mesero */}
        <div className="px-4 py-3 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                  Mesa {order.tableCode}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-semibold font-mono">
                #{order.checkNumber}
              </p>
            </div>

            {order.waiterName && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                  isQrOrder
                    ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-2xs'
                    : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}
              >
                {isQrOrder ? (
                  <QrCode className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                ) : (
                  <User className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                )}
                <span className="truncate max-w-[150px] sm:max-w-[180px]">
                  {isQrOrder ? 'CLIENTE QR (SIN MESERO)' : order.waiterName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Lista de Platillos / Items */}
        <div className="p-3 space-y-2 max-h-[360px] sm:max-h-[300px] overflow-y-auto">
          {activeItems.map((item) => (
            <m.div
              key={item.itemId}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleMarkDone(item.itemId)}
              className={`bg-white rounded-xl p-3 border-2 transition-all cursor-pointer select-none ${
                completingItems.has(item.itemId)
                  ? 'border-emerald-400 bg-emerald-50/80'
                  : 'border-gray-100 hover:border-emerald-400 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black text-white flex-shrink-0 ${
                  item.seatNo === 1 ? 'bg-blue-500' :
                  item.seatNo === 2 ? 'bg-emerald-500' :
                  item.seatNo === 3 ? 'bg-amber-500' :
                  'bg-purple-500'
                }`}>
                  S{item.seatNo || 1}
                </span>

                <span className="text-base sm:text-lg font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 flex-shrink-0">
                  {item.qty}x
                </span>

                <span className="text-sm font-bold text-gray-900 flex-1 leading-snug">
                  {item.productName}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkDone(item.itemId);
                  }}
                  className={`w-9 h-9 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                    completingItems.has(item.itemId)
                      ? 'bg-emerald-100 border border-emerald-300'
                      : 'bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white shadow-2xs'
                  }`}
                  title="Marcar como listo"
                >
                  {completingItems.has(item.itemId) ? (
                    <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                  ) : (
                    <Check className="w-5 h-5 text-white stroke-[2.5]" />
                  )}
                </button>
              </div>

              {/* Modificadores con envoltura corregida (sin corte de palabras) */}
              {item.modifiers?.length > 0 && (
                <div className="mt-2 ml-9 flex flex-wrap gap-1.5">
                  {item.modifiers.map((mod, idx) => (
                    <span
                      key={idx}
                      className={`text-xs px-2 py-0.5 rounded-md font-semibold whitespace-nowrap inline-flex items-center border shadow-2xs ${getModifierStyle(mod)}`}
                    >
                      {mod}
                    </span>
                  ))}
                </div>
              )}

              {/* Notas de cocina */}
              {item.notes && (
                <p className="mt-1.5 text-xs text-amber-800 font-medium italic ml-9 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1.5">
                  <span>📝</span>
                  <span className="break-words">{item.notes}</span>
                </p>
              )}
            </m.div>
          ))}

          {/* Platillos Anulados */}
          {voidedItems.map((item) => (
            <div key={item.itemId} className="bg-red-50/70 rounded-xl p-3 border border-red-200 opacity-60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-200 flex items-center justify-center flex-shrink-0">
                  <X className="w-4 h-4 text-red-600" />
                </div>
                <span className="text-base font-bold text-red-400 line-through flex-shrink-0">{item.qty}x</span>
                <span className="text-sm font-semibold text-red-400 line-through flex-1">{item.productName}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botón Completar Todo */}
      {activeItems.length > 0 && (
        <div className="px-3 py-2.5 bg-white border-t border-gray-100">
          <button
            type="button"
            onClick={() => handleMarkAllDone(order.accountId)}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Completar Todo</span>
          </button>
        </div>
      )}
    </m.div>
  );
}

export default KdsOrderCard;
