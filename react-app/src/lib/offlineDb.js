/**
 * offlineDb.js
 *
 * Base de datos local en el navegador utilizando IndexedDB nativo (sin dependencias pesadas).
 * Almacena catálogo, mesas, cuentas locales, comandas, pagos y la cola de sincronización.
 */

const DB_NAME = 'RestaurantePosOfflineDB';
const DB_VERSION = 1;

let dbPromise = null;

export function getDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB no está soportado en este entorno'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Metadata clave-valor
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }

      // Catálogo de productos y categorías
      if (!db.objectStoreNames.contains('catalog')) {
        const store = db.createObjectStore('catalog', { keyPath: 'id' });
        store.createIndex('by_category', 'category_id', { unique: false });
        store.createIndex('by_name', 'name', { unique: false });
      }

      // Mesas y salones
      if (!db.objectStoreNames.contains('tables')) {
        const store = db.createObjectStore('tables', { keyPath: 'id' });
        store.createIndex('by_zone', 'zone_id', { unique: false });
      }

      // Cuentas locales / offline
      if (!db.objectStoreNames.contains('accounts')) {
        const store = db.createObjectStore('accounts', { keyPath: 'offline_id' });
        store.createIndex('by_check_number', 'check_number', { unique: true });
        store.createIndex('by_table', 'table_id', { unique: false });
        store.createIndex('by_status', 'status', { unique: false });
      }

      // Ítems de pedidos / comandas
      if (!db.objectStoreNames.contains('order_items')) {
        const store = db.createObjectStore('order_items', { keyPath: 'offline_id' });
        store.createIndex('by_account', 'account_offline_id', { unique: false });
      }

      // Pagos locales
      if (!db.objectStoreNames.contains('payments')) {
        const store = db.createObjectStore('payments', { keyPath: 'offline_id' });
        store.createIndex('by_account', 'account_offline_id', { unique: false });
      }

      // Cola de sincronización FIFO
      if (!db.objectStoreNames.contains('sync_queue')) {
        const store = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('by_status', 'status', { unique: false });
        store.createIndex('by_created_at', 'created_at', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// Helpers genéricos de transacción
async function tx(storeName, mode, callback) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let result;

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(new Error('Transaction aborted'));

    try {
      result = callback(store);
    } catch (err) {
      reject(err);
    }
  });
}

