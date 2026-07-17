import { WifiOff, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOffline } from '../hooks/useOffline';

export function OfflineBanner() {
  const { isOnline, wasOffline } = useOffline();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2"
        >
          <WifiOff className="w-5 h-5" />
          <span className="font-medium text-sm">Sin conexión - Modo offline</span>
        </motion.div>
      )}
      {isOnline && wasOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-green-500 text-white px-4 py-2 flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium text-sm">Conexión restaurada</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
