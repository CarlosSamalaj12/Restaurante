import { tokenStorage } from './lib/tokenStorage';
import { getOrCreateSerial } from './lib/terminalSerial';
import { offlineDb } from './lib/offlineDb';
import {
  generateOfflineCheckNumber,
  generateOfflineReceiptNumber,
  getTerminalCode,
} from './lib/offlineCorrelatives';

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = tokenStorage.getToken();
  const serial = getOrCreateSerial();
  const config = {
    credentials: 'include', // listo para migración a cookie httpOnly sin tocar la app
    headers: {
      'Content-Type': 'application/json',
      'X-Terminal-Serial': serial, // licencia: cada request lleva el serial de la terminal
      ...(token && { 'X-Auth-Token': token }),
      ...options.headers,
    },
    ...options,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);
  // Validación de status antes de parsear — react-doctor pide esto.
  if (response.status === 401) {
    // Auto-logout on session expired without reloading the page in a loop
    tokenStorage.clearAll();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      if (window.location.pathname !== '/' && window.location.pathname !== '') {
        window.history.replaceState({}, '', '/');
      }
    }
    return;
  }
  const data = await response.json().catch(() => null);

  // Licencia revocada/vencida → notificar inmediatamente a useLicense para bloquear pantalla
  if (response.status === 403 && data?.code && String(data.code).startsWith('LICENSE_')) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('license:blocked', { detail: data }));
    }
  }

  // Modo Mantenimiento activo → notificar inmediatamente a useMaintenance
  if (response.status === 503 && (data?.code === 'MAINTENANCE_MODE' || data?.maintenance)) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('system:maintenance_active', { detail: data }));
    }
  }

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || `Error ${response.status}`);
    error.status = response.status;
    error.data = data;
    error.code = data?.code;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (pin) => request('/auth/pin-login', {
    method: 'POST',
    body: { pin },
  }),

  // Bootstrap data
  bootstrap: () => request('/bootstrap'),

  // Settings (admin)
  getSettings: () => request('/settings'),

  // Tables
  getTables: async (centerId) => {
    if (!navigator.onLine) {
      return (await offlineDb.getTables()) || [];
    }
    try {
      const data = await request(`/tables${centerId ? `?centerId=${centerId}` : ''}`);
      if (Array.isArray(data)) {
        offlineDb.saveTables(data).catch(() => {});
      } else if (data?.tables) {
        offlineDb.saveTables(data.tables).catch(() => {});
      }
      return data;
    } catch (err) {
      const local = await offlineDb.getTables().catch(() => []);
      if (local && local.length) return local;
      throw err;
    }
  },
  getAccounts: async (tableId) => {
    if (!navigator.onLine) {
      return (await offlineDb.getOpenAccountsByTable(tableId)) || [];
    }
    try {
      return await request(`/tables/${tableId}/accounts`);
    } catch (err) {
      const local = await offlineDb.getOpenAccountsByTable(tableId).catch(() => []);
      if (local) return local;
      throw err;
    }
  },
  createAccount: async (tableId, data) => {
    if (!navigator.onLine) {
      const checkNumber = generateOfflineCheckNumber();
      const offlineId = crypto.randomUUID();
      const record = await offlineDb.createAccount({
        offline_id: offlineId,
        table_id: tableId,
        waiter_id: data?.waiterId || data?.waiter_id || 1,
        guest_count: data?.guestCount || data?.guest_count || 1,
        operation_center_id: data?.centerId || data?.center_id || null,
        check_number: checkNumber,
        terminal_code: getTerminalCode(),
      });
      return {
        id: offlineId,
        accountId: offlineId,
        checkNumber,
        check_number: checkNumber,
        is_offline: true,
      };
    }
    try {
      return await request(`/tables/${tableId}/accounts`, {
        method: 'POST',
        body: data,
      });
    } catch (err) {
      if (!navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('Sin conexión')) {
        const checkNumber = generateOfflineCheckNumber();
        const offlineId = crypto.randomUUID();
        await offlineDb.createAccount({
          offline_id: offlineId,
          table_id: tableId,
          waiter_id: data?.waiterId || data?.waiter_id || 1,
          guest_count: data?.guestCount || data?.guest_count || 1,
          operation_center_id: data?.centerId || data?.center_id || null,
          check_number: checkNumber,
          terminal_code: getTerminalCode(),
        });
        return {
          id: offlineId,
          accountId: offlineId,
          checkNumber,
          check_number: checkNumber,
          is_offline: true,
        };
      }
      throw err;
    }
  },
  deleteAccount: (accountId) => request(`/accounts/${accountId}`, {
    method: 'DELETE',
  }),

  // Account details
  getAccount: async (accountId) => {
    if (!navigator.onLine || String(accountId).includes('-')) {
      const local = await offlineDb.getAccount(accountId);
      if (local) {
        const items = local.items || [];
        const payments = local.payments || [];
        const subtotal = items.reduce((sum, i) => sum + Number(i.line_total || (i.qty * i.unit_price) || 0), 0);
        return {
          account: local,
          items,
          payments,
          totals: {
            subtotal,
            total: subtotal,
            balance: local.status === 'closed' ? 0 : subtotal,
          },
        };
      }
    }
    try {
      return await request(`/accounts/${accountId}`);
    } catch (err) {
      const local = await offlineDb.getAccount(accountId);
      if (local) {
        const items = local.items || [];
        const payments = local.payments || [];
        const subtotal = items.reduce((sum, i) => sum + Number(i.line_total || (i.qty * i.unit_price) || 0), 0);
        return {
          account: local,
          items,
          payments,
          totals: { subtotal, total: subtotal, balance: local.status === 'closed' ? 0 : subtotal },
        };
      }
      throw err;
    }
  },
  getAccountByCheck: (checkNumber) => request(`/accounts/by-check/${checkNumber}`),
  getOpenAccounts: (centerId) => request(`/accounts/open${centerId ? `?centerId=${centerId}` : ''}`),
  printPrecheck: (accountId) => request(`/accounts/${accountId}/precheck`, { method: 'POST' }),

  // Products catalog
  getProducts: async (categoryId, centerId) => {
    if (!navigator.onLine) {
      const { products } = await offlineDb.getCatalog();
      if (categoryId) {
        return products.filter((p) => String(p.category_id) === String(categoryId));
      }
      return products || [];
    }
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    if (centerId) params.append('centerId', centerId);
    try {
      const prods = await request(`/catalog/products?${params}`);
      return prods;
    } catch (err) {
      const { products } = await offlineDb.getCatalog().catch(() => ({ products: [] }));
      if (products?.length) {
        if (categoryId) return products.filter((p) => String(p.category_id) === String(categoryId));
        return products;
      }
      throw err;
    }
  },
  getModifierTemplates: () => request('/modifier-templates'),
  getCategories: async (centerId) => {
    if (!navigator.onLine) {
      const { categories } = await offlineDb.getCatalog();
      return categories || [];
    }
    try {
      const cats = await request(`/catalog/categories${centerId ? `?centerId=${centerId}` : ''}`);
      return cats;
    } catch (err) {
      const { categories } = await offlineDb.getCatalog().catch(() => ({ categories: [] }));
      if (categories?.length) return categories;
      throw err;
    }
  },
  getCatalog: async (centerId) => {
    const [products, categories] = await Promise.all([
      api.getProducts(null, centerId).catch(() => []),
      api.getCategories(centerId).catch(() => []),
    ]);
    return { products: products || [], categories: categories || [] };
  },
  getConfigData: () => request('/config/data'),

  // Production Centers
  getProductionCenters: () => request('/settings/production-centers'),
  createProductionCenter: (data) => request('/settings/production-centers', {
    method: 'POST',
    body: data,
  }),
  updateProductionCenter: (centerId, data) => request(`/settings/production-centers/${centerId}`, {
    method: 'POST',
    body: data,
  }),
  deleteProductionCenter: (centerId) => request(`/settings/production-centers/${centerId}`, {
    method: 'DELETE',
  }),

  // Printers
  testPrint: (type, id) => request('/settings/printers/test', {
    method: 'POST',
    body: { type, id },
  }),
  getPrintJobs: (limit = 50) => request(`/settings/printers/recent?limit=${limit}`),
  getPrintServiceStatus: () => request('/settings/printers/status'),
  getPrinterRoutingMode: () => request('/settings/printers/mode'),
  setPrinterRoutingMode: (mode) => request('/settings/printers/mode', { method: 'PUT', body: { mode } }),
  getPrinters: () => request('/settings/printers'),
  createPrinter: (data) => request('/settings/printers', { method: 'POST', body: data }),
  updatePrinter: (printerId, data) => request(`/settings/printers/${printerId}`, { method: 'PUT', body: data }),
  deletePrinter: (printerId) => request(`/settings/printers/${printerId}`, { method: 'DELETE' }),
  testPrinterDirect: (printerId) => request(`/settings/printers/${printerId}/test`, { method: 'POST' }),
  auditPrinters: () => request('/settings/printers/audit'),
  updateProductProductionCenters: (productId, centerIds) => request(`/settings/products/${productId}/production-centers`, {
    method: 'POST',
    body: { centerIds },
  }),
  createTerminal: (data) => request('/settings/terminals', { method: 'POST', body: data }),
  updateTerminal: (terminalId, data) => request(`/settings/terminals/${terminalId}`, { method: 'POST', body: data }),
  deleteTerminal: (terminalId) => request(`/settings/terminals/${terminalId}`, { method: 'DELETE' }),

  // Items
  addItem: async (accountId, data) => {
    if (!navigator.onLine || String(accountId).includes('-')) {
      const items = await offlineDb.addOrderItems(accountId, [data]);
      return { success: true, item: items[0], is_offline: true };
    }
    try {
      return await request(`/accounts/${accountId}/items`, {
        method: 'POST',
        body: data,
      });
    } catch (err) {
      if (!navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('Sin conexión')) {
        const items = await offlineDb.addOrderItems(accountId, [data]);
        return { success: true, item: items[0], is_offline: true };
      }
      throw err;
    }
  },
  voidItem: (itemId, data) => request(`/items/${itemId}/void`, {
    method: 'POST',
    body: data,
  }),
  moveItemSeat: (itemId, newSeatNo) => request(`/items/${itemId}/move-seat`, {
    method: 'POST',
    body: { newSeatNo },
  }),
  updateItemQty: (itemId, qty) => request(`/items/${itemId}/qty`, {
    method: 'POST',
    body: { qty },
  }),
  updateItemNotes: (itemId, notes) => request(`/items/${itemId}/notes`, {
    method: 'POST',
    body: { notes },
  }),

  // Send order
  sendOrder: async (accountId) => {
    if (!navigator.onLine || String(accountId).includes('-')) {
      return { ok: true, is_offline: true };
    }
    try {
      return await request(`/accounts/${accountId}/send`, {
        method: 'POST',
      });
    } catch (err) {
      if (!navigator.onLine || err.message?.includes('Failed to fetch')) {
        return { ok: true, is_offline: true };
      }
      throw err;
    }
  },

  // Account actions
  removeTip: (accountId) => request(`/accounts/${accountId}/remove-tip`, {
    method: 'POST',
  }),
  restoreTip: (accountId) => request(`/accounts/${accountId}/restore-tip`, {
    method: 'POST',
  }),
  addDiscount: (accountId, data) => request(`/accounts/${accountId}/discounts`, {
    method: 'POST',
    body: data,
  }),
  closeAccount: (accountId, authPin = null) => request(`/accounts/${accountId}/close`, {
    method: 'POST',
    body: authPin ? { authPin } : undefined,
  }),
  deleteAccount: (accountId, authPin = null) => request(`/accounts/${accountId}`, {
    method: 'DELETE',
    body: authPin ? { authPin } : undefined,
  }),
  reopenAccount: (accountId, reason = '', authPin = null) => request(`/accounts/${accountId}/reopen`, {
    method: 'POST',
    body: { reason, authPin },
  }),
  changePaymentMethod: (accountId, data) => request(`/accounts/${accountId}/change-payment-method`, {
    method: 'POST',
    body: data,
  }),

  // Move/Transfer
  transferSeat: (accountId, seatNo, toAccountId) => request(`/accounts/${accountId}/transfer-seat`, {
    method: 'POST',
    body: { seatNo, toAccountId },
  }),
  moveItem: (accountId, itemId, toAccountId, qty) => request(`/accounts/${accountId}/move-item`, {
    method: 'POST',
    body: { itemId, toAccountId, qty },
  }),
  splitEqual: (accountId, targetAccountIds) => request(`/accounts/${accountId}/split-equal`, {
    method: 'POST',
    body: { targetAccountIds },
  }),
  splitCustom: (accountId, data) => request(`/accounts/${accountId}/split-custom`, {
    method: 'POST',
    body: data,
  }),
  splitShared: (accountId, data) => request(`/accounts/${accountId}/split-shared`, {
    method: 'POST',
    body: data,
  }),
  transferAccount: (sourceAccountId, targetAccountId) => request(`/accounts/${sourceAccountId}/transfer-account`, {
    method: 'POST',
    body: { targetAccountId },
  }),
  joinAccounts: (targetAccountId, sourceAccountId) => request(`/accounts/${targetAccountId}/join-with`, {
    method: 'POST',
    body: { sourceAccountId },
  }),

  // Payments
  pay: async (accountId, data) => {
    if (!navigator.onLine || String(accountId).includes('-')) {
      const receiptNo = generateOfflineReceiptNumber();
      const payment = await offlineDb.recordPayment(accountId, {
        payment_method: data?.method || 'cash',
        amount: data?.amount,
        reference_no: data?.referenceNo || receiptNo,
        fel_pending_nit: data?.felNit || null,
        fel_pending_name: data?.felName || null,
      });
      return { success: true, payment, receiptNo, is_offline: true };
    }
    try {
      return await request(`/accounts/${accountId}/payments`, {
        method: 'POST',
        body: data,
      });
    } catch (err) {
      if (!navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('Sin conexión')) {
        const receiptNo = generateOfflineReceiptNumber();
        const payment = await offlineDb.recordPayment(accountId, {
          payment_method: data?.method || 'cash',
          amount: data?.amount,
          reference_no: data?.referenceNo || receiptNo,
          fel_pending_nit: data?.felNit || null,
          fel_pending_name: data?.felName || null,
        });
        return { success: true, payment, receiptNo, is_offline: true };
      }
      throw err;
    }
  },
  deleteAccountPayment: (accountId, paymentId) => request(`/accounts/${accountId}/payments/${paymentId}`, {
    method: 'DELETE',
  }),

  // Reprint / Search
  searchPaidAccounts: (q, centerId, startDate, endDate, status, areaId) => {
    let url = `/accounts/paid/search?centerId=${centerId}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    if (areaId) url += `&areaId=${encodeURIComponent(areaId)}`;
    return request(url);
  },
  getAccountReceipt: (accountId) => request(`/accounts/${accountId}/receipt`),

  // Shifts
  checkActiveShift: async (centerId = 1) => {
    const cid = centerId || 1;
    if (!navigator.onLine) {
      const cached = await offlineDb.getActiveShift();
      return cached || { active: false, shift: null };
    }
    try {
      const shift = await request(`/shifts/active?centerId=${cid}`);
      if (shift) offlineDb.saveActiveShift(shift).catch(() => {});
      return shift;
    } catch (err) {
      const cached = await offlineDb.getActiveShift().catch(() => null);
      if (cached) return cached;
      throw err;
    }
  },
  getActiveShift: (centerId = 1) => api.checkActiveShift(centerId),
  previewShift: (centerId, closingCash) => request(`/shifts/preview?centerId=${centerId}${closingCash !== undefined ? '&closingCash=' + closingCash : ''}`),
  openShift: (data) => request('/shifts/open', {
    method: 'POST',
    body: data,
  }),
  closeShift: (data) => request('/shifts/close', {
    method: 'POST',
    body: data,
  }),
  getClosedShifts: (centerId, limit = 20) => request(`/shifts/closed?centerId=${centerId}&limit=${limit}`),
  getShiftReport: (shiftId) => request(`/shifts/${shiftId}/report`),
  addShiftExpense: (data) => request('/shifts/expenses', {
    method: 'POST',
    body: data,
  }),
  deleteShiftExpense: (expenseId, data) => request(`/shifts/expenses/${expenseId}`, {
    method: 'DELETE',
    body: data,
  }),

  // Reports
  getVoidedItems: () => request('/reports/voided-items'),
  getWaiterTips: (params) => {
    const q = new URLSearchParams();
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.waiterId) q.set('waiterId', params.waiterId);
    if (params?.centerId) q.set('centerId', params.centerId);
    return request(`/reports/waiter-tips?${q.toString()}`);
  },
  getAccountTrace: (accountId) => request(`/reports/account-trace/${accountId}`),
  getProductSales: (params) => {
    const q = new URLSearchParams();
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.centerId) q.set('centerId', params.centerId);
    if (params?.categoryId) q.set('categoryId', params.categoryId);
    if (params?.productName) q.set('productName', params.productName);
    return request(`/reports/product-sales?${q.toString()}`);
  },
  getSalesByPaymentMethod: (params) => {
    const q = new URLSearchParams();
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.centerId) q.set('centerId', params.centerId);
    if (params?.method) q.set('method', params.method);
    return request(`/reports/sales-by-payment-method?${q.toString()}`);
  },
  getSalesByCenter: (params) => {
    const q = new URLSearchParams();
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.centerId) q.set('centerId', params.centerId);
    if (params?.productName) q.set('productName', params.productName);
    if (params?.productIds?.length) q.set('productIds', params.productIds.join(','));
    return request(`/reports/sales-by-center?${q.toString()}`);
  },
  getSalesByUser: (params) => {
    const q = new URLSearchParams();
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.centerId) q.set('centerId', params.centerId);
    if (params?.categoryId) q.set('categoryId', params.categoryId);
    if (params?.productName) q.set('productName', params.productName);
    if (params?.productIds?.length) q.set('productIds', params.productIds.join(','));
    if (params?.userIds?.length) q.set('userIds', params.userIds.join(','));
    return request(`/reports/sales-by-user?${q.toString()}`);
  },

  // CXC - Cuentas por Cobrar
  cxc: {
    getAreas: () => request('/cxc/areas'),
    createArea: (data) => request('/cxc/areas', { method: 'POST', body: data }),
    updateArea: (areaId, data) => request(`/cxc/areas/${areaId}`, { method: 'PUT', body: data }),
    deleteArea: (areaId) => request(`/cxc/areas/${areaId}`, { method: 'DELETE' }),
    getClients: () => request('/cxc/clients'),
    createClient: (data) => request('/cxc/clients', { method: 'POST', body: data }),
    updateClient: (clientId, data) => request(`/cxc/clients/${clientId}`, { method: 'PUT', body: data }),
    getClientCategories: (clientId) => request(`/cxc/clients/${clientId}/categories`),
    addClientCategory: (clientId, data) => request(`/cxc/clients/${clientId}/categories`, { method: 'POST', body: data }),
    removeClientCategory: (clientId, categoryId) => request(`/cxc/clients/${clientId}/categories/${categoryId}`, { method: 'DELETE' }),
    getCategories: () => request('/cxc/categories'),
    getPending: () => request('/cxc/pending'),
    getAccount: (cxcAccountId) => request(`/cxc/accounts/${cxcAccountId}`),
    getClientAccounts: (clientId) => request(`/cxc/clients/${clientId}/accounts`),
    createAccount: (data) => request('/cxc/accounts', { method: 'POST', body: data }),
    payAccount: (cxcAccountId, data) => request(`/cxc/accounts/${cxcAccountId}/payments`, { method: 'POST', body: data }),
    payGlobal: (clientId, data) => request(`/cxc/clients/${clientId}/pay-global`, { method: 'POST', body: data }),
    getStatement: (clientId, params) => {
      const qs = params ? new URLSearchParams(params).toString() : '';
      return request(`/cxc/clients/${clientId}/statement${qs ? '?' + qs : ''}`);
    },
    exportStatement: (clientId, params) => {
      const qs = params ? new URLSearchParams(params).toString() : '';
      return `/cxc/export-statement/${clientId}${qs ? '?' + qs : ''}`;
    },
    checkDiscount: (clientId, productId) => request(`/cxc/check-discount?client_id=${clientId}&product_id=${productId}`),
    getPendingSummary: (params) => {
      const qs = params ? new URLSearchParams(params).toString() : '';
      return request(`/cxc/pending-summary${qs ? '?' + qs : ''}`);
    },
    exportPendingSummary: (params) => {
      const qs = params ? new URLSearchParams(params).toString() : '';
      return `/cxc/export-pending-summary${qs ? '?' + qs : ''}`;
    },
  },

  // Hotel PMS - Property Management System
  pms: {
    getConfig: () => request('/pms/config'),
    updateConfig: (data) => request('/pms/config', { method: 'PUT', body: data }),
    lookupRoom: (query) => request(`/pms/rooms/lookup${query ? `?query=${encodeURIComponent(query)}` : ''}`),
    postCharge: (data) => request('/pms/charges', { method: 'POST', body: data }),
    reverseCharge: (transactionId, data) => request(`/pms/charges/${transactionId}/reverse`, { method: 'POST', body: data }),
    testConnection: () => request('/pms/test-connection', { method: 'POST' }),
    getHistory: (limit = 25) => request(`/pms/history?limit=${limit}`),
  },

  // Settings endpoints
  settings: {
    updateBranding: (restaurantName) => request('/settings/branding', {
      method: 'POST',
      body: { restaurantName },
    }),
    uploadLogo: (logoData) => request('/settings/logo', {
      method: 'POST',
      body: { logoData },
    }),
    uploadLoginBg: (bgData) => request('/settings/login-bg', {
      method: 'POST',
      body: { bgData },
    }),
    uploadReceiptLogo: (logoData) => request('/settings/receipt-logo', {
      method: 'POST',
      body: { logoData },
    }),
    getBusinessProfile: () => request('/settings/business-profile'),
    updateBusinessProfile: (data) => request('/settings/business-profile', {
      method: 'POST',
      body: data,
    }),
    updateTipConfig: (tipPercent) => request('/settings/tip-config', {
      method: 'POST',
      body: { tipPercent },
    }),
    updateUserModules: (userId, moduleCodes) => request('/settings/user-modules', {
      method: 'POST',
      body: { userId, moduleCodes },
    }),
    updateDeviceModules: (ipAddress, moduleCodes) => request('/settings/device-modules', {
      method: 'POST',
      body: { ipAddress, moduleCodes },
    }),
    createTable: (data) => request('/settings/tables', { method: 'POST', body: data }),
    updateTable: (tableId, data) => request(`/settings/tables/${tableId}`, { method: 'POST', body: data }),
    deleteTable: (tableId) => request(`/settings/tables/${tableId}`, { method: 'DELETE' }),
    createCategory: (data) => request('/settings/categories', { method: 'POST', body: data }),
    updateCategory: (categoryId, data) => request(`/settings/categories/${categoryId}`, { method: 'POST', body: data }),
    reorderCategories: (order) => request('/settings/categories/reorder', { method: 'POST', body: { order } }),
    createArea: (data) => request('/settings/areas', { method: 'POST', body: data }),
    updateArea: (areaId, data) => request(`/settings/areas/${areaId}`, { method: 'POST', body: data }),
    createOperationCenter: (data) => request('/settings/operation-centers', { method: 'POST', body: data }),
    updateOperationCenter: (centerId, data) => request(`/settings/operation-centers/${centerId}`, { method: 'POST', body: data }),
    getCenterUsage: (centerId) => request(`/settings/operation-centers/${centerId}/usage`),
    setCenterProducts: (centerId, productId, isEnabled) => request(`/settings/operation-centers/${centerId}/products`, {
      method: 'POST',
      body: { productId, isEnabled },
    }),
    bindTerminal: (centerId, ipAddress, label) => request('/settings/terminal-binding', {
      method: 'POST',
      body: { centerId, ipAddress, label },
    }),
    createProduct: (data) => request('/settings/products', { method: 'POST', body: data }),
    updateProduct: (productId, data) => request(`/settings/products/${productId}`, { method: 'POST', body: data }),
    createProductComplete: (data) => request('/settings/products-complete', { method: 'POST', body: data }),
    getPaymentMethods: () => request('/settings/payment-methods'),
    createPaymentMethod: (data) => request('/settings/payment-methods', { method: 'POST', body: data }),
    savePaymentMethod: (data) => request('/settings/payment-methods', { method: 'POST', body: data }),
    updatePaymentMethod: (data) => request('/settings/payment-methods', { method: 'POST', body: data }),
    deletePaymentMethod: (code) => request(`/settings/payment-methods/${encodeURIComponent(code)}`, { method: 'DELETE' }),
    createModifierGroup: (data) => request('/settings/modifier-groups', { method: 'POST', body: data }),
    updateModifierGroup: (groupId, data) => request(`/settings/modifier-groups/${groupId}`, { method: 'POST', body: data }),
    deleteModifierGroup: (groupId) => request(`/settings/modifier-groups/${groupId}`, { method: 'DELETE' }),
    addModifierOption: (groupId, data) => request(`/settings/modifier-groups/${groupId}/options`, { method: 'POST', body: data }),
    updateModifierOption: (optionId, data) => request(`/settings/modifier-options/${optionId}`, { method: 'POST', body: data }),
    deleteModifierOption: (optionId) => request(`/settings/modifier-options/${optionId}`, { method: 'DELETE' }),
    setProductSteps: (productId, groupId, sortOrder) => request('/settings/product-steps', {
      method: 'POST',
      body: { productId, groupId, sortOrder },
    }),
    removeProductModifierGroup: (productId, groupId) => request(`/settings/product-steps/${productId}/${groupId}`, {
      method: 'DELETE',
    }),
    clearProductModifierGroups: (productId) => request(`/settings/product-steps/${productId}`, {
      method: 'DELETE',
    }),
    createDiscountPreset: (data) => request('/settings/discount-presets', { method: 'POST', body: data }),
    getTipExcludedMethods: () => request('/settings/tip-excluded-methods'),
    setTipExcludedMethods: (data) => request('/settings/tip-excluded-methods', { method: 'POST', body: data }),
    updateDiscountPreset: (presetId, data) => request(`/settings/discount-presets/${presetId}`, { method: 'POST', body: data }),
    createStaffUser: (data) => request('/settings/staff-users', { method: 'POST', body: data }),
    updateStaffUser: (userId, data) => request(`/settings/staff-users/${userId}`, { method: 'PUT', body: data }),
    deleteStaffUser: (userId) => request(`/settings/staff-users/${userId}`, { method: 'DELETE' }),
    updateStaffUserCenter: (userId, centerId) => request(`/settings/staff-users/${userId}/center`, { method: 'POST', body: { operationCenterId: centerId } }),
    createTerminal: (data) => request('/settings/terminals', { method: 'POST', body: data }),
    updateTerminal: (terminalId, data) => request(`/settings/terminals/${terminalId}`, { method: 'POST', body: data }),
    deleteTerminal: (terminalId) => request(`/settings/terminals/${terminalId}`, { method: 'DELETE' }),
    deleteProduct: (productId) => request(`/settings/products/${productId}`, { method: 'DELETE' }),
    deleteCategory: (categoryId) => request(`/settings/categories/${categoryId}`, { method: 'DELETE' }),
    deleteCenter: (centerId) => request(`/settings/operation-centers/${centerId}`, { method: 'DELETE' }),
    getRoutingMatrix: () => request('/settings/routing-matrix'),
    saveRoutingRule: (data) => request('/settings/routing-matrix', { method: 'POST', body: data }),
    deleteRoutingRule: (data) => request('/settings/routing-matrix', { method: 'DELETE', body: data }),
    getPrintCategories: () => request('/settings/print-categories'),
    createPrintCategory: (data) => request('/settings/print-categories', { method: 'POST', body: data }),
    updatePrintCategory: (id, data) => request(`/settings/print-categories/${id}`, { method: 'PUT', body: data }),
    deletePrintCategory: (id) => request(`/settings/print-categories/${id}`, { method: 'DELETE' }),
    getKitchenNotes: (activeOnly = false) => request(`/settings/kitchen-notes${activeOnly ? '?activeOnly=1' : ''}`),
    createKitchenNote: (data) => request('/settings/kitchen-notes', { method: 'POST', body: data }),
    updateKitchenNote: (id, data) => request(`/settings/kitchen-notes/${id}`, { method: 'PUT', body: data }),
    deleteKitchenNote: (id) => request(`/settings/kitchen-notes/${id}`, { method: 'DELETE' }),
    getPrinters: () => request('/settings/printers'),
    createPrinter: (data) => request('/settings/printers', { method: 'POST', body: data }),
    updatePrinter: (printerId, data) => request(`/settings/printers/${printerId}`, { method: 'PUT', body: data }),
    deletePrinter: (printerId) => request(`/settings/printers/${printerId}`, { method: 'DELETE' }),
    testPrinterDirect: (printerId) => request(`/settings/printers/${printerId}/test`, { method: 'POST' }),
    auditPrinters: () => request('/settings/printers/audit'),
  },
  roles: {
    list: () => request('/settings/roles'),
    create: (data) => request('/settings/roles', { method: 'POST', body: data }),
    update: (roleId, data) => request(`/settings/roles/${roleId}`, { method: 'PUT', body: data }),
    delete: (roleId) => request(`/settings/roles/${roleId}`, { method: 'DELETE' }),
    setPermissions: (roleId, permissionIds, defaultView = null) =>
      request(`/settings/roles/${roleId}/permissions`, { method: 'POST', body: { permissionIds, defaultView } }),
  },
  users: {
    setRoles: (userId, roleIds) => request(`/settings/users/${userId}/roles`, { method: 'POST', body: { roleIds } }),
  },
  refreshSession: () => request('/auth/refresh-session', { method: 'POST' }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  inventory: {
    list: () => request('/inventory/items'),
    create: (data) => request('/inventory/items', { method: 'POST', body: data }),
    update: (id, data) => request(`/inventory/items/${id}`, { method: 'PUT', body: data }),
    remove: (id) => request(`/inventory/items/${id}`, { method: 'DELETE' }),
    movements: (itemId) => request(`/inventory/items/${itemId}/movements`),
    addMovement: (data) => request('/inventory/movements', { method: 'POST', body: data }),
    getRecipe: (productId) => request(`/inventory/products/${productId}/recipe`),
    saveRecipe: (productId, data) => request(`/inventory/products/${productId}/recipe`, { method: 'POST', body: data }),
  },
  
  // KDS - Kitchen Display System
  kds: {
    getMyStation: (params = {}) => {
      const qs = new URLSearchParams();
      if (params.terminalId) qs.append('terminalId', params.terminalId);
      if (params.serial) qs.append('serial', params.serial);
      const queryStr = qs.toString();
      return request(`/kds/my-station${queryStr ? `?${queryStr}` : ''}`);
    },
    getOrders: (centerIdOrFilters) => {
      const params = new URLSearchParams();
      if (typeof centerIdOrFilters === 'object' && centerIdOrFilters !== null) {
        if (centerIdOrFilters.centerId) params.append('centerId', centerIdOrFilters.centerId);
        if (centerIdOrFilters.productionCenterId) params.append('productionCenterId', centerIdOrFilters.productionCenterId);
        if (centerIdOrFilters.operationCenterId) params.append('operationCenterId', centerIdOrFilters.operationCenterId);
      } else if (centerIdOrFilters) {
        params.append('centerId', centerIdOrFilters);
      }
      return request(`/kds/orders?${params}`);
    },
    getOrdersWithVoided: (centerIdOrFilters) => {
      const params = new URLSearchParams();
      if (typeof centerIdOrFilters === 'object' && centerIdOrFilters !== null) {
        if (centerIdOrFilters.centerId) params.append('centerId', centerIdOrFilters.centerId);
        if (centerIdOrFilters.productionCenterId) params.append('productionCenterId', centerIdOrFilters.productionCenterId);
        if (centerIdOrFilters.operationCenterId) params.append('operationCenterId', centerIdOrFilters.operationCenterId);
      } else if (centerIdOrFilters) {
        params.append('centerId', centerIdOrFilters);
      }
      return request(`/kds/orders-with-voided?${params}`);
    },
    getProductionCenters: () => request('/kds/production-centers'),
    markItemDone: (itemId) => request(`/kds/items/${itemId}/done`, { method: 'POST' }),
    markAccountDone: (accountId, productionCenterId) => request(`/kds/accounts/${accountId}/done-all`, {
      method: 'POST',
      body: productionCenterId ? { productionCenterId } : undefined,
    }),
    getCompleted: (centerIdOrFilters, limit = 50) => {
      const params = new URLSearchParams({ limit });
      if (typeof centerIdOrFilters === 'object' && centerIdOrFilters !== null) {
        if (centerIdOrFilters.centerId) params.append('centerId', centerIdOrFilters.centerId);
        if (centerIdOrFilters.productionCenterId) params.append('productionCenterId', centerIdOrFilters.productionCenterId);
        if (centerIdOrFilters.operationCenterId) params.append('operationCenterId', centerIdOrFilters.operationCenterId);
      } else if (centerIdOrFilters) {
        params.append('centerId', centerIdOrFilters);
      }
      return request(`/kds/completed?${params}`);
    },
    getVoided: (centerIdOrFilters, limit = 20) => {
      const params = new URLSearchParams({ limit });
      if (typeof centerIdOrFilters === 'object' && centerIdOrFilters !== null) {
        if (centerIdOrFilters.centerId) params.append('centerId', centerIdOrFilters.centerId);
        if (centerIdOrFilters.productionCenterId) params.append('productionCenterId', centerIdOrFilters.productionCenterId);
        if (centerIdOrFilters.operationCenterId) params.append('operationCenterId', centerIdOrFilters.operationCenterId);
      } else if (centerIdOrFilters) {
        params.append('centerId', centerIdOrFilters);
      }
      return request(`/kds/voided?${params}`);
    },
    getKdsReport: (date, centerId, limit = 100) => {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (centerId) params.append('centerId', centerId);
      params.append('limit', limit);
      return request(`/kds/report?${params}`);
    },
  },

  // ───────── Licencias (terminal & admin) ─────────
  license: {
    requestAccess: (data) => request('/license/request-access', { method: 'POST', body: data }),
  },
  licenses: {
    list: () => request('/admin/licenses'),
    create: (data) => request('/admin/licenses', { method: 'POST', body: data }),
    revoke: (id, reason) => request(`/admin/licenses/${id}/revoke`, { method: 'POST', body: reason ? { reason } : undefined }),
  },
  licenseTerminals: {
    list: (status) => request(`/admin/terminals${status ? `?status=${status}` : ''}`),
    getPendingCount: () => request('/admin/terminals/pending-count'),
    approve: (id, label) => request(`/admin/terminals/${id}/approve`, { method: 'POST', body: label ? { label } : undefined }),
    reject: (id, reason) => request(`/admin/terminals/${id}/reject`, { method: 'POST', body: reason ? { reason } : undefined }),
    update: (id, data) => request(`/admin/terminals/${id}`, { method: 'PUT', body: data }),
    revoke: (id, reason) => request(`/admin/terminals/${id}/revoke`, { method: 'POST', body: reason ? { reason } : undefined }),
    replace: (id) => request(`/admin/terminals/${id}/replace`, { method: 'POST' }),
  },
  licenseAudit: {
    list: (limit = 50) => request(`/admin/license-audit?limit=${limit}`),
  },
  // Bootstrap: el admin mete su PIN en la pantalla de "Esperando aprobación"
  // para auto-aprobar la terminal y obtener sesión de admin en un solo paso.
  // No requiere licencia activa (la propia terminal que se está aprobando
  // no puede tener licencia todavía).
  licenseAdmin: {
    approveSelf: ({ pin, serial }) =>
      request('/license/admin-self-approve', { method: 'POST', body: { pin, serial } }),
  },

  // ───────── Facturación Electrónica FEL (SAT Guatemala) ─────────
  fel: {
    getConfig: () => request('/fel/config'),
    updateConfig: (data) => request('/fel/config', { method: 'PUT', body: data }),
    testConnection: (data) => request('/fel/test-connection', { method: 'POST', body: data }),
    consultarNit: (nit) => request(`/fel/consultar-nit/${encodeURIComponent(nit)}`),
    emitir: (data) => request('/fel/emitir', { method: 'POST', body: data }),
    getAccountInvoice: (accountId) => request(`/fel/account/${accountId}`),
  },

  // ───────── Dashboard Ejecutivo / Analítica en Tiempo Real ─────────
  analytics: {
    getDashboard: (params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.startDate) searchParams.append('startDate', params.startDate);
      if (params.endDate) searchParams.append('endDate', params.endDate);
      if (params.centerId) searchParams.append('centerId', params.centerId);
      if (params.areaId) searchParams.append('areaId', params.areaId);
      if (params.waiterId) searchParams.append('waiterId', params.waiterId);
      if (params.method) searchParams.append('method', params.method);
      if (params.shiftId) searchParams.append('shiftId', params.shiftId);
      const qs = searchParams.toString();
      return request(`/analytics/dashboard${qs ? `?${qs}` : ''}`);
    },
  },

  // ───────── Sincronización Offline en Lote ─────────
  syncBatch: (items, terminalCode = getTerminalCode()) => request('/sync/batch', {
    method: 'POST',
    body: { items, terminalCode },
  }),

  // ───────── Control de Mantenimiento y Versiones ─────────
  maintenance: {
    getStatus: () => request('/maintenance/status'),
    startCountdown: (data) => request('/maintenance/start', { method: 'POST', body: data }),
    abortCountdown: () => request('/maintenance/abort', { method: 'POST' }),
    end: () => request('/maintenance/end', { method: 'POST' }),
    getVersions: () => request('/maintenance/versions'),
    createVersion: (data) => request('/maintenance/versions', { method: 'POST', body: data }),
  },

  // ───────── Gastos, Proveedores y CXP ─────────
  expenses: {
    getExpenses: (params = {}) => {
      const qs = new URLSearchParams();
      if (params.startDate) qs.append('startDate', params.startDate);
      if (params.endDate) qs.append('endDate', params.endDate);
      if (params.categoryId) qs.append('categoryId', params.categoryId);
      if (params.supplierId) qs.append('supplierId', params.supplierId);
      if (params.paymentMethod) qs.append('paymentMethod', params.paymentMethod);
      if (params.status) qs.append('status', params.status);
      if (params.search) qs.append('search', params.search);
      if (params.limit) qs.append('limit', params.limit);
      if (params.offset) qs.append('offset', params.offset);
      const str = qs.toString();
      return request(`/expenses${str ? `?${str}` : ''}`);
    },
    getExpense: (id) => request(`/expenses/${id}`),
    createExpense: (data) => request('/expenses', { method: 'POST', body: data }),
    updateExpense: (id, data) => request(`/expenses/${id}`, { method: 'PUT', body: data }),
    deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
    uploadVoucher: (data) => request('/expenses/upload-voucher', { method: 'POST', body: data }),

    // Categorías
    getCategories: (params = {}) => {
      const qs = params.activeOnly ? '?activeOnly=true' : '';
      return request(`/expenses/categories${qs}`);
    },
    createCategory: (data) => request('/expenses/categories', { method: 'POST', body: data }),
    updateCategory: (id, data) => request(`/expenses/categories/${id}`, { method: 'PUT', body: data }),
    deleteCategory: (id) => request(`/expenses/categories/${id}`, { method: 'DELETE' }),

    // Proveedores & CXP
    getSuppliers: (params = {}) => {
      const qs = new URLSearchParams();
      if (params.search) qs.append('search', params.search);
      if (params.onlyWithDebt) qs.append('onlyWithDebt', 'true');
      const str = qs.toString();
      return request(`/expenses/suppliers${str ? `?${str}` : ''}`);
    },
    getSupplier: (id) => request(`/expenses/suppliers/${id}`),
    createSupplier: (data) => request('/expenses/suppliers', { method: 'POST', body: data }),
    updateSupplier: (id, data) => request(`/expenses/suppliers/${id}`, { method: 'PUT', body: data }),
    deleteSupplier: (id) => request(`/expenses/suppliers/${id}`, { method: 'DELETE' }),
    getSupplierStatement: (id) => request(`/expenses/suppliers/${id}/statement`),
    registerSupplierPayment: (supplierId, data) => request(`/expenses/suppliers/${supplierId}/payments`, { method: 'POST', body: data }),

    // Balance Financiero & Ganancias (P&L)
    getFinancialSummary: (params = {}) => {
      const qs = new URLSearchParams();
      if (params.startDate) qs.append('startDate', params.startDate);
      if (params.endDate) qs.append('endDate', params.endDate);
      if (params.centerId) qs.append('centerId', params.centerId);
      const str = qs.toString();
      return request(`/expenses/financial-summary${str ? `?${str}` : ''}`);
    },
  },

  // ─── Módulo Menú Digital, Auto-Comanda (QR/NFC) y Kiosco ───
  digitalMenu: {
    // Público (Comensales)
    getPublicMenu: (slug = 'default', token = '') =>
      request(`/public/menu/${slug}${token ? `?t=${encodeURIComponent(token)}` : ''}`),
    getProductDetail: (productId) => request(`/public/products/${productId}`),
    bindDeviceSession: (data, token = '') =>
      request(`/public/session/bind${token ? `?t=${encodeURIComponent(token)}` : ''}`, {
        method: 'POST',
        body: data,
      }),
    checkSessionStatus: (sessionToken) => request(`/public/session/${sessionToken}/status`),
    sendGuestOrder: (data, token = '') =>
      request(`/public/orders/send${token ? `?t=${encodeURIComponent(token)}` : ''}`, {
        method: 'POST',
        body: data,
      }),
    callWaiter: (data, token = '') =>
      request(`/public/table/call-waiter${token ? `?t=${encodeURIComponent(token)}` : ''}`, {
        method: 'POST',
        body: data,
      }),
    requestBill: (data, token = '') =>
      request(`/public/table/request-bill${token ? `?t=${encodeURIComponent(token)}` : ''}`, {
        method: 'POST',
        body: data,
      }),
    createReview: (data) => request('/public/reviews', { method: 'POST', body: data }),

    // Administración POS & Superadmin
    getStatus: () => request('/admin/digital-menu/status'),
    toggleModule: (enabled) =>
      request('/admin/digital-menu/toggle', { method: 'POST', body: { enabled } }),
    getMenus: () => request('/admin/digital-menu/menus'),
    createMenu: (data) => request('/admin/digital-menu/menus', { method: 'POST', body: data }),
    updateMenu: (id, data) =>
      request(`/admin/digital-menu/menus/${id}`, { method: 'PUT', body: data }),
    deleteMenu: (id) => request(`/admin/digital-menu/menus/${id}`, { method: 'DELETE' }),
    getTableTokens: (menuId) => request(`/admin/digital-menu/menus/${menuId}/qr-tokens`),
    regenerateQRToken: (tableId, menuId) =>
      request('/admin/digital-menu/regenerate-qr', { method: 'POST', body: { tableId, menuId } }),
    getPromotions: (menuId) => request(`/admin/digital-menu/menus/${menuId}/promotions`),
    createPromotion: (data) =>
      request('/admin/digital-menu/promotions', { method: 'POST', body: data }),
    deletePromotion: (id) => request(`/admin/digital-menu/promotions/${id}`, { method: 'DELETE' }),
    attendWaiterCall: (tableId) =>
      request(`/admin/digital-menu/table/${tableId}/attend-call`, { method: 'POST' }),
    uploadImage: (imageData, type = 'logos') =>
      request('/admin/digital-menu/upload-image', {
        method: 'POST',
        body: { imageData, type },
      }),
    updateProductInfo: (id, data) =>
      request(`/admin/digital-menu/products/${id}`, {
        method: 'PUT',
        body: data,
      }),
  },
};

export default api;
