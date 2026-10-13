// react-app/src/components/InstallPwaModal.jsx
// Modal moderno e interactivo para instalación PWA en escritorio y móviles

import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Download, Monitor, Smartphone, Share, PlusSquare, X, CheckCircle2, Sparkles } from 'lucide-react';

export function InstallPwaModal({ isOpen, onClose, onInstall, hasNativePrompt, isIos }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop con blur */}
        <button
          type="button"
          aria-label="Cerrar ventana"
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm w-full h-full border-none cursor-default"
        />

        {/* Modal Window */}
        <m.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10"
        >
          {/* Header con gradiente */}
          <div className="bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-700 p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                <Sparkles className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-sky-200">
                  Experiencia Nativa
                </span>
                <h3 className="text-xl font-bold text-white">Instalar SamaPos App</h3>
              </div>
            </div>
            <p className="text-sm text-sky-100/90 mt-1">
              Convierte el sistema en una aplicación de escritorio o móvil independiente sin barras de navegador.
            </p>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Beneficios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="p-2 rounded-xl bg-sky-100 text-sky-600 shrink-0">
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">Pantalla Completa</h4>
                  <p className="text-[11px] text-slate-500">Sin distracciones ni pestañas de navegador.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">Acceso Inmediato</h4>
                  <p className="text-[11px] text-slate-500">Icono directo en tu escritorio o celular.</p>
                </div>
              </div>
            </div>

            {/* Instrucciones según plataforma */}
            {isIos ? (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                  <Smartphone className="w-4 h-4" />
                  <span>Pasos para instalar en iPhone / iPad (Safari):</span>
                </div>
                <ol className="text-xs space-y-2 text-slate-700">
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                    <span>Toca el botón <strong className="inline-flex items-center gap-1 font-semibold text-sky-700"><Share className="w-3.5 h-3.5 inline" /> Compartir</strong> en la barra inferior de Safari.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                    <span>Desliza hacia abajo y selecciona <strong className="inline-flex items-center gap-1 font-semibold text-slate-900"><PlusSquare className="w-3.5 h-3.5 inline text-sky-600" /> Agregar al inicio</strong>.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                    <span>Toca <strong className="text-slate-900 font-semibold">"Agregar"</strong> en la esquina superior derecha.</span>
                  </li>
                </ol>
              </div>
            ) : hasNativePrompt ? (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
                <p className="text-xs text-slate-600 mb-3">
                  Tu navegador es compatible con instalación directa en un clic.
                </p>
                <button
                  onClick={onInstall}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 transition-all transform active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  <span>Instalar Ahora</span>
                </button>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center text-xs text-slate-600 space-y-2">
                <p>
                  Para instalar en Chrome o Edge de escritorio, busca el icono de <strong>Instalar</strong> <Download className="w-3.5 h-3.5 inline text-sky-600" /> en el extremo derecho de la barra de direcciones de tu navegador.
                </p>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </m.div>
      </div>
    </AnimatePresence>
  );
}
