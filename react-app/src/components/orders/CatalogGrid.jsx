import React, { useState, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Store, Plus, Loader2, Search, X, Check, Users, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ProductIconBadge } from '../../utils/productIcons';

export function CatalogGrid({
  centers = [],
  selectedCenter,
  setSelectedCenter,
  categories = [],
  selectedCategory,
  setSelectedCategory,
  currentSeat = 1,
  setCurrentSeat,
  guestCount = 4,
  filteredProducts = [],
  handleAddItem,
  addingProductId,
  items = []
}) {
  const { currencySymbol = 'Q' } = useAuth() || {};
  const [searchQuery, setSearchQuery] = useState('');

  // Cantidad de productos acumulados por silla activa
  const seatQuantities = useMemo(() => {
    const map = {};
    for (const item of items) {
      if (Number(item.seat_no || 1) === Number(currentSeat)) {
        const pid = Number(item.product_id);
        map[pid] = (map[pid] || 0) + Number(item.qty || 1);
      }
    }
    return map;
  }, [items, currentSeat]);

  // Total de items por cada comensal / silla
  const seatCounts = useMemo(() => {
    const map = {};
    for (const item of items) {
      const s = Number(item.seat_no || 1);
      map[s] = (map[s] || 0) + Number(item.qty || 1);
    }
    return map;
  }, [items]);

  // Filtrado reactivo por texto de búsqueda
  const displayedProducts = useMemo(() => {
    let list = filteredProducts || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.category_name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [filteredProducts, searchQuery]);

  return (
    <div className="flex-1 p-2.5 sm:p-4 min-w-0 w-full pb-28 lg:pb-6">
      {/* 1. Barra de Búsqueda Rápida Táctil */}
      <div className="relative mb-2.5 sm:mb-3">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar platillo, bebida o código..."
          className="w-full pl-9 pr-8 py-2.5 sm:py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-2xs transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. Selector de Centro de Consumo (si hay varios) */}
      {centers.length > 1 && (
        <div className="mb-2.5 sm:mb-3">
          <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            <Store className="w-3.5 h-3.5" />
            <span>Centro de Consumo</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar flex-nowrap">
            {centers.map(center => {
              const isSelected = selectedCenter === center.id;
              return (
                <button
                  key={center.id}
                  onClick={() => setSelectedCenter(center.id)}
                  className={`
                    px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0
                    ${isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
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

      {/* 3. Selector Rápido de Sillas (Comensales) */}
      <div className="mb-3 bg-slate-50/80 p-2 sm:p-2.5 rounded-2xl border border-slate-200/60">
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Users className="w-3.5 h-3.5 text-purple-600" />
            <span>Asignando a:</span>
            <span className="text-purple-700 font-extrabold bg-purple-100 px-2 py-0.5 rounded-md">
              Silla {currentSeat}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Toca para cambiar comensal</span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none no-scrollbar flex-nowrap">
          {Array.from({ length: Math.max(guestCount || 4, 1) }, (_, i) => i + 1).map(seat => {
            const isSelected = currentSeat === seat;
            const count = seatCounts[seat] || 0;
            return (
              <button
                key={seat}
                onClick={() => setCurrentSeat(seat)}
                className={`
                  px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0
                  ${isSelected
                    ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-500/20 scale-[1.02]'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-gray-400'}`} />
                <span>Silla {seat}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Categorías Horizontales con Scroll Táctil Suave */}
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2.5 scrollbar-none no-scrollbar flex-nowrap mb-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`
            px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0
            ${selectedCategory === null
              ? 'bg-gray-900 text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
            }
          `}
        >
          Todos ({filteredProducts.length})
        </button>
        {categories.map(cat => {
          const isSelected = Number(selectedCategory) === Number(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`
                px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0
                ${isSelected
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* 5. Cuadrícula Táctil de Productos (2 Columnas en Móvil) */}
      {displayedProducts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-6">
          <UtensilsCrossed className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-600">No se encontraron productos</p>
          <p className="text-xs text-gray-400 mt-1">Prueba con otra palabra clave o selecciona otra categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {displayedProducts.map((product) => {
            const currentQty = seatQuantities[Number(product.id)] || 0;
            const isAddingThis = addingProductId === product.id;
            const hasModifiers = Array.isArray(product.modifiers) && product.modifiers.length > 0;

            return (
              <m.div
                key={product.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleAddItem(product)}
                className={`relative bg-white rounded-2xl p-3 sm:p-3.5 border transition-all duration-150 cursor-pointer select-none group shadow-2xs hover:shadow-md flex flex-col justify-between ${
                  currentQty > 0
                    ? 'border-emerald-300 bg-gradient-to-b from-emerald-50/25 to-white ring-1 ring-emerald-400/40'
                    : 'border-gray-200 hover:border-emerald-400'
                }`}
              >
                {/* Badge de cantidad activa en esta silla */}
                {currentQty > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black bg-emerald-600 text-white shadow-md border-2 border-white animate-in zoom-in-50 duration-150 z-10">
                    {currentQty}x
                  </span>
                )}

                <div>
                  <div className="flex items-start gap-2 pb-2 mb-1.5 border-b border-gray-100 min-h-[42px]">
                    <ProductIconBadge
                      productName={product.name}
                      categoryName={product.category_name}
                      size="sm"
                      className="shrink-0 mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                        {product.name}
                      </p>
                      {hasModifiers && (
                        <span className="inline-block mt-0.5 text-[9px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100/80">
                          Opciones
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-50">
                  <div className="min-w-0 pr-1">
                    <span className="text-xs sm:text-sm font-black text-emerald-600 block truncate">
                      {currencySymbol} {Number(product.base_price || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs shrink-0 ${
                    isAddingThis ? 'bg-emerald-600' : 'bg-emerald-500'
                  }`}>
                    {isAddingThis ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    )}
                  </div>
                </div>
              </m.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CatalogGrid;
