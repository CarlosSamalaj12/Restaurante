// react-app/src/components/InstallPwaButton.jsx
// Botón elegante para invocar la instalación PWA desde Header o Login

import React from 'react';
import { Download, Sparkles } from 'lucide-react';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { InstallPwaModal } from './InstallPwaModal';

export function InstallPwaButton({ variant = 'header', className = '' }) {
  const { canInstall, isInstalled, hasNativePrompt, isIos, showModal, setShowModal, triggerInstall } = usePwaInstall();

  if (isInstalled) {
    return null; // Ya está corriendo como app instalada
  }

  // Si variant es 'login'
  if (variant === 'login') {
    return (
      <>
        <button
          type="button"
          onClick={triggerInstall}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/80 font-medium text-xs shadow-sm transition-all hover:shadow active:scale-95 ${className}`}
          title="Instalar aplicación en este dispositivo"
        >
          <Download className="w-4 h-4 text-sky-600 animate-bounce" />
          <span>Instalar App POS</span>
        </button>

        <InstallPwaModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onInstall={triggerInstall}
          hasNativePrompt={hasNativePrompt}
          isIos={isIos}
        />
      </>
    );
  }

  // Variant default 'header'
  return (
    <>
      <button
        type="button"
        onClick={triggerInstall}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 hover:from-sky-500/20 hover:to-indigo-500/20 text-sky-700 dark:text-sky-300 border border-sky-300/40 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 shadow-sm ${className}`}
        title="Instalar aplicación en este dispositivo"
      >
        <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
        <span className="hidden sm:inline">Instalar App</span>
      </button>

      <InstallPwaModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onInstall={triggerInstall}
        hasNativePrompt={hasNativePrompt}
        isIos={isIos}
      />
    </>
  );
}
