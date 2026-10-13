/**
 * syncService.js
 *
 * Motor de sincronización en segundo plano:
 * - Monitorea la conectividad
 * - Refresca el catálogo y mesas en IndexedDB cuando está online
 * - Despacha las transacciones acumuladas en la cola hacia la nube (/api/sync/batch)
 * - Emite estados para alimentar badges y banners en la UI
 */

import { offlineDb } from './offlineDb';

let isSyncing = false;
let listeners = new Set();
let autoSyncInterval = null;

const syncState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncTime: null,
  lastError: null,
};

function notify() {
  const snapshot = { ...syncState };
  for (const listener of listeners) {
    try {
      listener(snapshot);
    } catch (e) {
      console.error('[SyncService] Listener error:', e);
    }
  }
}

export const syncService = {
  subscribe(listener) {
    listeners.add(listener);
    listener({ ...syncState });
    return () => listeners.delete(listener);
  },

  getState() {
    return { ...syncState };
  },

  async updatePendingCount() {
    try {
      syncState.pendingCount = await offlineDb.getQueueCount();
      notify();
    } catch {
      // IndexedDB no disponible aún
    }
  },

  /**
   * Sincroniza datos maestros desde el servidor hacia IndexedDB (Downlink).
   * Se ejecuta cuando hay red y la app inicia o vuelve online.
   */
  async refreshMasterData(api) {
    if (!navigator.onLine || !api) return;

    try {
      // 1. Catálogo
      const catalogRes = await api.getCatalog().catch(() => null);
      if (catalogRes?.products) {
        await offlineDb.saveCatalog(catalogRes.products, catalogRes.categories || []);
      }

      // 2. Mesas
      const tablesRes = await api.getTables().catch(() => null);
      if (Array.isArray(tablesRes)) {
        await offlineDb.saveTables(tablesRes);
      } else if (tablesRes?.tables) {
        await offlineDb.saveTables(tablesRes.tables);
      }

      // 3. Turno activo
      let shiftRes = null;
      if (typeof api.getActiveShift === 'function') {
        shiftRes = await api.getActiveShift(1).catch(() => null);
      } else if (typeof api.checkActiveShift === 'function') {
        shiftRes = await api.checkActiveShift(1).catch(() => null);
      }
      if (shiftRes) {
        await offlineDb.saveActiveShift(shiftRes);
      }

      syncState.lastSyncTime = new Date().toISOString();
      notify();
    } catch (err) {
      console.warn('[SyncService] Falló refresco de datos maestros:', err.message);
    }
  },

  /**
   * Sube las ventas y comandas acumuladas hacia el servidor (Uplink).
   */
  async syncPendingQueue(api) {
    if (isSyncing || !navigator.onLine || !api) return;

    const pending = await offlineDb.getPendingQueue();
    if (!pending || pending.length === 0) {
      syncState.pendingCount = 0;
      notify();
      return;
    }

    isSyncing = true;
    syncState.isSyncing = true;
    syncState.lastError = null;
    notify();

    try {
      // Enviar el lote a la API de sincronización en batch
      const response = await api.syncBatch(pending);

      if (response && response.results) {
        for (const res of response.results) {
          if (res.ok) {
            await offlineDb.markQueueItem(res.queueId, 'synced');
          } else {
            await offlineDb.markQueueItem(res.queueId, 'failed', res.error || 'Error del servidor');
          }
        }
      } else {
        // Marcado masivo si la respuesta fue globalmente exitosa
        for (const item of pending) {
          await offlineDb.markQueueItem(item.id, 'synced');
        }
      }

      // Limpiar ítems exitosos antiguos para mantener la base liviana
      await offlineDb.clearSyncedQueue();
      syncState.lastSyncTime = new Date().toISOString();
      syncState.lastError = null;
    } catch (err) {
      console.error('[SyncService] Error subiendo transacciones:', err);
      syncState.lastError = err.message || 'Error de conexión durante sincronización';
    } finally {
      isSyncing = false;
      syncState.isSyncing = false;
      await this.updatePendingCount();
    }
  },

  /**
   * Inicializa los observadores automáticos de red y temporizadores.
   */
  init(api) {
    if (typeof window === 'undefined') return;

    this.updatePendingCount();

    const handleOnline = () => {
      syncState.isOnline = true;
      notify();
      this.refreshMasterData(api);
      this.syncPendingQueue(api);
    };

    const handleOffline = () => {
      syncState.isOnline = false;
      notify();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Intento inicial si ya hay conexión
    if (navigator.onLine) {
      this.refreshMasterData(api);
      this.syncPendingQueue(api);
    }

    // Intervalo de verificación cada 30 segundos
    if (!autoSyncInterval) {
      autoSyncInterval = setInterval(() => {
        if (navigator.onLine) {
          this.syncPendingQueue(api);
        }
      }, 30000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (autoSyncInterval) clearInterval(autoSyncInterval);
    };
  },
};
