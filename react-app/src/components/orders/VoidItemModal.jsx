import React, { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, ShieldAlert, Plus, Minus, Tag } from 'lucide-react';

const COMMON_REASONS = [
  'Cliente canceló',
  'Error de digitación',
  'Demorado en cocina',
  'Cambio de platillo'
];

export function VoidItemModal({
  isOpen,
  itemToVoid,
  voidPin,
  setVoidPin,
  voidReason,
  setVoidReason,
  error,
  onConfirm,
  onClose
}) {
  const maxQty = Number(itemToVoid?.qty || 1);
  const [qtyToVoid, setQtyToVoid] = useState(maxQty);

  // Cada vez que se abre un ítem nuevo, restablecer la cantidad a anular al total disponible
  useEffect(() => {
    if (itemToVoid) {
      setQtyToVoid(Number(itemToVoid.qty || 1));
    }
  }, [itemToVoid]);

  if (!isOpen || !itemToVoid) return null;

  const isSent = Boolean(itemToVoid.sent_at);
  const isReasonValid = Boolean(voidReason?.trim());
  const isPinValid = isSent ? Boolean(voidPin?.trim()) : true;
  const canConfirm = isReasonValid && isPinValid;

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <m.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100 my-8"
        >
          {/* Header Icon */}
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-red-600">
            {isSent ? <ShieldAlert className="w-8 h-8" /> : <Trash2 className="w-8 h-8" />}
          </div>

          <h3 className="text-xl font-black text-gray-900 text-center tracking-tight">
            {isSent ? 'Reversión de Comanda' : 'Eliminar Producto'}
          </h3>
          <p className="text-xs text-gray-500 text-center mt-1 mb-4">
            Estás por revertir <strong>{itemToVoid.product_name}</strong> (Mesa {itemToVoid.table_code || 'actual'})
          </p>
          
          {/* Warning for sent items */}
          {isSent && (
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 mb-4">
              <p className="text-xs text-amber-800 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Este producto ya fue enviado a preparación</span>
              </p>
              <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                Se enviará un ticket de reversión a la estación de cocina y se registrará en auditoría con el PIN de autorización.
              </p>
            </div>
          )}

          {/* Selector de Cantidad (si hay más de 1 unidad) */}
          {maxQty > 1 && (
            <div className="mb-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-700">
                  Cantidad a anular:
                </label>
                <span className="text-[11px] text-gray-500 font-semibold">
                  (de {maxQty} disponibles)
                </span>
              </div>

              <div className="flex items-center justify-center gap-3 py-1">
                <m.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setQtyToVoid(prev => Math.max(1, prev - 1))}
                  className="w-10 h-10 rounded-xl bg-white border border-gray-200 hover:border-red-400 hover:text-red-600 flex items-center justify-center font-bold text-gray-700 shadow-2xs transition-all cursor-pointer"
                  disabled={qtyToVoid <= 1}
                >
                  <Minus className="w-4 h-4" />
                </m.button>
                <div className="w-16 text-center">
                  <span className="text-2xl font-black text-gray-900">{qtyToVoid}</span>
                  <p className="text-[10px] text-gray-400 font-medium">unidad(es)</p>
                </div>
                <m.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setQtyToVoid(prev => Math.min(maxQty, prev + 1))}
                  className="w-10 h-10 rounded-xl bg-white border border-gray-200 hover:border-emerald-400 hover:text-emerald-600 flex items-center justify-center font-bold text-gray-700 shadow-2xs transition-all cursor-pointer"
                  disabled={qtyToVoid >= maxQty}
                >
                  <Plus className="w-4 h-4" />
                </m.button>
              </div>

              <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setQtyToVoid(1)}
                  className={`flex-1 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    qtyToVoid === 1
                      ? 'bg-red-50 text-red-700 border-red-200 shadow-2xs'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Solo 1 unidad
                </button>
                <button
                  type="button"
                  onClick={() => setQtyToVoid(maxQty)}
                  className={`flex-1 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    qtyToVoid === maxQty
                      ? 'bg-red-50 text-red-700 border-red-200 shadow-2xs'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Todas ({maxQty})
                </button>
              </div>

              {qtyToVoid < maxQty && (
                <p className="text-[11px] text-slate-500 font-medium text-center mt-2">
                  ℹ️ Quedarán <strong>{maxQty - qtyToVoid}</strong> unidad(es) activas en la mesa.
                </p>
              )}
            </div>
          )}

          {/* Motivo de Anulación Obligatorio */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-gray-400" />
                Motivo / Comentario de Anulación *
              </label>
              {!isReasonValid && (
                <span className="text-[10px] text-red-500 font-bold">Obligatorio</span>
              )}
            </div>

            {/* Chips de motivos comunes */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_REASONS.map((reason) => (
                <button
                  type="button"
                  key={reason}
                  onClick={() => setVoidReason(reason)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                    voidReason === reason
                      ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Escribe el motivo detallado de anulación..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
            />
          </div>

          {/* Error Banner si la autorización falló */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-4 text-xs text-red-700 font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* PIN Input para ítems enviados */}
          {isSent && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-800">
                  PIN de Autorización (Cajero / Gerente / Admin) *
                </label>
                {!voidPin?.trim() && (
                  <span className="text-[10px] text-red-500 font-bold">PIN requerido</span>
                )}
              </div>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={voidPin}
                onChange={(e) => setVoidPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                maxLength={6}
                autoFocus
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-lg text-center tracking-[0.4em] font-black focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-slate-50"
              />
              <p className="text-[11px] text-gray-500 mt-1 text-center font-medium">
                Ingresa el PIN de 6 dígitos de un Cajero, Administrador o Gerente
              </p>
            </div>
          )}
          
          <div className="flex gap-3 pt-2">
            <m.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-sm transition-colors cursor-pointer"
            >
              Cancelar
            </m.button>
            <m.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => onConfirm(qtyToVoid)}
              disabled={!canConfirm}
              className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                canConfirm
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/25'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {qtyToVoid > 1 ? `Anular ${qtyToVoid} unidades` : 'Confirmar Anulación'}
              </span>
            </m.button>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}

export default VoidItemModal;
