// react-app/src/components/public_menu/MenuHeader.jsx
// Cabecera principal, barra superior de estado, selector de idioma iOS y banner del restaurante

import React from 'react';
import { Wifi, UtensilsCrossed, BellRing, ShoppingBag, Globe } from 'lucide-react';
import { t, getLocalizedName, getLocalizedDescription } from '../../utils/menuTranslations';

export function MenuHeader({
  menu,
  tableInfo,
  onCallWaiter,
  cartItemCount = 0,
  cartTotal = 0,
  onOpenCart,
  lang = 'es',
  onLanguageChange,
}) {
  return (
    <>
      {/* 1. Barra Superior de Conectividad, Mesa y Selector de Idioma */}
      <div className="relative z-30 w-full bg-[#070B13]/90 backdrop-blur-md border-b border-slate-800/60 px-4 py-2 flex items-center justify-between text-[11px] font-bold select-none">
        <div className="flex items-center gap-2 text-amber-400 font-extrabold tracking-wider">
          <span className="w-2 h-2 rounded-full bg-amber-400 menu-badge-pulse" />
          <span>
            {tableInfo?.tableCode
              ? t(lang, 'activeTableOrder', { code: tableInfo.tableCode })
              : t(lang, 'activeDigitalMenu')}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de Idioma táctil estilo iOS [ 🇪🇸 ES | 🇺🇸 EN ] */}
          {onLanguageChange && (
            <div className="flex items-center bg-slate-900/90 border border-white/10 rounded-full p-0.5 shadow-inner">
              <button
                type="button"
                onClick={() => onLanguageChange('es')}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold transition-all cursor-pointer ${
                  lang === 'es'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Cambiar a Español"
                aria-label="Cambiar a Español"
              >
                ES
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('en')}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold transition-all cursor-pointer ${
                  lang === 'en'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Switch to English"
                aria-label="Switch to English"
              >
                EN
              </button>
            </div>
          )}

          <div className="hidden xs:flex items-center gap-1.5 text-amber-400/90 font-medium text-[11px]">
            <Wifi className="w-3.5 h-3.5 text-amber-400" />
            <span>{t(lang, 'connected')}</span>
          </div>
        </div>
      </div>

      {/* 2. Cabecera con Logo, Nombre y Accesos Rápidos */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0B101B]/90 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {menu?.logo_url ? (
            <div className="w-10 h-10 rounded-2xl bg-slate-900/90 border border-slate-700/60 p-1.5 flex items-center justify-center shadow-inner shrink-0">
              <img src={menu.logo_url} alt={menu.name} className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 shadow-inner shrink-0">
              <UtensilsCrossed className="w-5 h-5 text-slate-300" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-black text-base sm:text-lg leading-tight text-white tracking-tight truncate">
              {getLocalizedName(menu, lang) || (lang === 'en' ? 'Main Menu' : 'Menú Principal')}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              {lang === 'en' ? 'Interactive Digital Menu' : 'Carta Digital Interactiva'}
            </p>
          </div>
        </div>

        {/* Botones de Cabecera: Llamar Mesero y Carrito */}
        <div className="flex items-center gap-2 shrink-0">
          {tableInfo && (
            <button
              onClick={onCallWaiter}
              className="p-2 sm:px-3 sm:py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 active:scale-95 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title={t(lang, 'callWaiter')}
            >
              <BellRing className="w-4 h-4" />
              <span className="hidden sm:inline">{lang === 'en' ? 'Waiter' : 'Mesero'}</span>
            </button>
          )}

          {cartItemCount > 0 && (
            <button
              onClick={onOpenCart}
              className="px-3.5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition cursor-pointer"
              title={t(lang, 'viewCart')}
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
                <h2 className="text-lg sm:text-2xl font-black text-white drop-shadow-md">
                  {getLocalizedName(menu, lang)}
                </h2>
                {menu.description && (
                  <p className="text-xs text-slate-200 line-clamp-1 drop-shadow">
                    {getLocalizedDescription(menu, lang)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
