// react-app/src/components/public_menu/ProductCard.jsx
// Tarjeta moderna de producto con diseño cinematográfico Midnight Glow (Imagen 1)

import React, { useState } from 'react';
import { m } from 'framer-motion';
import { Plus, Clock } from 'lucide-react';

const getCategoryFallbackIcon = (name = '', description = '') => {
  const text = `${name} ${description}`.toLowerCase();
  if (/café|cafe|latte|capuchino|espresso|té|te|infusion/.test(text)) return '☕';
  if (/hamburguesa|burger|sandwich|torta/.test(text)) return '🍔';
  if (/pizza|calzone/.test(text)) return '🍕';
  if (/pasta|espagueti|fettuccine|lasaña/.test(text)) return '🍝';
  if (/cerveza|bebida|limonada|jugo|refresco|gaseosa|cocktail|trago/.test(text)) return '🍹';
  if (/postre|torta|helado|pastel|brownie|crepa/.test(text)) return '🍰';
  if (/taco|burrito|quesadilla|fajita/.test(text)) return '🌮';
  if (/carne|asado|corte|parrilla|steak|pollo|alitas/.test(text)) return '🥩';
  return '🍽️';
};

export function ProductCard({ product, onSelect }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isCustomizable = product.modifier_groups && product.modifier_groups.length > 0;
  const fallbackIcon = getCategoryFallbackIcon(product.name, product.description);

  return (
    <m.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(product)}
      className="group relative bg-[#111726]/90 hover:bg-[#151D30] backdrop-blur-md border border-slate-800/80 hover:border-blue-500/50 rounded-3xl p-4 flex flex-col justify-between shadow-xl hover:shadow-2xl hover:shadow-blue-950/40 cursor-pointer transition-all duration-300"
    >
      <div>
        {/* Cabecera de imagen del platillo */}
        <div className="relative w-full h-44 sm:h-48 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center mb-3.5 border border-slate-800/60">
          {product.image_url && !imageError ? (
            <>
              {/* Skeleton de carga con shimmer animado */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-slate-900/90 animate-pulse flex items-center justify-center z-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-600 text-lg">
                    {fallbackIcon}
                  </div>
                </div>
              )}

              <img
                src={product.image_url}
                alt={product.name}
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
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#121929] via-[#0E1524] to-[#0A0F1A]">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-3xl shadow-inner shadow-blue-500/10">
                {fallbackIcon}
              </div>
              <span className="text-[10px] text-slate-500 font-semibold mt-2 uppercase tracking-wider">
                Especialidad de la casa
              </span>
            </div>
          )}

          {/* Sombra de degradado suave sobre la imagen */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

          {/* Badge Superior Izquierdo: Especialidad / Recomendación */}
          {product.is_featured === 1 ? (
            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 border border-white/20">
              RECOMENDACIÓN DEL CHEF
            </div>
          ) : (product.dietary_tags?.includes('vegano') || product.badge_text) ? (
            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-white/20">
              {product.badge_text || 'ESPECIALIDAD'}
            </div>
          ) : null}

          {/* Badge Superior Derecho: Tiempo Estimado de Preparación */}
          {product.estimated_prep_min && (
            <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-slate-300 border border-white/10 flex items-center gap-1 shadow-md">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>{product.estimated_prep_min} min</span>
            </div>
          )}
        </div>

        {/* Textos del Platillo */}
        <h3 className="font-black text-base sm:text-lg text-white group-hover:text-blue-400 transition-colors leading-snug line-clamp-1">
          {product.name}
        </h3>

        <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
          {product.description || 'Deliciosa especialidad de la casa elaborada con ingredientes frescos seleccionados.'}
        </p>

        {/* Badges dietéticos si aplican */}
        {(product.dietary_tags?.includes('sin_gluten') || product.dietary_tags?.includes('vegano')) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {product.dietary_tags?.includes('sin_gluten') && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Sin Gluten
              </span>
            )}
            {product.dietary_tags?.includes('vegano') && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Vegano
              </span>
            )}
          </div>
        )}
      </div>

      {/* Barra Inferior con Precio y Botones de Acción */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-bold text-amber-400">Q</span>
          <span className="text-lg sm:text-xl font-black text-white">
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
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 text-xs font-bold transition active:scale-95"
          >
            {isCustomizable ? 'Opciones' : 'Detalles'}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(product);
            }}
            className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/35 active:scale-90 transition"
            title="Añadir a la orden"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </m.div>
  );
}
