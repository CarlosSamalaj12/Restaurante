// react-app/src/components/public_menu/MenuFilters.jsx
// Buscador reactivo estilo iOS con modal de categorías por Stitch MCP y soporte bilingüe

import React, { useState } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { CategoryFilterModal } from './CategoryFilterModal';
import { t, getLocalizedName } from '../../utils/menuTranslations';

export function MenuFilters({
  searchQuery,
  onSearchChange,
  categories = [],
  selectedCategory = 'all',
  onSelectCategory,
  totalProductsCount = 0,
  products = [],
  lang = 'es',
}) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Nombre de la categoría seleccionada si hay un filtro activo
  const activeCategory =
    selectedCategory !== 'all'
      ? categories.find((c) => Number(c.id) === Number(selectedCategory))
      : null;

  return (
    <div className="sticky top-[61px] z-20 backdrop-blur-2xl bg-slate-950/85 border-b border-white/[0.08] py-2.5 px-4 shadow-lg shadow-black/30">
      {/* Buscador estilo iOS Search Bar con botón de filtro */}
      <div className="max-w-7xl mx-auto flex items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t(lang, 'searchPlaceholder')}
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-900/80 border border-white/10 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/40 shadow-inner transition"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
              aria-label={t(lang, 'clearSearch')}
              title={t(lang, 'clearSearch')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Botón táctil para desplegar categorías estilo iOS */}
        <button
          type="button"
          onClick={() => setIsFilterOpen(true)}
          className={`relative p-2.5 rounded-2xl border transition active:scale-95 shadow-inner cursor-pointer flex items-center justify-center ${
            selectedCategory !== 'all'
              ? 'bg-blue-600 border-blue-500 text-white shadow-blue-600/30 ring-2 ring-blue-500/30'
              : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white hover:border-slate-600'
          }`}
          title={t(lang, 'filterCategories')}
          aria-label={t(lang, 'filterCategories')}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {selectedCategory !== 'all' && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-slate-950" />
          )}
        </button>
      </div>

      {/* Indicador sutil de filtro activo si hay una categoría seleccionada */}
      {activeCategory && (
        <div className="max-w-7xl mx-auto flex items-center gap-2 pt-2">
          <span className="text-[11px] font-medium text-slate-400">{t(lang, 'filtering')}</span>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-semibold">
            <span>{getLocalizedName(activeCategory, lang)}</span>
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className="hover:text-white p-0.5 rounded-full hover:bg-blue-500/30 transition cursor-pointer"
              title={t(lang, 'clearFilter')}
              aria-label={t(lang, 'clearFilter')}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Desplegable de Categorías */}
      <CategoryFilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        products={products}
        totalProductsCount={totalProductsCount}
        lang={lang}
      />
    </div>
  );
}
