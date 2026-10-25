// react-app/src/components/public_menu/ProductCard.jsx
// Tarjeta moderna de producto con diseño iOS Midnight Glass, degradados y soporte bilingüe

import React, { useState } from 'react';
import { m } from 'framer-motion';
import { Plus, Clock, Sparkles } from 'lucide-react';
import { t, getLocalizedName, getLocalizedDescription } from '../../utils/menuTranslations';

const getCategoryFallbackIcon = (name = '', description = '') => {
  const text = `${name} ${description}`.toLowerCase();
  if (/café|cafe|latte|capuchino|espresso|té|te|coffee|tea/.test(text)) return '☕';
  if (/hamburguesa|burger|sandwich|torta/.test(text)) return '🍔';
  if (/pizza|calzone/.test(text)) return '🍕';
  if (/pasta|espagueti|fettuccine|lasaña|spaghetti/.test(text)) return '🍝';
  if (/cerveza|bebida|limonada|jugo|refresco|gaseosa|cocktail|trago|beer|drink/.test(text)) return '🍹';
  if (/postre|torta|helado|pastel|brownie|crepa|dessert|cake/.test(text)) return '🍰';
  if (/taco|burrito|quesadilla|fajita/.test(text)) return '🌮';
  if (/carne|asado|corte|parrilla|steak|pollo|alitas|beef|chicken/.test(text)) return '🥩';
  return '🍽️';
};

export function ProductCard({ product, onSelect, lang = 'es' }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isCustomizable = product.modifier_groups && product.modifier_groups.length > 0;
  const displayName = getLocalizedName(product, lang);
  const displayDescription = getLocalizedDescription(product, lang);
  const fallbackIcon = getCategoryFallbackIcon(displayName, displayDescription);

  return (
    <m.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(product)}
      className="group relative bg-gradient-to-b from-slate-800/60 via-slate-850/80 to-slate-900/90 hover:from-slate-800/80 hover:to-slate-850/95 backdrop-blur-xl border border-white/[0.08] hover:border-blue-500/40 rounded-3xl p-3.5 sm:p-4 flex flex-col justify-between shadow-lg hover:shadow-2xl hover:shadow-blue-950/25 cursor-pointer transition-all duration-300 select-none"
    >
      <div>
        {/* Cabecera de imagen del platillo */}
        <div className="relative w-full h-44 sm:h-48 rounded-2xl overflow-hidden bg-slate-950/80 flex items-center justify-center mb-3 ring-1 ring-white/[0.08]">
          {product.image_url && !imageError ? (
            <>
              {/* Skeleton de carga con shimmer animado */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-slate-900/90 animate-pulse flex items-center justify-center z-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-white/5 flex items-center justify-center text-slate-500 text-lg">
                    {fallbackIcon}
                  </div>
                </div>
              )}

              <img
                src={product.image_url}
                alt={displayName}
                loading="lazy"
                decoding="async"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 relative z-10 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-3xl shadow-inner">
                {fallbackIcon}
              </div>
              <span className="text-[10px] text-slate-500 font-semibold mt-2 uppercase tracking-wider">
                {lang === 'en' ? 'Specialty' : 'Especialidad'}
              </span>
            </div>
          )}

          {/* Sombra de degradado suave sobre la imagen */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/25 pointer-events-none z-10" />

          {/* Badge Superior Izquierdo estilo iOS Capsule */}
          {product.is_featured === 1 ? (
            <div className="absolute top-2.5 left-2.5 z-20 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30 border border-white/20">
              {lang === 'en' ? "CHEF'S PICK" : 'CHEF RECOMIENDA'}
            </div>
          ) : (product.dietary_tags?.includes('vegano') || product.badge_text) ? (
            <div className="absolute top-2.5 left-2.5 z-20 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-blue-600/90 backdrop-blur-md text-white shadow-md shadow-blue-600/30 border border-white/20">
              {product.badge_text || (lang === 'en' ? 'SPECIALTY' : 'ESPECIALIDAD')}
            </div>
          ) : null}

          {/* Badge Superior Derecho: Tiempo Estimado de Preparación */}
          {product.estimated_prep_min && (
            <div className="absolute top-2.5 right-2.5 z-20 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900/80 backdrop-blur-md text-slate-200 border border-white/15 flex items-center gap-1 shadow-sm">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>{product.estimated_prep_min} {t(lang, 'minShort')}</span>
            </div>
          )}
        </div>

        {/* Textos del Platillo */}
        <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-blue-400 transition-colors leading-snug line-clamp-1 tracking-tight">
          {displayName}
        </h3>

        <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
          {displayDescription || (lang === 'en' ? 'Delicious house specialty prepared with selected fresh ingredients.' : 'Deliciosa especialidad de la casa elaborada con ingredientes frescos seleccionados.')}
        </p>

        {/* Badges dietéticos si aplican */}
        {(product.dietary_tags?.includes('sin_gluten') || product.dietary_tags?.includes('vegano')) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {product.dietary_tags?.includes('sin_gluten') && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {lang === 'en' ? 'Gluten-Free' : 'Sin Gluten'}
              </span>
            )}
            {product.dietary_tags?.includes('vegano') && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                {lang === 'en' ? 'Vegan' : 'Vegano'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Barra Inferior con Precio y Botones de Acción estilo iOS */}
      <div className="mt-3.5 pt-3 border-t border-white/[0.08] flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-bold text-amber-400">Q</span>
          <span className="text-lg sm:text-xl font-black text-white font-mono">
            {Number(product.base_price || 0).toFixed(2)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(product);
            }}
            className="px-3 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm"
          >
            {isCustomizable
              ? (lang === 'en' ? 'Options' : 'Opciones')
              : (lang === 'en' ? 'Details' : 'Detalles')}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(product);
            }}
            className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30 transition active:scale-90 cursor-pointer"
            title={t(lang, 'addToCart')}
            aria-label={t(lang, 'addToCart')}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </m.div>
  );
}
