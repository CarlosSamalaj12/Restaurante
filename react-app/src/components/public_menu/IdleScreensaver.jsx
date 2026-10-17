// react-app/src/components/public_menu/IdleScreensaver.jsx
// Protector de pantalla para Kioscos y Totems 9:16 con reactivación táctil instantánea

import React from 'react';
import { m } from 'framer-motion';
import { Sparkles, Utensils, Touchpad } from 'lucide-react';

export function IdleScreensaver({ logoUrl, bannerUrl, onWakeUp }) {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onWakeUp}
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-between p-8 text-center cursor-pointer select-none overflow-hidden"
    >
      {/* Fondo con imagen tenue */}
      {bannerUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 scale-105 filter blur-xs"
          style={{ backgroundImage: `url(${bannerUrl})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60" />

      {/* Cabecera */}
      <div className="relative z-10 pt-12 space-y-3">
        {logoUrl && (
          <img src={logoUrl} alt="Logo" className="h-16 w-auto mx-auto object-contain drop-shadow-xl" />
        )}
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[var(--menu-primary)] text-white shadow-lg">
          <Sparkles className="w-3.5 h-3.5" /> Kiosco de Auto-Servicio
        </span>
      </div>

      {/* Centro: Llamado a la Acción con Pulsación Suave */}
      <m.div
        animate={{ scale: [1, 1.05, 1], y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
        className="relative z-10 space-y-4 max-w-sm"
      >
        <div className="w-24 h-24 rounded-full bg-[var(--menu-primary)]/20 border-2 border-[var(--menu-primary)]/40 text-[var(--menu-primary)] flex items-center justify-center mx-auto shadow-2xl">
          <Utensils className="w-12 h-12" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight drop-shadow-lg">
          ¡Ordena Aquí!
        </h1>
        <p className="text-sm text-slate-300 drop-shadow">
          Explora nuestros platillos, personaliza tus acompañamientos y envía tu orden en segundos.
        </p>

        <div className="pt-4">
          <span className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-slate-950 font-black text-sm shadow-2xl shadow-white/20">
            Toca la pantalla para ordenar
          </span>
        </div>
      </m.div>

      {/* Pie de Pantalla */}
      <div className="relative z-10 pb-6 text-xs text-slate-500 font-semibold">
        SamaPOS · Kiosco Interactivo
      </div>
    </m.div>
  );
}
