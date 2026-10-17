/**
 * ConfirmDialog.jsx
 *
 * Diálogo modal premium de confirmación para acciones críticas y operativas.
 * Reemplaza los alerts y confirms nativos de navegador con diseño moderno,
 * animaciones fluidas, soporte de accesibilidad y variantes semánticas.
 */

import React, { useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Trash2,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  X,
  Loader2
} from 'lucide-react';

const VARIANTS = {
  danger: {
    iconBg: 'bg-rose-50 border-rose-200 text-rose-600',
    icon: ShieldAlert,
    confirmBtn:
      'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-lg shadow-rose-600/20 active:scale-[0.98]',
    borderGlow: 'border-rose-100',
  },
  warning: {
    iconBg: 'bg-amber-50 border-amber-200 text-amber-600',
    icon: AlertTriangle,
    confirmBtn:
      'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/20 active:scale-[0.98]',
    borderGlow: 'border-amber-100',
  },
  info: {
    iconBg: 'bg-indigo-50 border-indigo-200 text-indigo-600',
    icon: HelpCircle,
    confirmBtn:
      'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-600/20 active:scale-[0.98]',
    borderGlow: 'border-indigo-100',
  },
  success: {
    iconBg: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    icon: CheckCircle2,
    confirmBtn:
      'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/20 active:scale-[0.98]',
    borderGlow: 'border-emerald-100',
  },
};

export function ConfirmDialog({
  isOpen,
  title = '¿Estás seguro?',
  message,
  itemName,
  itemDetail,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  variant = 'danger',
  icon: CustomIcon,
  loading = false,
  onConfirm,
  onCancel,
}) {
  // Manejo de tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onCancel && onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  const currentVariant = VARIANTS[variant] || VARIANTS.danger;
  const IconComponent = CustomIcon || currentVariant.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera / Botón cerrar */}
        <div className="absolute top-4 right-4 z-10">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 sm:p-7">
          {/* Icono animado */}
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${currentVariant.iconBg}`}
            >
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                {title}
              </h3>
              {message && (
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {message}
                </p>
              )}
            </div>
          </div>

          {/* Caja destacada del elemento afectado (opcional) */}
          {(itemName || itemDetail) && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 mb-5 text-left">
              {itemName && (
                <p className="text-xs font-bold text-slate-900 truncate">
                  {itemName}
                </p>
              )}
              {itemDetail && (
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  {itemDetail}
                </p>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${currentVariant.confirmBtn} disabled:opacity-50`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <span>{confirmText}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
