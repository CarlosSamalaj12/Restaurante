// react-app/src/hooks/useSocket.js
// Hook de cliente para conexión Socket.IO y escucha de eventos de ventas en vivo

import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

let sharedSocket = null;

function getSharedSocket() {
  if (!sharedSocket) {
    // En Vite dev server con proxy o en producción servida por Express:
    sharedSocket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      autoConnect: true,
    });
  }
  return sharedSocket;
}

export function useSocket(eventHandlers = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const handlersRef = useRef(eventHandlers);
  handlersRef.current = eventHandlers;

  useEffect(() => {
    const socket = getSharedSocket();

    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const handleAnyEvent = (eventName, data) => {
      setLastEvent({ name: eventName, data, timestamp: new Date() });
      if (handlersRef.current && typeof handlersRef.current[eventName] === 'function') {
        handlersRef.current[eventName](data);
      }
    };

    if (socket.connected) {
      setIsConnected(true);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Escuchar eventos de ventas clave
    const events = ['sales:payment', 'sales:closed', 'sales:order'];
    const listeners = {};

    events.forEach((ev) => {
      listeners[ev] = (payload) => handleAnyEvent(ev, payload);
      socket.on(ev, listeners[ev]);
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      events.forEach((ev) => {
        if (listeners[ev]) socket.off(ev, listeners[ev]);
      });
    };
  }, []);

  return {
    isConnected,
    lastEvent,
    socket: sharedSocket,
  };
}
