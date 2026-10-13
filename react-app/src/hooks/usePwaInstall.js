// react-app/src/hooks/usePwaInstall.js
// Hook reactivo para detección de capacidad PWA e instalación en escritorio y móviles

import { useState, useEffect } from 'react';

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // 1. Detectar si ya está corriendo en modo standalone (instalada)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    setIsInstalled(isStandalone);

    // 2. Detectar si es iOS / iPadOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIos(isIosDevice);

    // 3. Capturar evento de instalación nativo (Chromium, Edge, Chrome Android)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // 4. Capturar cuando el usuario finaliza la instalación
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowModal(false);
      console.log('[PWA] Aplicación instalada exitosamente');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          console.log('[PWA] Instalación aceptada por el usuario');
          setDeferredPrompt(null);
        } else {
          console.log('[PWA] Instalación cancelada');
        }
      } catch (err) {
        console.error('[PWA] Error al disparar instalador:', err);
      }
    } else {
      // Si es iOS o no hay prompt nativo disponible, abrir el modal de instrucciones
      setShowModal(true);
    }
  };

  return {
    canInstall: !isInstalled && (Boolean(deferredPrompt) || isIos),
    hasNativePrompt: Boolean(deferredPrompt),
    isInstalled,
    isIos,
    showModal,
    setShowModal,
    triggerInstall,
  };
}
