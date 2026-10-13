// react-app/src/components/MaintenanceCountdownBanner.jsx
// Banner y modal flotante de cuenta regresiva de 30 segundos sincronizado en tiempo real

import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, XCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function MaintenanceCountdownBanner({
  isCountingDown,
  countdownRemaining,
  reason,
  targetVersion,
  onAbort,
}) {
  const { user } = useAuth();
  const isSuperadmin = String(user?.role || '').toLowerCase() === 'superadmin';

  if (!isCountingDown) return null;

  const progressPercent = Math.min(100, Math.max(0, (countdownRemaining / 30) * 100));

  return (
    <AnimatePresence>
      <div className="fixed top-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:max-w-md z-50 pointer-events-auto">
        <m.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="bg-slate-900/95 backdrop-blur-xl border-2 border-amber-500/80 rounded-2xl p-4 shadow-2xl shadow-amber-500/20 text-white overflow-hidden relative"
        >
          {/* Barra de progreso animada en la parte superior */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-slate-800">
            <m.div
              className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-amber-500"
              style={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </div>

          <div className="flex items-start gap-3.5 pt-1">
            {/* Cronómetro visual animado */}
            <div className="relative shrink-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex flex-col items-center justify-center animate-pulse">
                <span className="text-xl font-extrabold font-mono text-amber-300 leading-none">
                  {countdownRemaining}
                </span>
                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-tighter">seg</span>
              </div>
            </div>

            {/* Texto y detalles */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <h4 className="text-sm font-bold text-amber-200 uppercase tracking-wide truncate">
                  Aviso de Mantenimiento
                </h4>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-snug">
                El sistema se pausará en <strong className="text-white font-mono">{countdownRemaining}s</strong> por actualización <span className="font-semibold text-amber-300">({targetVersion})</span>.
              </p>
              {reason && (
                <p className="text-[11px] text-slate-400 italic mt-0.5 truncate">
                  Motivo: {reason}
                </p>
              )}
              <p className="text-[11px] text-amber-400/90 font-medium mt-1">
                ⚠️ Por favor guarde comandas y pagos pendientes.
              </p>
            </div>
          </div>

          {/* Botón de abortar visible exclusivamente para Superadmin */}
          {isSuperadmin && onAbort && (
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-purple-300 flex items-center gap-1 font-medium">
                <ShieldAlert className="w-3.5 h-3.5" /> Eres Superadmin
              </span>
              <button
                type="button"
                onClick={onAbort}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 text-xs font-semibold transition-all cursor-pointer active:scale-95"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancelar Mantenimiento</span>
              </button>
            </div>
          )}
        </m.div>
      </div>
    </AnimatePresence>
  );
}
