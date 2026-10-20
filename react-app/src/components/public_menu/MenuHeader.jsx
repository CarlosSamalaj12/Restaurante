// react-app/src/components/public_menu/MenuHeader.jsx
// Cabecera principal, barra superior de estado y banner de presentación del restaurante

import React from 'react';
import { Wifi, UtensilsCrossed, BellRing, ShoppingBag } from 'lucide-react';

export function MenuHeader({
  menu,
  tableInfo,
  onCallWaiter,
  cartItemCount = 0,
  cartTotal = 0,
  onOpenCart,
}) {
  return (
    <>
      {/* 1. Barra Superior de Conectividad y Mesa */}
      <div className="relative z-30 w-full bg-[#070B13]/90 backdrop-blur-md border-b border-slate-800/60 px-4 py-2 flex items-center justify-between text-[11px] font-bold select-none">
        <div className="flex items-center gap-2 text-amber-400 font-extrabold tracking-wider">
          <span className="w-2 h-2 rounded-full bg-amber-400 menu-badge-pulse" />
          <span>
            {tableInfo?.tableCode
              ? `MESA ${tableInfo.tableCode} • COMANDA ACTIVA`
              : 'CARTA DIGITAL • ACTIVA'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-400/90 font-medium text-[11px]">
          <Wifi className="w-3.5 h-3.5 text-amber-400" />
          <span>Conectado</span>
        </div>
      </div>

      {/* 2. Cabecera con Logo, Nombre y Accesos Rápidos */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0B101B]/90 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {menu?.logo_url ? (
            <div className="w-10 h-10 rounded-2xl bg-slate-900/90 border border-slate-700/60 p-1.5 flex items-center justify-center shadow-inner">
              <img src={menu.logo_url} alt={menu.name} className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 shadow-inner">
              <UtensilsCrossed className="w-5 h-5 text-slate-300" />
            </div>
          )}
          <div>
            <h1 className="font-black text-base sm:text-lg leading-tight text-white tracking-tight">
              {menu?.name || 'Menú Principal'}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Carta Digital Interactiva</p>
          </div>
        </div>

        {/* Botones de Cabecera: Llamar Mesero y Carrito */}
        <div className="flex items-center gap-2">
          {tableInfo && (
            <button
              onClick={onCallWaiter}
              className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 active:scale-95 transition flex items-center gap-1.5 text-xs font-bold"
              title="Llamar al Mesero"
            >
              <BellRing className="w-4 h-4" />
              <span className="hidden sm:inline">Mesero</span>
            </button>
          )}

          {cartItemCount > 0 && (
            <button
              onClick={onOpenCart}
              className="px-3.5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{cartItemCount}</span>
              <span className="opacity-70">•</span>
              <span>Q{cartTotal.toFixed(2)}</span>
            </button>
          )}
        </div>
      </header>

      {/* 3. Portada Panorámica / Banner del Restaurante */}
      {menu?.banner_url && (
        <div className="relative w-full h-36 sm:h-52 overflow-hidden bg-slate-950">
          <img
            src={menu.banner_url}
            alt={menu.name}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B101B] via-[#0B101B]/40 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div className="flex items-center gap-3">
              {menu?.logo_url && (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 p-1.5 shadow-2xl flex items-center justify-center">
                  <img src={menu.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
              )}
              <div>
                <h2 className="text-lg sm:text-2xl font-black text-white drop-shadow-md">{menu.name}</h2>
                {menu.description && (
                  <p className="text-xs text-slate-200 line-clamp-1 drop-shadow">{menu.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
