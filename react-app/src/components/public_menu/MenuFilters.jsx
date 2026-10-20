// react-app/src/components/public_menu/MenuFilters.jsx
// Buscador reactivo y barra de desplazamiento horizontal de categorías

import React from 'react';
import { Search, X, UtensilsCrossed, SlidersHorizontal } from 'lucide-react';

export function MenuFilters({
  searchQuery,
  onSearchChange,
  categories = [],
  selectedCategory,
  onSelectCategory,
  totalProductsCount = 0,
}) {
  return (
    <div className="sticky top-[61px] z-20 backdrop-blur-xl bg-[#0B101B]/95 border-b border-slate-800/60 py-2.5 px-4 space-y-2.5 shadow-lg shadow-black/20">
      {/* Buscador */}
      <div className="max-w-7xl mx-auto flex items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar platillos o bebidas..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-[#131B2E]/90 border border-slate-800/90 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-inner transition"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          className="p-2.5 rounded-2xl bg-[#131B2E]/90 border border-slate-800/90 text-slate-400 hover:text-white hover:border-slate-700 transition active:scale-95 shadow-inner"
          title="Filtros"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Selector Horizontal de Categorías */}
      <nav className="max-w-7xl mx-auto flex gap-2 overflow-x-auto no-scrollbar py-0.5">
        <button
          onClick={() => onSelectCategory('all')}
          className={`menu-category-pill ${selectedCategory === 'all' ? 'active' : 'inactive'}`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          <span>Todo ({totalProductsCount})</span>
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`menu-category-pill ${
              Number(selectedCategory) === Number(cat.id) ? 'active' : 'inactive'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </nav>
    </div>
  );
}
