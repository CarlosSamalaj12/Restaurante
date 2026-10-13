// react-app/src/components/MaintenanceLockScreen.jsx
// Pantalla de bloqueo moderna para terminales regulares durante el modo mantenimiento

import React, { useState } from 'react';
import { m } from 'framer-motion';
import { 
  Wrench, 
  Sparkles, 
  RefreshCw, 
  ShieldCheck, 
  Clock, 
  Radio, 
  Lock,
  ChevronRight 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function MaintenanceLockScreen({ 
  reason, 
  targetVersion, 
  activatedAt,
  onRefresh,
}) {
  const { logout, user } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      if (onRefresh) await onRefresh();
    } finally {
      setTimeout(() => setChecking(false), 800);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 relative overflow-hidden font-sans select-none">
      {/* Luces y efectos ambientales de fondo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Tarjeta Central */}
      <m.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 text-center"
      >
        {/* Icono animado */}
        <div className="relative mx-auto w-24 h-24 mb-6 flex items-center justify-center">
          <m.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-3xl border border-dashed border-sky-400/40"
          />
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500/20 via-indigo-500/20 to-purple-500/20 border border-sky-400/30 flex items-center justify-center shadow-inner">
            <Wrench className="w-10 h-10 text-sky-400 animate-bounce" />
          </div>
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 border-2 border-slate-900 flex items-center justify-center shadow-md">
            <Lock className="w-3 h-3 text-slate-950" />
          </span>
        </div>

        {/* Título y versión */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>SamaPos Cloud & Local</span>
          <span className="w-1 h-1 rounded-full bg-sky-400" />
          <span className="font-mono text-amber-300">{targetVersion || 'v1.1.0'}</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
          Sistema en Mantenimiento
        </h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          Estamos aplicando mejoras técnicas y actualizaciones de base de datos para garantizar la estabilidad y rapidez del sistema.
        </p>

        {/* Caja de información de motivo */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-left mb-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-500" /> Estado:
            </span>
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
              Trabajos en curso
            </span>
          </div>

          <div className="text-xs text-slate-300 pt-1">
            <span className="text-slate-500 font-semibold block mb-0.5">Motivo de la pausa:</span>
            <p className="bg-slate-900/80 rounded-lg p-2.5 text-slate-200 font-medium border border-slate-800/60 text-xs">
              {reason || 'Actualización y mantenimiento programado'}
            </p>
          </div>
        </div>

        {/* Estado en vivo / Escucha por socket */}
        <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-medium py-2 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>Reconexión automática activa. Se restablecerá solo al finalizar.</span>
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={checking}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/80 transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-sky-400' : ''}`} />
            <span>Verificar Disponibilidad</span>
          </button>

          {user && (
            <button
              type="button"
              onClick={logout}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium border border-slate-800 transition-colors cursor-pointer"
            >
              <span>Cambiar de Usuario</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </m.div>

      {/* Pie de página discreto */}
      <div className="mt-8 text-center text-xs text-slate-600">
        <p>SamaPos POS Restaurant Suite • Mantenimiento Administrado</p>
      </div>
    </div>
  );
}
