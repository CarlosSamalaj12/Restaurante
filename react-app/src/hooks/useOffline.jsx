import { useState, useEffect, useRef, useCallback } from 'react';
import { syncService } from '../lib/syncService';
import { api } from '../api';

const WAS_OFFLINE_DURATION_MS = 5000;

export function useOffline() {
  const [syncState, setSyncState] = useState(() => syncService.getState());
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [wasOffline, setWasOffline] = useState(false);
  const wasOnlineRef = useRef(isOnline);

  // Suscripción a syncService
  useEffect(() => {
    const unsubscribe = syncService.subscribe((state) => {
      setSyncState(state);
      setIsOnline(state.isOnline);
    });
    return unsubscribe;
  }, []);

  // Transición offline -> online para bandera visual wasOffline
  useEffect(() => {
    const transitionedFromOffline = isOnline && wasOnlineRef.current === false;
    wasOnlineRef.current = isOnline;

    if (!transitionedFromOffline) return;

    setWasOffline(true);
    const timerId = setTimeout(() => {
      setWasOffline(false);
    }, WAS_OFFLINE_DURATION_MS);
    return () => clearTimeout(timerId);
  }, [isOnline]);

  const triggerSync = useCallback(() => {
    return syncService.syncPendingQueue(api);
  }, []);

  return {
    isOnline,
    wasOffline,
    isSyncing: syncState.isSyncing,
    pendingCount: syncState.pendingCount,
    lastSyncTime: syncState.lastSyncTime,
    lastError: syncState.lastError,
    triggerSync,
  };
}
