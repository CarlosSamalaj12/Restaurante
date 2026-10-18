// react-app/src/components/public_menu/HeroCarousel.jsx
// Carrusel superior de promociones con track horizontal deslizante (efecto carrusel fluido),
// autoplay automático cada 5s, soporte táctil (swipe), flechas de navegación e indicadores interactivos.

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';

export function HeroCarousel({ promotions = [], onSelectPromotion }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

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

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? promotions.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % promotions.length);
  };

  const handleTouchStart = (e) => {
    stopAutoplay();
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    startAutoplay();
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
  };

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, [promotions.length]);

  // Si no hay promociones configuradas, no ocupar espacio innecesario
  if (!promotions || promotions.length === 0) return null;

  return (
    <div
      className="relative w-full px-4 pt-3 pb-2 max-w-7xl mx-auto overflow-hidden select-none"
      onMouseEnter={stopAutoplay}
      onMouseLeave={startAutoplay}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative w-full h-44 sm:h-52 md:h-60 rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-gradient-to-br from-[#111827] via-[#0F172A] to-[#1E293B]">
        {/* Track Deslizante con Efecto Carrusel Real */}
        <div
          className="flex h-full w-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {promotions.map((promo, idx) => (
            <div
              key={promo.id || idx}
              onClick={() => onSelectPromotion && onSelectPromotion(promo)}
              className="relative w-full h-full shrink-0 flex-none cursor-pointer flex items-center justify-between p-5 sm:p-7"
            >
              {/* Fondo con degradado protector de texto */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-transparent z-10 pointer-events-none" />

              {/* Imagen de fondo / producto promocional */}
              {promo.image_url && (
                <div className="absolute right-0 top-0 bottom-0 w-1/2 sm:w-5/12 flex items-center justify-center p-3 z-0 pointer-events-none">
                  <img
                    src={promo.image_url}
                    alt={promo.title}
                    className="max-h-full max-w-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)] transform hover:scale-105 transition-transform duration-500"
                    loading={idx === 0 ? "eager" : "lazy"}
                  />
                </div>
              )}

              {/* Contenido textual del banner */}
              <div className="relative z-20 max-w-[65%] sm:max-w-md space-y-2">
                {promo.badge_text && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-[var(--menu-primary,#3B82F6)] text-white shadow-lg shadow-[var(--menu-primary,#3B82F6)]/40 border border-white/20">
                    {promo.badge_text}
                  </span>
                )}

                <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-md line-clamp-2">
                  {promo.title}
                </h2>

                {promo.subtitle && (
                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 drop-shadow font-medium">
                    {promo.subtitle}
                  </p>
                )}

                <div className="pt-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 transition active:scale-95 shadow">
                    Ver detalle / Pedir <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Flechas de Navegación laterales para Desktop / Tablet */}
        {promotions.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Promoción anterior"
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white items-center justify-center backdrop-blur-md border border-white/10 transition active:scale-90"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Siguiente promoción"
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white items-center justify-center backdrop-blur-md border border-white/10 transition active:scale-90"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Indicadores minimalistas de paginación */}
        {promotions.length > 1 && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
            {promotions.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx
                    ? 'w-6 bg-[var(--menu-primary,#3B82F6)] shadow-sm'
                    : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Ir a la promoción ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
