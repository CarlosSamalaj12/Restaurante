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
      <div className="relative w-full min-h-[170px] sm:min-h-[190px] rounded-3xl overflow-hidden shadow-2xl border border-slate-800/80 bg-[#101726]/90 backdrop-blur-md">
        {/* Glow difuminado de fondo */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

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
              {/* Contenido textual del banner */}
              <div className="relative z-20 max-w-[65%] sm:max-w-md space-y-2.5">
                {promo.badge_text ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-400/30">
                    {promo.badge_text}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    ESPECIALIDAD
                  </span>
                )}

                <h2 className="text-lg sm:text-2xl font-black text-white leading-tight drop-shadow-md line-clamp-2">
                  {promo.title}
                </h2>

                {(promo.subtitle || promo.description) && (
                  <p className="text-xs sm:text-sm text-slate-300/90 line-clamp-2 drop-shadow font-normal leading-relaxed">
                    {promo.subtitle || promo.description}
                  </p>
                )}

                <div className="pt-1 flex items-center gap-3 flex-wrap">
                  {promo.promo_price && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-base sm:text-lg font-black text-amber-400">
                        Q {Number(promo.promo_price).toFixed(2)}
                      </span>
                      {promo.original_price && (
                        <span className="text-xs text-slate-500 line-through">
                          Q {Number(promo.original_price).toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}

                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/60 transition active:scale-95 shadow">
                    Ver detalle / Pedir <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                  </span>
                </div>
              </div>

              {/* Imagen del banner o platillo */}
              {promo.image_url ? (
                <div className="relative z-10 w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border border-slate-700/60 shadow-xl bg-slate-900/80 shrink-0">
                  <img
                    src={promo.image_url}
                    alt={promo.title}
                    className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-500"
                    loading={idx === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                </div>
              ) : (
                <div className="relative z-10 w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border border-blue-500/20 bg-blue-950/20 flex items-center justify-center text-4xl shadow-lg shrink-0">
                  ✨
                </div>
              )}
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
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-slate-800 text-white items-center justify-center backdrop-blur-md border border-slate-700/70 transition active:scale-90"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Siguiente promoción"
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-slate-800 text-white items-center justify-center backdrop-blur-md border border-slate-700/70 transition active:scale-90"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Indicadores de paginación */}
        {promotions.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-slate-950/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-800/80">
            {promotions.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx
                    ? 'w-6 bg-blue-500 shadow-sm shadow-blue-500/50'
                    : 'w-1.5 bg-slate-600 hover:bg-slate-400'
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
