// react-app/src/components/public_menu/ProductCard.jsx
// Tarjeta moderna de producto adaptativa con soporte de imágenes transparentes, badges y calificación

import React from 'react';
import { m } from 'framer-motion';
import { Star, MessageSquare, Plus, Clock, Sparkles } from 'lucide-react';

export function ProductCard({ product, onSelect }) {
  const isCustomizable = product.modifier_groups && product.modifier_groups.length > 0;
  const rating = Number(product.rating_avg || 5.0).toFixed(1);

  return (
    <m.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(product)}
      className="group relative bg-white/5 hover:bg-white/[0.08] backdrop-blur-md border border-white/10 hover:border-white/20 rounded-3xl p-4 flex flex-col justify-between shadow-lg cursor-pointer transition-all duration-300"
    >
      <div>
        {/* Cabecera de imagen del platillo */}
        <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-slate-900/60 flex items-center justify-center mb-3.5 border border-white/5">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-36 h-36 object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]"
              loading="lazy"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
              🍽️
            </div>
          )}

          {/* Calificación Promedio en esquina inferior izquierda (Glassmorphism) */}
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-[11px] font-bold text-amber-300 shadow">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{rating}</span>
            <span className="text-slate-400 font-normal">({product.rating_count || 0})</span>
          </div>

          {/* Badge de Destacado si aplica */}
          {product.is_featured === 1 && (
            <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[var(--menu-primary)] text-white shadow-md">
              Chef
            </div>
          )}
        </div>

        {/* Textos del Platillo */}
        <h3 className="font-extrabold text-base text-white group-hover:text-[var(--menu-primary)] transition-colors leading-snug line-clamp-1">
          {product.name}
        </h3>

        <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
          {product.description || 'Deliciosa especialidad de la casa elaborada con ingredientes frescos seleccionados.'}
        </p>

        {/* Badges de Atributos Dietéticos */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {product.estimated_prep_min && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/5 text-slate-300 border border-white/5">
              <Clock className="w-2.5 h-2.5 text-emerald-400" /> ~{product.estimated_prep_min}m
            </span>
          )}
          {product.dietary_tags?.includes('vegano') && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              Vegano
            </span>
          )}
          {product.dietary_tags?.includes('sin_gluten') && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Sin Gluten
            </span>
          )}
        </div>
      </div>

      {/* Barra Inferior con Precio y Botón Acción */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Precio</span>
          <span className="text-lg font-black text-white">Q{Number(product.base_price || 0).toFixed(2)}</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(product);
          }}
          className="px-3.5 py-2 rounded-xl bg-[var(--menu-primary)] hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[var(--menu-primary)]/25 active:scale-95 transition"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>{isCustomizable ? 'Personalizar' : 'Añadir'}</span>
        </button>
      </div>
    </m.div>
  );
}
