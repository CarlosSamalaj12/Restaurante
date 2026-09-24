import { tokenStorage } from './lib/tokenStorage';
import { getOrCreateSerial } from './lib/terminalSerial';

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
    // Auto-logout on session expired
    tokenStorage.clearAll();
    window.location.href = '/login';
    return;
  }
  // Licencia revocada/vencida → forzar pantalla de bloqueo vía reload.
  if (response.status === 403) {
    const data = await response.json().catch(() => null);
    if (data?.code && String(data.code).startsWith('LICENSE_')) {
      // El componente LicenseBlock en App.jsx se va a enterar en su próximo
      // heartbeat. Pero podemos forzar un reload para que arranque limpio.
      // No hacemos window.location.reload() directo para evitar loops —
      // dejamos que el useLicense hook re-evalúe en su próximo tick.
    }
  }
  const data = await response.json().catch(() => null);

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
  getTables: (centerId) => request(`/tables${centerId ? `?centerId=${centerId}` : ''}`),
  getAccounts: (tableId) => request(`/tables/${tableId}/accounts`),
  createAccount: (tableId, data) => request(`/tables/${tableId}/accounts`, {
    method: 'POST',
    body: data,
  }),
  deleteAccount: (accountId) => request(`/accounts/${accountId}`, {
    method: 'DELETE',
  }),

  // Account details
  getAccount: (accountId) => request(`/accounts/${accountId}`),
  getAccountByCheck: (checkNumber) => request(`/accounts/by-check/${checkNumber}`),
  getOpenAccounts: (centerId) => request(`/accounts/open${centerId ? `?centerId=${centerId}` : ''}`),
  joinAccounts: (targetAccountId, sourceAccountId) => request(`/accounts/${targetAccountId}/join-with`, {
    method: 'POST',
    body: { sourceAccountId },
  }),
  printPrecheck: (accountId) => request(`/accounts/${accountId}/precheck`, { method: 'POST' }),

  // Products catalog
  getProducts: (categoryId, centerId) => {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    if (centerId) params.append('centerId', centerId);
    return request(`/catalog/products?${params}`);
  },
  getModifierTemplates: () => request('/modifier-templates'),
  getCategories: (centerId) => request(`/catalog/categories${centerId ? `?centerId=${centerId}` : ''}`),
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
  updateProductProductionCenters: (productId, centerIds) => request(`/settings/products/${productId}/production-centers`, {
    method: 'POST',
    body: { centerIds },
  }),

  // Items
  addItem: (accountId, data) => request(`/accounts/${accountId}/items`, {
    method: 'POST',
    body: data,
  }),
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

  // Send order
  sendOrder: (accountId) => request(`/accounts/${accountId}/send`, {
    method: 'POST',
  }),

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
  closeAccount: (accountId) => request(`/accounts/${accountId}/close`, {
    method: 'POST',
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
  pay: (accountId, data) => request(`/accounts/${accountId}/payments`, {
    method: 'POST',
    body: data,
  }),

  // Reprint / Search
  searchPaidAccounts: (q, centerId, startDate, endDate) => {
    let url = `/accounts/paid/search?q=${encodeURIComponent(q)}&centerId=${centerId}`;
    if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;
    return request(url);
  },
  getAccountReceipt: (accountId) => request(`/accounts/${accountId}/receipt`),

  // Shifts
  checkActiveShift: (centerId) => request(`/shifts/active?centerId=${centerId}`),
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
  },
  roles: {
    list: () => request('/settings/roles'),
    create: (data) => request('/settings/roles', { method: 'POST', body: data }),
    update: (roleId, data) => request(`/settings/roles/${roleId}`, { method: 'PUT', body: data }),
    delete: (roleId) => request(`/settings/roles/${roleId}`, { method: 'DELETE' }),
    setPermissions: (roleId, permissionIds) => request(`/settings/roles/${roleId}/permissions`, { method: 'POST', body: { permissionIds } }),
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
    getOrders: (centerId) => {
      const params = new URLSearchParams();
      if (centerId) params.append('centerId', centerId);
      return request(`/kds/orders?${params}`);
    },
    getOrdersWithVoided: (centerId) => {
      const params = new URLSearchParams();
      if (centerId) params.append('centerId', centerId);
      return request(`/kds/orders-with-voided?${params}`);
    },
    getProductionCenters: () => request('/kds/production-centers'),
    markItemDone: (itemId) => request(`/kds/items/${itemId}/done`, { method: 'POST' }),
    markAccountDone: (accountId) => request(`/kds/accounts/${accountId}/done-all`, { method: 'POST' }),
    getCompleted: (centerId, limit = 50) => {
      const params = new URLSearchParams({ limit });
      if (centerId) params.append('centerId', centerId);
      return request(`/kds/completed?${params}`);
    },
    getVoided: (centerId, limit = 20) => {
      const params = new URLSearchParams({ limit });
      if (centerId) params.append('centerId', centerId);
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

  // ───────── Licencias (admin) ─────────
  // Usados por LicensesTab. Solo visibles para role=admin (protegido server-side).
  licenses: {
    list: () => request('/admin/licenses'),
    create: (data) => request('/admin/licenses', { method: 'POST', body: data }),
    revoke: (id, reason) => request(`/admin/licenses/${id}/revoke`, { method: 'POST', body: reason ? { reason } : undefined }),
  },
  licenseTerminals: {
    list: (status) => request(`/admin/terminals${status ? `?status=${status}` : ''}`),
    approve: (id, label) => request(`/admin/terminals/${id}/approve`, { method: 'POST', body: label ? { label } : undefined }),
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
};

export default api;
