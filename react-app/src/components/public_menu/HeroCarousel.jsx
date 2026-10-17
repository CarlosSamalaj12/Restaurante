// react-app/src/components/public_menu/HeroCarousel.jsx
// Carrusel superior de promociones con autoplay suave, soporte táctil (swipe) e indicadores minimalistas

import React, { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';

export function HeroCarousel({ promotions = [], onSelectPromotion }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef(null);

  const startAutoplay = () => {
    stopAutoplay();
    if (promotions.length > 1) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % promotions.length);
      }, 5000);
    }
  };

  const stopAutoplay = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, [promotions.length]);

  if (!promotions || promotions.length === 0) return null;

  const currentPromo = promotions[currentIndex];

  return (
    <div
      className="relative px-4 pt-3 pb-2 max-w-7xl mx-auto overflow-hidden select-none"
      onMouseEnter={stopAutoplay}
      onMouseLeave={startAutoplay}
      onTouchStart={stopAutoplay}
      onTouchEnd={startAutoplay}
    >
      <div className="relative h-44 sm:h-52 md:h-64 rounded-3xl overflow-hidden shadow-xl border border-white/10 bg-slate-900">
        <AnimatePresence mode="wait">
          <m.div
            key={currentPromo.id || currentIndex}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            onClick={() => onSelectPromotion && onSelectPromotion(currentPromo)}
            className="absolute inset-0 cursor-pointer flex items-center justify-between p-6 sm:p-8"
          >
            {/* Fondo con degradado sutil */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent z-10" />

            {/* Imagen de fondo / producto */}
            {currentPromo.image_url && (
              <img
                src={currentPromo.image_url}
                alt={currentPromo.title}
                className="absolute right-0 top-0 h-full w-2/3 sm:w-1/2 object-cover object-center z-0"
                loading="eager"
              />
            )}

            {/* Contenido textual del banner */}
            <div className="relative z-20 max-w-xs sm:max-w-md space-y-2">
              {currentPromo.badge_text && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[var(--menu-primary)] text-white shadow-md shadow-[var(--menu-primary)]/40">
                  <Sparkles className="w-3.5 h-3.5" />
                  {currentPromo.badge_text}
                </span>
              )}

              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-md">
                {currentPromo.title}
              </h2>

              {currentPromo.subtitle && (
                <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 drop-shadow">
                  {currentPromo.subtitle}
                </p>
              )}

              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 transition">
                  Ver detalle <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </m.div>
        </AnimatePresence>

        {/* Indicadores minimalistas de paginación */}
        {promotions.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
            {promotions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx
                    ? 'w-6 bg-[var(--menu-primary)]'
                    : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Ir al banner ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
