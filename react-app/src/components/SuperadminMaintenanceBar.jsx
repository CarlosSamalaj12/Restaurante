// react-app/src/components/SuperadminMaintenanceBar.jsx
// Barra superior de alerta y control para Superadmin mientras el sistema está en mantenimiento

import React, { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Play, Sparkles, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export function SuperadminMaintenanceBar({
  isActive,
  reason,
  targetVersion,
  onEndMaintenance,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isMountedRef = React.useRef(true);
  const requestIdRef = React.useRef(0);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  if (!isActive) return null;

  const handleConfirmEnd = async () => {
    const currentId = ++requestIdRef.current;
    setLoading(true);
    try {
      if (onEndMaintenance) {
        await onEndMaintenance();
      }
      if (isMountedRef.current && requestIdRef.current === currentId) {
        setConfirmOpen(false);
      }
    } catch (err) {
      console.error('Error al finalizar mantenimiento:', err);
    } finally {
      if (isMountedRef.current && requestIdRef.current === currentId) {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <div className="sticky top-0 z-40 w-full bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white border-b border-purple-500/40 shadow-lg px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Lado izquierdo: Alerta y descripción */}
          <div className="flex items-center gap-2.5 text-xs">
            <span className="p-1 rounded-lg bg-purple-500/30 text-purple-200 border border-purple-400/30 shrink-0 animate-pulse">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold uppercase tracking-wide text-purple-200">
                  Modo Mantenimiento Activo
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-400/30">
                  {targetVersion || 'v1.0.0'}
                </span>
                <span className="text-[11px] text-purple-300 hidden md:inline">
                  (Las demás terminales están bloqueadas)
                </span>
              </div>
              {reason && (
                <p className="text-[11px] text-slate-300 truncate max-w-md mt-0.5">
                  Motivo: {reason}
                </p>
              )}
            </div>
          </div>

          {/* Lado derecho: Botón para reactivar */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 border border-emerald-400/40 transition-all cursor-pointer active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Reanudar y Salir de Mantenimiento</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmación para reactivar */}
      <AnimatePresence>
        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Cerrar confirmación"
              onClick={() => !loading && setConfirmOpen(false)}
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm w-full h-full border-none cursor-default"
            />

            <m.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 p-6 text-slate-800"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">
                ¿Reactivar el sistema ahora?
              </h3>
              <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                Todas las terminales conectadas (meseros, cocina, cajeros) serán desbloqueadas inmediatamente y recibirán una orden de recarga limpia de caché para adoptar la versión <strong className="text-slate-900">{targetVersion}</strong>.
              </p>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setConfirmOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleConfirmEnd}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Reactivando...</span>
                    </>
                  ) : (
                    <span>Sí, Reanudar Sistema</span>
                  )}
                </button>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
