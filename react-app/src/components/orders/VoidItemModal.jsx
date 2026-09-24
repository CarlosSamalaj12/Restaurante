import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';

export function VoidItemModal({
  isOpen,
  itemToVoid,
  voidPin,
  setVoidPin,
  voidReason,
  setVoidReason,
  onConfirm,
  onClose
}) {
  if (!isOpen || !itemToVoid) return null;

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <m.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
            ¿Anular producto?
          </h3>
          <p className="text-sm text-gray-500 text-center mb-4">
            Estás por eliminar <strong>{itemToVoid.product_name}</strong> de la orden
          </p>
          
          {/* Warning for sent items */}
          {itemToVoid.sent_at && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <p className="text-sm text-amber-700 font-medium flex items-center gap-2">
                ⚠️ Este producto ya fue enviado a cocina
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Se requiere PIN de autorización
              </p>
            </div>
          )}
          
          {/* PIN Input for sent items */}
          {itemToVoid.sent_at && (
            <div className="mb-4">
              <label className="text-xs text-gray-500 font-medium">PIN de Autorización *</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={voidPin}
                onChange={(e) => setVoidPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Ingresa tu PIN"
                maxLength={12}
                className="w-full mt-1 p-3 border border-gray-200 rounded-xl text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
              />
            </div>
          )}
          
          {/* Reason Input */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 font-medium">Razón (opcional)</label>
            <input
              type="text"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Ej: Error en pedido, cliente canceló..."
              className="w-full mt-1 p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
          
          <div className="flex gap-3">
            <m.button
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm"
            >
              Cancelar
            </m.button>
            <m.button
              whileTap={{ scale: 0.98 }}
              onClick={onConfirm}
              disabled={itemToVoid.sent_at && !voidPin.trim()}
              className={`flex-1 py-3 rounded-xl font-medium text-sm ${
                itemToVoid.sent_at && !voidPin.trim()
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-red-600 text-white'
              }`}
            >
              Anular
            </m.button>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}

export default VoidItemModal;
