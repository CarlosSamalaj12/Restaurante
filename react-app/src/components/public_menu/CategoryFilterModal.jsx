// react-app/src/components/public_menu/CategoryFilterModal.jsx
// Modal Bottom Sheet estilo iOS con diseño Stitch MCP montado vía React Portal en document.body con soporte bilingüe

import React, { useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  UtensilsCrossed,
  Utensils,
  Coffee,
  Wine,
  Beer,
  Pizza,
  Soup,
  Flame,
  Salad,
  Fish,
  Sandwich,
  CakeSlice,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { t, getLocalizedName } from '../../utils/menuTranslations';

// Selector dinámico de íconos según el nombre de la categoría
function getCategoryIcon(name = '') {
  const n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (
    n.includes('bebida') ||
    n.includes('refresco') ||
    n.includes('trago') ||
    n.includes('jugo') ||
    n.includes('coctel') ||
    n.includes('licor') ||
    n.includes('vino') ||
    n.includes('beverage') ||
    n.includes('drink')
  ) {
    return Wine;
  }
  if (n.includes('cerveza') || n.includes('beer')) {
    return Beer;
  }
  if (n.includes('cafe') || n.includes('cafeteria') || n.includes('coffee') || n.includes('tea')) {
    return Coffee;
  }
  if (
    n.includes('postre') ||
    n.includes('dulce') ||
    n.includes('pastel') ||
    n.includes('helado') ||
    n.includes('reposteria') ||
    n.includes('dessert') ||
    n.includes('cake')
  ) {
    return CakeSlice;
  }
  if (n.includes('pizza')) {
    return Pizza;
  }
  if (
    n.includes('hamburguesa') ||
    n.includes('burger') ||
    n.includes('sandwich') ||
    n.includes('torta') ||
    n.includes('snack')
  ) {
    return Sandwich;
  }
  if (
    n.includes('ensalada') ||
    n.includes('salad') ||
    n.includes('vegetal') ||
    n.includes('vegano') ||
    n.includes('verde') ||
    n.includes('vegan')
  ) {
    return Salad;
  }
  if (
    n.includes('carne') ||
    n.includes('corte') ||
    n.includes('asado') ||
    n.includes('parrilla') ||
    n.includes('steak') ||
    n.includes('meat')
  ) {
    return Flame;
  }
  if (
    n.includes('pescado') ||
    n.includes('marisco') ||
    n.includes('mar') ||
    n.includes('ceviche') ||
    n.includes('camaron') ||
    n.includes('seafood') ||
    n.includes('fish')
  ) {
    return Fish;
  }
  if (
    n.includes('pasta') ||
    n.includes('arroz') ||
    n.includes('sopa') ||
    n.includes('caldo') ||
    n.includes('ramen') ||
    n.includes('soup') ||
    n.includes('rice')
  ) {
    return Soup;
  }
  if (n.includes('especial') || n.includes('chef') || n.includes('destacado') || n.includes('special')) {
    return Sparkles;
  }
  return Utensils;
}

export function CategoryFilterModal({
  isOpen,
  onClose,
  categories = [],
  selectedCategory = 'all',
  onSelectCategory,
  products = [],
  totalProductsCount = 0,
  lang = 'es',
}) {
  // Prevenir scroll de la página de fondo mientras el modal está abierto
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Conteo de platillos por categoría
  const categoryCounts = useMemo(() => {
    const counts = {};
    (products || []).forEach((p) => {
      const catId = p.category_id;
      if (catId) {
        counts[catId] = (counts[catId] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  // Total de platillos en la selección actual
  const currentSelectionCount = useMemo(() => {
    if (selectedCategory === 'all') {
      return totalProductsCount || products.length;
    }
    return categoryCounts[selectedCategory] || 0;
  }, [selectedCategory, totalProductsCount, products, categoryCounts]);

  const handleSelect = (catId) => {
    onSelectCategory(catId);
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
          {/* Fondo difuminado iOS de pantalla completa (cubre cabeceras y todo el viewport) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999]"
            aria-hidden="true"
          />

          {/* iOS Elevated Bottom Sheet Modal (diseño Stitch Nocturne Dining) */}
          <motion.div
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 340 }}
            className="relative w-full sm:max-w-md max-h-[85vh] bg-slate-900/98 sm:bg-slate-900/95 border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-3xl shadow-[0_-12px_44px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden z-[10000] backdrop-blur-2xl mb-0 sm:mb-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-category-title"
          >
            {/* Tirador táctil iOS para arrastrar en móviles */}
            <div className="pt-3 pb-1 flex justify-center shrink-0 sm:hidden">
              <div className="w-12 h-1.5 rounded-full bg-slate-700/80" />
            </div>

            {/* Cabecera del modal (siempre visible en la parte superior) */}
            <header className="px-5 pt-3 pb-3 flex items-center justify-between border-b border-white/[0.08] shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    id="modal-category-title"
                    className="text-lg sm:text-xl font-bold text-white tracking-tight"
                  >
                    {t(lang, 'menuCategories')}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10 text-[11px] font-semibold">
                    {t(lang, 'categoryCount', { count: categories.length })}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t(lang, 'selectCategoryHint')}
                </p>
              </div>

              {/* Botón de cerrar estilo iOS */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar modal"
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition active:scale-95 cursor-pointer shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Rejilla táctil de categorías con scroll interno fluido */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pb-2">
                {/* Opción 1: Todo el Menú */}
                <button
                  type="button"
                  onClick={() => handleSelect('all')}
                  className={`p-3.5 rounded-2xl text-left flex flex-col justify-between h-[100px] cursor-pointer active:scale-[0.98] transition-all duration-150 ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600/15 border-2 border-blue-500 shadow-md shadow-blue-500/20'
                      : 'bg-slate-800/60 hover:bg-slate-800/90 border border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        selectedCategory === 'all'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                          : 'bg-slate-700/60 text-slate-300'
                      }`}
                    >
                      <UtensilsCrossed className="w-4 h-4" />
                    </div>

                    {selectedCategory === 'all' && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">
                      {t(lang, 'allMenu')}
                    </p>
                    <span className="text-[11px] font-semibold text-blue-400">
                      {t(lang, 'dishesCount', { count: totalProductsCount || products.length })}
                    </span>
                  </div>
                </button>

                {/* Lista de Categorías de la Base de Datos */}
                {categories.map((cat) => {
                  const localizedName = getLocalizedName(cat, lang);
                  const IconComponent = getCategoryIcon(cat.name || localizedName);
                  const isSelected = Number(selectedCategory) === Number(cat.id);
                  const count = categoryCounts[cat.id] || 0;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelect(cat.id)}
                      className={`p-3.5 rounded-2xl text-left flex flex-col justify-between h-[100px] cursor-pointer active:scale-[0.98] transition-all duration-150 ${
                        isSelected
                          ? 'bg-blue-600/15 border-2 border-blue-500 shadow-md shadow-blue-500/20'
                          : 'bg-slate-800/60 hover:bg-slate-800/90 border border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                              : 'bg-slate-700/60 text-slate-300'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>

                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <div>
                        <p
                          className="text-sm font-bold text-white leading-tight truncate"
                          title={localizedName}
                        >
                          {localizedName}
                        </p>
                        <span
                          className={`text-[11px] font-medium ${
                            isSelected ? 'text-blue-400 font-semibold' : 'text-slate-400'
                          }`}
                        >
                          {count === 1
                            ? t(lang, 'dishCountSingle')
                            : t(lang, 'dishesCount', { count })}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Barra Inferior Táctica iOS con Home Indicator */}
            <footer className="px-5 pt-3 pb-6 sm:pb-5 bg-slate-950/80 border-t border-white/[0.08] flex flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-[0.98] transition cursor-pointer"
              >
                <span>
                  {currentSelectionCount === 1
                    ? t(lang, 'viewDishSingle')
                    : t(lang, 'viewDishes', { count: currentSelectionCount })}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {selectedCategory !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectCategory('all');
                    onClose();
                  }}
                  className="w-full py-1 text-center text-xs font-semibold text-slate-400 hover:text-white transition active:scale-95 cursor-pointer"
                >
                  {t(lang, 'resetToAll')}
                </button>
              )}

              {/* Indicador Home iOS para móviles */}
              <div className="w-28 h-1 bg-slate-700/60 rounded-full mx-auto mt-1 sm:hidden" />
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
