import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Store, Plus } from 'lucide-react';

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
  addingItem
}) {
  return (
    <div className="flex-1 p-3 lg:p-4 min-w-0">
      {/* Center Selector */}
      {centers.length > 1 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Store className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-500">Centro:</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {centers.map(center => (
              <m.button
                key={center.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCenter(center.id)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all
                  ${selectedCenter === center.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }
                `}
              >
                {center.name}
              </m.button>
            ))}
          </div>
        </div>
      )}

      {/* Categories - Horizontal scroll */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide">
        <m.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setSelectedCategory(null)}
          className={`
            px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all
            ${selectedCategory === null
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600'
            }
          `}
        >
          Todos
        </m.button>
        {categories.map(cat => (
          <m.button
            key={cat.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedCategory(cat.id)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all
              ${selectedCategory === cat.id
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600'
              }
            `}
          >
            {cat.name}
          </m.button>
        ))}
      </div>

      {/* Seat selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
        {Array.from({ length: Math.max(guestCount || 4, 1) }, (_, i) => i + 1).map(seat => (
          <m.button
            key={seat}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentSeat(seat)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5
              ${currentSeat === seat
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${currentSeat === seat ? 'bg-white' : 'bg-gray-400'}`} />
            Silla {seat}
          </m.button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product) => {
            return (
              <m.button
                key={product.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleAddItem(product)}
                disabled={addingItem}
                className="relative bg-white rounded-2xl p-4 border border-gray-200 text-left disabled:opacity-50 hover:border-emerald-400 hover:shadow-lg transition-all duration-200"
              >
                <div className="pb-2 mb-2 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900 leading-snug">
                    {product.name}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-emerald-600">
                    Q{Number(product.base_price || 0).toFixed(0)}
                  </span>
                  <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center shadow-sm">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                </div>
              </m.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default CatalogGrid;