export const offlineDb = {
  // --- METADATA & CACHÉ ---
  async setMetadata(key, value) {
    return tx('metadata', 'readwrite', (store) => {
      store.put({ key, value, updated_at: new Date().toISOString() });
    });
  },

  async getMetadata(key) {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('metadata', 'readonly');
      const store = transaction.objectStore('metadata');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => reject(req.error);
    });
  },

  // --- CATÁLOGO ---
  async saveCatalog(products = [], categories = []) {
    await this.setMetadata('categories', categories);
    await this.setMetadata('last_catalog_sync', new Date().toISOString());

    return tx('catalog', 'readwrite', (store) => {
      store.clear();
      for (const item of products) {
        store.put(item);
      }
    });
  },

  async getCatalog() {
    const db = await getDb();
    const categories = await this.getMetadata('categories') || [];

    const products = await new Promise((resolve, reject) => {
      const transaction = db.transaction('catalog', 'readonly');
      const store = transaction.objectStore('catalog');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    return { products, categories };
  },

  // --- MESAS ---
  async saveTables(tables = []) {
    await this.setMetadata('last_tables_sync', new Date().toISOString());
    return tx('tables', 'readwrite', (store) => {
      store.clear();
      for (const t of tables) {
        store.put(t);
      }
    });
  },

  async getTables() {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('tables', 'readonly');
      const store = transaction.objectStore('tables');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  // --- TURNO ACTIVO ---
  async saveActiveShift(shift) {
    return this.setMetadata('active_shift', shift);
  },

  async getActiveShift() {
    return this.getMetadata('active_shift');
  },

  // --- CUENTAS OFFLINE ---
  async createAccount(accountData) {
    const offlineId = accountData.offline_id || crypto.randomUUID();
    const record = {
      ...accountData,
      offline_id: offlineId,
      status: accountData.status || 'open',
      created_at: accountData.created_at || new Date().toISOString(),
      items: [],
      payments: [],
      is_offline: true,
    };

    await tx('accounts', 'readwrite', (store) => {
      store.put(record);
    });

    // Encolar acción para sincronizar
    await this.enqueueSync('ACCOUNT_OPEN', record);
    return record;
  },

  async getAccount(offlineId) {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('accounts', 'readonly');
      const store = transaction.objectStore('accounts');
      const req = store.get(offlineId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async getOpenAccountsByTable(tableId) {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('accounts', 'readonly');
      const store = transaction.objectStore('accounts');
      const index = store.index('by_table');
      const req = index.getAll(Number(tableId));
      req.onsuccess = () => {
        const list = (req.result || []).filter((a) => a.status === 'open');
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  },

  // --- ITEMS / COMANDAS ---
  async addOrderItems(accountOfflineId, items = []) {
    const db = await getDb();
    const createdItems = [];

    await new Promise((resolve, reject) => {
      const transaction = db.transaction(['order_items', 'accounts'], 'readwrite');
      const itemStore = transaction.objectStore('order_items');
      const accStore = transaction.objectStore('accounts');

      const accReq = accStore.get(accountOfflineId);
      accReq.onsuccess = () => {
        const account = accReq.result;
        if (!account) return reject(new Error('Cuenta local no encontrada'));

        account.items = account.items || [];
        for (const item of items) {
          const itemRecord = {
            ...item,
            offline_id: item.offline_id || crypto.randomUUID(),
            account_offline_id: accountOfflineId,
            created_at: new Date().toISOString(),
          };
          itemStore.put(itemRecord);
          account.items.push(itemRecord);
          createdItems.push(itemRecord);
        }

        accStore.put(account);
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    await this.enqueueSync('ORDER_ITEMS_ADD', {
      account_offline_id: accountOfflineId,
      items: createdItems,
    });

    return createdItems;
  },

  // --- PAGOS Y CIERRE ---
  async recordPayment(accountOfflineId, paymentData) {
    const db = await getDb();
    const paymentRecord = {
      ...paymentData,
      offline_id: paymentData.offline_id || crypto.randomUUID(),
      account_offline_id: accountOfflineId,
      created_at: new Date().toISOString(),
    };

    await new Promise((resolve, reject) => {
      const transaction = db.transaction(['payments', 'accounts'], 'readwrite');
      const payStore = transaction.objectStore('payments');
      const accStore = transaction.objectStore('accounts');

      const accReq = accStore.get(accountOfflineId);
      accReq.onsuccess = () => {
        const account = accReq.result;
        if (!account) return reject(new Error('Cuenta local no encontrada'));

        account.payments = account.payments || [];
        account.payments.push(paymentRecord);
        account.status = 'closed';
        account.closed_at = new Date().toISOString();

        payStore.put(paymentRecord);
        accStore.put(account);
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    await this.enqueueSync('ACCOUNT_PAY_CLOSE', {
      account_offline_id: accountOfflineId,
      payment: paymentRecord,
    });

    return paymentRecord;
  },

  // --- COLA DE SINCRONIZACIÓN (SYNC QUEUE) ---
  async enqueueSync(action, payload) {
    return tx('sync_queue', 'readwrite', (store) => {
      store.add({
        action,
        payload,
        status: 'pending',
        retry_count: 0,
        error_message: null,
        created_at: new Date().toISOString(),
      });
    });
  },

  async getPendingQueue() {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readonly');
      const store = transaction.objectStore('sync_queue');
      const index = store.index('by_status');
      const req = index.getAll('pending');
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async getQueueCount() {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readonly');
      const store = transaction.objectStore('sync_queue');
      const index = store.index('by_status');
      const req = index.count('pending');
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  },

  async markQueueItem(id, status, errorMessage = null) {
    return tx('sync_queue', 'readwrite', (store) => {
      const req = store.get(id);
      req.onsuccess = () => {
        const item = req.result;
        if (!item) return;
        item.status = status;
        item.updated_at = new Date().toISOString();
        if (errorMessage) {
          item.error_message = errorMessage;
          item.retry_count = (item.retry_count || 0) + 1;
        }
        store.put(item);
      };
    });
  },

  async clearSyncedQueue() {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const index = store.index('by_status');
      const req = index.openCursor('synced');

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  },
};
