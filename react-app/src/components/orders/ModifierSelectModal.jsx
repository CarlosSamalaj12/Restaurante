import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';

export function ModifierSelectModal({
  isOpen,
  selectedProduct,
  selectedModifiers,
  handleModifierToggle,
  itemNotes,
  setItemNotes,
  handleConfirmModifiers,
  addingItem,
  onClose
}) {
  if (!isOpen || !selectedProduct) return null;

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <m.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[80vh] overflow-hidden"
        >
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          <div className="px-5 pb-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-lg">{selectedProduct.name}</h2>
            <p className="text-sm text-gray-500">Selecciona las opciones</p>
          </div>

          <div className="p-5 space-y-5 max-h-[50vh] overflow-y-auto">
            {selectedProduct.modifiers?.map(modifier => (
              <div key={modifier.groupId}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{modifier.name}</h3>
                  <span className="text-xs text-gray-500">
                    {modifier.minSelect > 0 && `(Mín: ${modifier.minSelect})`}
                    {modifier.maxSelect > 0 && ` (Máx: ${modifier.maxSelect})`}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {modifier.options?.map(option => {
                    const isSelected = (selectedModifiers[modifier.groupId] || []).includes(option.id);
                    return (
                      <m.button
                        key={option.id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleModifierToggle(modifier.groupId, option.id)}
                        className={`
                          p-3 rounded-xl border-2 text-left transition-all
                          ${isSelected
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                          }
                        `}
                      >
                        <p className={`text-sm font-medium ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>
                          {option.name}
                        </p>
                        {option.price_delta != 0 && (
                          <p className={`text-xs mt-0.5 ${isSelected ? 'text-primary-600' : 'text-gray-500'}`}>
                            {option.price_delta > 0 ? '+' : ''}Q{Number(option.price_delta).toFixed(2)}
                          </p>
                        )}
                      </m.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-3 border-t border-gray-100 space-y-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Observación (opcional)</label>
              <textarea
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder="Ej: Sin cebolla, término medio..."
                rows={2}
                className="w-full mt-1 p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <m.button
              whileTap={{ scale: 0.98 }}
              onClick={handleConfirmModifiers}
              disabled={addingItem}
              className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {addingItem ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Agregar a la orden
                </>
              )}
            </m.button>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}

export default ModifierSelectModal;
