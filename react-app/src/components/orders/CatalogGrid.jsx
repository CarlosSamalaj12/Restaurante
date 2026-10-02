import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Store, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ProductIconBadge } from '../../utils/productIcons';

export function CatalogGrid({
  centers,
  selectedCenter,
  setSelectedCenter,
  categories,
  selectedCategory,
  setSelectedCategory,
  currentSeat,
  setCurrentSeat,
  guestCount,
  filteredProducts,
  handleAddItem,
  addingProductId,
  items = []
}) {
  const { currencySymbol = 'Q' } = useAuth() || {};

  // Mapa de cantidad acumulada por producto en la silla activa
  const seatQuantities = React.useMemo(() => {
    const map = {};
    for (const item of items) {
      if (Number(item.seat_no || 1) === Number(currentSeat)) {
        const pid = Number(item.product_id);
        map[pid] = (map[pid] || 0) + Number(item.qty || 1);
      }
    }
    return map;
  }, [items, currentSeat]);

  return (
    <div className="flex-1 p-3 lg:p-4 min-w-0">
      {/* Selector de Centro de Consumo */}
      {centers.length > 1 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Store className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Centro de consumo:</span>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {centers.map(center => {
              const isSelected = selectedCenter === center.id;
              return (
                <button
                  key={center.id}
                  onClick={() => setSelectedCenter(center.id)}
                  className={`
                    px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer
                    ${isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }
                  `}
                >
                  {center.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Categorías - Scroll horizontal */}
      <div className="flex gap-2 overflow-x-auto pb-2.5 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`
            px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer
            ${selectedCategory === null
              ? 'bg-gray-900 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          Todos
        </button>
        {categories.map(cat => {
          const isSelected = Number(selectedCategory) === Number(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`
                px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer
                ${isSelected
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Selector de Sillas */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide">
        {Array.from({ length: Math.max(guestCount || 4, 1) }, (_, i) => i + 1).map(seat => {
          const isSelected = currentSeat === seat;
          return (
            <button
              key={seat}
              onClick={() => setCurrentSeat(seat)}
              className={`
                px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer
                ${isSelected
                  ? 'bg-purple-600 text-white shadow-sm scale-102'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-gray-400'}`} />
              Silla {seat}
            </button>
          );
        })}
      </div>

      {/* Cuadrícula de Productos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredProducts.map((product) => {
          const currentQty = seatQuantities[Number(product.id)] || 0;
          const isAddingThis = addingProductId === product.id;

          return (
            <m.div
              key={product.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleAddItem(product)}
              className={`relative bg-white rounded-2xl p-4 border transition-all duration-150 cursor-pointer select-none group shadow-2xs hover:shadow-md ${
                currentQty > 0
                  ? 'border-emerald-300 bg-gradient-to-b from-emerald-50/20 to-white ring-1 ring-emerald-400/40'
                  : 'border-gray-200 hover:border-emerald-400'
              }`}
            >
              {/* Badge de cantidad activa en esta silla */}
              {currentQty > 0 && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-600 text-white shadow-md border-2 border-white animate-in zoom-in-50 duration-150">
                  {currentQty}x
                </span>
              )}

              <div className="flex items-center gap-2.5 pb-2 mb-2 border-b border-gray-100 min-h-[44px]">
                <ProductIconBadge
                  productName={product.name}
                  categoryName={product.category_name}
                  size="sm"
                />
                <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                  {product.name}
                </p>
              </div>

              <div className="flex items-center justify-between mt-auto">
                <span className="text-base font-black text-emerald-600">
                  {currencySymbol} {Number(product.base_price || 0).toFixed(0)}
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs ${
                  isAddingThis ? 'bg-emerald-600' : 'bg-emerald-500'
                }`}>
                  {isAddingThis ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Plus className="w-5 h-5 text-white" />
                  )}
                </div>
              </div>
            </m.div>
          );
        })}
      </div>
    </div>
  );
}

export default CatalogGrid;
