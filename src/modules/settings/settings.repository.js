// src/modules/settings/settings.repository.js
// Repositorio Facade para configuración global, delegando a subdominios especializados

const generalRepository = require("./general/general.repository");
const staffRepository = require("./staff/staff.repository");
const printersRepository = require("./printers/printers.repository");
const operationsRepository = require("./operations/operations.repository");

const settingsRepository = {
  // ───────── Business Profile, Branding & App Settings (Subdominio general) ─────────
  async getBusinessProfile() {
    return generalRepository.getBusinessProfile();
  },

  async updateBusinessProfile(data) {
    return generalRepository.updateBusinessProfile(data);
  },

  async getAppSetting(key) {
    return generalRepository.getAppSetting(key);
  },

  async setAppSetting(key, value) {
    return generalRepository.setAppSetting(key, value);
  },

  async getTipPercent() {
    return generalRepository.getTipPercent();
  },

  async getRestaurantName() {
    return generalRepository.getRestaurantName();
  },

  async getLogoUrl() {
    return generalRepository.getLogoUrl();
  },

  async getLoginBgUrl() {
    return generalRepository.getLoginBgUrl();
  },

  async getTipExcludedMethods() {
    return generalRepository.getTipExcludedMethods();
  },

  async setTipExcludedMethods(list) {
    return generalRepository.setTipExcludedMethods(list);
  },

  // ───────── Agregadores: Bootstrap & Full Settings (Subdominio general) ─────────
  async getBootstrapData(ip) {
    return generalRepository.getBootstrapData(ip);
  },

  async getFullSettingsData(currentIp) {
    return generalRepository.getFullSettingsData(currentIp);
  },

  async getConfigData() {
    return generalRepository.getConfigData();
  },

  // ───────── Modules, Roles & Personal (Subdominio staff) ─────────
  async getActiveModules() {
    return staffRepository.getActiveModules();
  },

  async setUserModulePermissions(userId, validCodes, selectedSet) {
    return staffRepository.setUserModulePermissions(userId, validCodes, selectedSet);
  },

  async setDeviceModuleBindings(targetIp, validCodes, selectedSet) {
    return staffRepository.setDeviceModuleBindings(targetIp, validCodes, selectedSet);
  },

  async getRolesData() {
    return staffRepository.getRolesData();
  },

  async createRole(data) {
    return staffRepository.createRole(data);
  },

  async getRoleById(roleId) {
    return staffRepository.getRoleById(roleId);
  },

  async updateRole(roleId, data) {
    return staffRepository.updateRole(roleId, data);
  },

  async updateRoleDefaultView(roleId, defaultView) {
    return staffRepository.updateRoleDefaultView(roleId, defaultView);
  },

  async deleteRole(roleId) {
    return staffRepository.deleteRole(roleId);
  },

  async setRolePermissions(roleId, permissionIds) {
    return staffRepository.setRolePermissions(roleId, permissionIds);
  },

  async setUserRoles(userId, roleIds) {
    return staffRepository.setUserRoles(userId, roleIds);
  },

  async getUserPermissions(userId) {
    return staffRepository.getUserPermissions(userId);
  },

  async checkDuplicatePin(pinCode, excludeUserId = null) {
    return staffRepository.checkDuplicatePin(pinCode, excludeUserId);
  },

  async createStaffUser(data) {
    return staffRepository.createStaffUser(data);
  },

  async updateStaffUser(userId, fields, params) {
    return staffRepository.updateStaffUser(userId, fields, params);
  },

  async deleteStaffUser(userId) {
    return staffRepository.deleteStaffUser(userId);
  },

  async setStaffUserCenter(userId, operationCenterId) {
    return staffRepository.setStaffUserCenter(userId, operationCenterId);
  },

  // ───────── Centros de Operación, Pagos, Descuentos & Terminales (Subdominio operations) ─────────
  async createOperationCenter(name) {
    return operationsRepository.createOperationCenter(name);
  },

  async updateOperationCenter(centerId, data) {
    return operationsRepository.updateOperationCenter(centerId, data);
  },

  async hasAccountsInCenter(centerId) {
    return operationsRepository.hasAccountsInCenter(centerId);
  },

  async hasTablesInCenter(centerId) {
    return operationsRepository.hasTablesInCenter(centerId);
  },

  async getCenterUsageDetails(centerId) {
    return operationsRepository.getCenterUsageDetails(centerId);
  },

  async deleteOperationCenter(centerId) {
    return operationsRepository.deleteOperationCenter(centerId);
  },

  async setOperationCenterProducts(centerId, productId, isEnabled) {
    return operationsRepository.setOperationCenterProducts(centerId, productId, isEnabled);
  },

  async setTerminalCenterBinding(ip, centerId, label) {
    return operationsRepository.setTerminalCenterBinding(ip, centerId, label);
  },

  async getPaymentMethods(includeInactive = true) {
    return operationsRepository.getPaymentMethods(includeInactive);
  },

  async savePaymentMethod(data) {
    return operationsRepository.savePaymentMethod(data);
  },

  async hasPaymentsWithMethod(code) {
    return operationsRepository.hasPaymentsWithMethod(code);
  },

  async deletePaymentMethod(code) {
    return operationsRepository.deletePaymentMethod(code);
  },

  async createDiscountPreset(data) {
    return operationsRepository.createDiscountPreset(data);
  },

  async updateDiscountPreset(presetId, data) {
    return operationsRepository.updateDiscountPreset(presetId, data);
  },

  async getTerminalById(id) {
    return operationsRepository.getTerminalById(id);
  },

  async createTerminal(data) {
    return operationsRepository.createTerminal(data);
  },

  async updateTerminal(terminalId, data) {
    return operationsRepository.updateTerminal(terminalId, data);
  },

  async deleteTerminal(terminalId) {
    return operationsRepository.deleteTerminal(terminalId);
  },

  async resolveTerminalForUser(userId) {
    return operationsRepository.resolveTerminalForUser(userId);
  },

  async getKitchenNotes(options) {
    return operationsRepository.getKitchenNotes(options);
  },

  async createKitchenNote(data) {
    return operationsRepository.createKitchenNote(data);
  },

  async updateKitchenNote(id, data) {
    return operationsRepository.updateKitchenNote(id, data);
  },

  async deleteKitchenNote(id) {
    return operationsRepository.deleteKitchenNote(id);
  },

  // ───────── Centros de Producción, Impresoras & Enrutamiento (Subdominio printers) ─────────
  async getProductionCenters() {
    return printersRepository.getProductionCenters();
  },

  async getProductionCenterById(id) {
    return printersRepository.getProductionCenterById(id);
  },

  async createProductionCenter(data) {
    return printersRepository.createProductionCenter(data);
  },

  async updateProductionCenter(centerId, data) {
    return printersRepository.updateProductionCenter(centerId, data);
  },

  async countProductsInProductionCenter(centerId) {
    return printersRepository.countProductsInProductionCenter(centerId);
  },

  async deleteProductionCenter(centerId) {
    return printersRepository.deleteProductionCenter(centerId);
  },

  async getPrinters() {
    return printersRepository.getPrinters();
  },

  async getPrinterById(id) {
    return printersRepository.getPrinterById(id);
  },

  async createPrinter(data) {
    return printersRepository.createPrinter(data);
  },

  async updatePrinter(id, data) {
    return printersRepository.updatePrinter(id, data);
  },

  async deletePrinter(id) {
    return printersRepository.deletePrinter(id);
  },

  async auditPrintersConfiguration() {
    return printersRepository.auditPrintersConfiguration();
  },

  async getRecentPrintJobs(limit = 50) {
    return printersRepository.getRecentPrintJobs(limit);
  },

  async getRoutingMatrix() {
    return printersRepository.getRoutingMatrix();
  },

  async saveRoutingRule(areaTrabajoId, categoriaImpresionId, centroProduccionId) {
    return printersRepository.saveRoutingRule(areaTrabajoId, categoriaImpresionId, centroProduccionId);
  },

  async deleteRoutingRule(areaTrabajoId, categoriaImpresionId) {
    return printersRepository.deleteRoutingRule(areaTrabajoId, categoriaImpresionId);
  },

  async getPrintCategories() {
    return printersRepository.getPrintCategories();
  },

  async createPrintCategory(nombre, descripcion = null) {
    return printersRepository.createPrintCategory(nombre, descripcion);
  },

  async updatePrintCategory(id, nombre, descripcion = null) {
    return printersRepository.updatePrintCategory(id, nombre, descripcion);
  },

  async deletePrintCategory(id) {
    return printersRepository.deletePrintCategory(id);
  },
};

module.exports = settingsRepository;
