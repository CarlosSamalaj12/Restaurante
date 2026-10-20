// react-app/src/components/public_menu/ProductGrid.jsx
// Rejilla de platillos con renderizado incremental progresivo y soporte de lazy loading

import React from 'react';
import { Search, Loader2 } from 'lucide-react';
import { ProductCard } from './ProductCard';

export function ProductGrid({
  products = [],
  displayedProducts = [],
  onSelectProduct,
  loadMoreRef,
  hasMore = false,
  searchQuery = '',
  onClearSearch,
}) {
  if (products.length === 0) {
    return (
      <div className="text-center py-20 px-4">
        <div className="w-16 h-16 rounded-3xl bg-slate-800/60 border border-slate-700/60 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 opacity-60" />
        </div>
        <h3 className="text-base font-black text-white mb-1">No encontramos platillos</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4 leading-relaxed">
          {searchQuery
            ? `No hay resultados para "${searchQuery}". Intenta con otro término.`
            : 'No hay platillos disponibles en esta categoría.'}
        </p>
        {searchQuery && (
          <button
            onClick={onClearSearch}
            className="px-4 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-600/30 transition"
          >
            Limpiar búsqueda
          </button>
        )}
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {displayedProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onSelect={onSelectProduct}
          />
        ))}
      </div>

      {/* Sentinel para carga incremental por scroll */}
      {hasMore && (
        <div ref={loadMoreRef} className="py-8 flex justify-center items-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-slate-800 text-slate-400 text-xs font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            <span>Cargando más especialidades...</span>
          </div>
        </div>
      )}
    </main>
  );
}
