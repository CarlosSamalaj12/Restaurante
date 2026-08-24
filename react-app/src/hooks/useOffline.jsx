import { useState, useEffect, useRef } from 'react';

const WAS_OFFLINE_DURATION_MS = 5000;

export function useOffline() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [wasOffline, setWasOffline] = useState(false);
  // Ref para saber si veníamos offline y disparar el "was offline" sólo
  // en la transición offline → online (no en cada "online").
  const wasOnlineRef = useRef(isOnline);

  // Effect 1 — Suscripción a los eventos del browser. Cleanup con AbortController.
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const handleOnline = () => {
      wasOnlineRef.current = true;
      setIsOnline(true);
    };

    const handleOffline = () => {
      wasOnlineRef.current = false;
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline, { signal });
    window.addEventListener('offline', handleOffline, { signal });

    return () => controller.abort();
  }, []);

  // Effect 2 — Cuando pasamos de offline a online, marca wasOffline y
  // agenda el reset a los 5s. Cleanup directo del setTimeout.
  useEffect(() => {
    // Sólo nos importa la transición offline → online, que detectamos
    // comparando el ref (estado previo) con el estado nuevo.
    const transitionedFromOffline = isOnline && wasOnlineRef.current === false;
    // Actualizamos el ref para la próxima comparación.
    wasOnlineRef.current = isOnline;

    if (!transitionedFromOffline) return;

    setWasOffline(true);
    const timerId = setTimeout(() => {
      setWasOffline(false);
    }, WAS_OFFLINE_DURATION_MS);
    return () => clearTimeout(timerId);
  }, [isOnline]);

  return { isOnline, wasOffline };
}
