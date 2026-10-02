import { WifiOff, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { useOffline } from '../hooks/useOffline';
import { getTerminalCode } from '../lib/offlineCorrelatives';

export function OfflineBanner() {
  const { isOnline, wasOffline, isSyncing, pendingCount, lastError, triggerSync } = useOffline();
  const terminalCode = getTerminalCode();

  return (
    <AnimatePresence>
      {!isOnline && (
        <m.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-amber-600/95 backdrop-blur-md text-white px-4 py-2 flex items-center justify-between shadow-lg text-sm"
        >
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 animate-pulse text-amber-200" />
            <span className="font-semibold tracking-wide">
              Modo Offline Activo ({terminalCode})
            </span>
            <span className="text-amber-100 hidden sm:inline">
              — Las ventas y comandas se guardan localmente
            </span>
          </div>

          <div className="flex items-center gap-3">
            {pendingCount > 0 ? (
              <span className="bg-amber-800/80 text-amber-200 px-2 py-0.5 rounded-full text-xs font-mono font-bold">
                {pendingCount} {pendingCount === 1 ? 'venta local' : 'ventas locales'}
              </span>
            ) : (
              <span className="text-xs text-amber-200">Listo para operar</span>
            )}
          </div>
        </m.div>
      )}

      {isOnline && isSyncing && (
        <m.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-blue-600/95 backdrop-blur-md text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg text-sm"
        >
          <RefreshCw className="w-4 h-4 animate-spin text-blue-200" />
          <span className="font-medium">
            Sincronizando {pendingCount > 0 ? `${pendingCount} transacciones` : 'ventas'} con el servidor central...
          </span>
        </m.div>
      )}

      {isOnline && !isSyncing && lastError && (
        <m.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-red-600/95 backdrop-blur-md text-white px-4 py-2 flex items-center justify-between shadow-lg text-sm"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-200" />
            <span className="font-medium">Error al sincronizar ventas offline</span>
            <span className="text-red-200 text-xs hidden sm:inline">({lastError})</span>
          </div>
          <button
            onClick={() => triggerSync()}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs px-2.5 py-1 rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar
          </button>
        </m.div>
      )}

      {isOnline && !isSyncing && !lastError && wasOffline && (
        <m.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-emerald-600/95 backdrop-blur-md text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg text-sm"
        >
          <CheckCircle className="w-4 h-4 text-emerald-200" />
          <span className="font-medium">Conexión restaurada — Sistema sincronizado con la nube</span>
        </m.div>
      )}
    </AnimatePresence>
  );
}
