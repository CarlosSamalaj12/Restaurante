// src/modules/settings/settings.service.js
// Servicio Facade para configuración global, delegando a subdominios especializados

const generalService = require("./general/general.service");
const staffService = require("./staff/staff.service");
const printersService = require("./printers/printers.service");
const operationsService = require("./operations/operations.service");

const settingsService = {
  // ───────── Bootstrap & Full Settings (Subdominio general) ─────────
  async getBootstrap(ip) {
    return generalService.getBootstrap(ip);
  },

  async getFullSettings(currentIp) {
    return generalService.getFullSettings(currentIp);
  },

  async getConfigData() {
    return generalService.getConfigData();
  },

  // ───────── Branding & Assets (Subdominio general) ─────────
  async updateBranding(restaurantName) {
    return generalService.updateBranding(restaurantName);
  },

  async saveLogo(logoData, baseDir) {
    return generalService.saveLogo(logoData, baseDir);
  },

  async saveLoginBg(bgData, baseDir) {
    return generalService.saveLoginBg(bgData, baseDir);
  },

  async saveReceiptLogo(logoData, baseDir) {
    return generalService.saveReceiptLogo(logoData, baseDir);
  },

  async updateTipConfig(tipPercent) {
    return generalService.updateTipConfig(tipPercent);
  },

  async getTipPercent() {
    return generalService.getTipPercent();
  },

  async getBusinessProfile() {
    return generalService.getBusinessProfile();
  },

  async updateBusinessProfile(data) {
    return generalService.updateBusinessProfile(data);
  },

  async getTipExcludedMethods() {
    return generalService.getTipExcludedMethods();
  },

  async updateTipExcludedMethods(excludedMethods) {
    return generalService.updateTipExcludedMethods(excludedMethods);
  },

  // ───────── Modules & Roles & Personal (Subdominio staff) ─────────
  async updateUserModules(userId, moduleCodes = []) {
    return staffService.updateUserModules(userId, moduleCodes);
  },

  async updateDeviceModules(targetIp, moduleCodes = []) {
    return staffService.updateDeviceModules(targetIp, moduleCodes);
  },

  async getRoles() {
    return staffService.getRoles();
  },

  async createRole(data) {
    return staffService.createRole(data);
  },

  async updateRole(roleId, data) {
    return staffService.updateRole(roleId, data);
  },

  async deleteRole(roleId) {
    return staffService.deleteRole(roleId);
  },

  async setRolePermissions(roleId, permissionIds, defaultView = null) {
    return staffService.setRolePermissions(roleId, permissionIds, defaultView);
  },

  async setUserRoles(userId, roleIds) {
    return staffService.setUserRoles(userId, roleIds);
  },

  async getUserPermissions(userId) {
    return staffService.getUserPermissions(userId);
  },

  async createStaffUser(data) {
    return staffService.createStaffUser(data);
  },

  async updateStaffUser(userId, data) {
    return staffService.updateStaffUser(userId, data);
  },

  async deleteStaffUser(userId) {
    return staffService.deleteStaffUser(userId);
  },

  async setStaffUserCenter(userId, operationCenterId) {
    return staffService.setStaffUserCenter(userId, operationCenterId);
  },

  // ───────── Centros de Operación, Pagos, Descuentos & Terminales (Subdominio operations) ─────────
  async createOperationCenter(data) {
    return operationsService.createOperationCenter(data);
  },

  async updateOperationCenter(centerId, data) {
    return operationsService.updateOperationCenter(centerId, data);
  },

  async getOperationCenterUsage(centerId) {
    return operationsService.getOperationCenterUsage(centerId);
  },

  async deleteOperationCenter(centerId) {
    return operationsService.deleteOperationCenter(centerId);
  },

  async setOperationCenterProducts(centerId, productId, isEnabled = 1) {
    return operationsService.setOperationCenterProducts(centerId, productId, isEnabled);
  },

  async setTerminalBinding(ipAddress, centerId, label = "") {
    return operationsService.setTerminalBinding(ipAddress, centerId, label);
  },

  async getPaymentMethods() {
    return operationsService.getPaymentMethods();
  },

  async savePaymentMethod(data) {
    return operationsService.savePaymentMethod(data);
  },

  async deletePaymentMethod(code) {
    return operationsService.deletePaymentMethod(code);
  },

  async createDiscountPreset(data) {
    return operationsService.createDiscountPreset(data);
  },

  async updateDiscountPreset(presetId, data) {
    return operationsService.updateDiscountPreset(presetId, data);
  },

  async createTerminal(data) {
    return operationsService.createTerminal(data);
  },

  async updateTerminal(terminalId, data) {
    return operationsService.updateTerminal(terminalId, data);
  },

  async deleteTerminal(terminalId) {
    return operationsService.deleteTerminal(terminalId);
  },

  async getKitchenNotes(opts) {
    return operationsService.getKitchenNotes(opts);
  },

  async createKitchenNote(data) {
    return operationsService.createKitchenNote(data);
  },

  async updateKitchenNote(id, data) {
    return operationsService.updateKitchenNote(id, data);
  },

  async deleteKitchenNote(id) {
    return operationsService.deleteKitchenNote(id);
  },

  // ───────── Producción, Impresoras & Enrutamiento (Subdominio printers) ─────────
  async getProductionCenters() {
    return printersService.getProductionCenters();
  },

  async createProductionCenter(data) {
    return printersService.createProductionCenter(data);
  },

  async updateProductionCenter(centerId, data) {
    return printersService.updateProductionCenter(centerId, data);
  },

  async deleteProductionCenter(centerId) {
    return printersService.deleteProductionCenter(centerId);
  },

  async testPrinter(data) {
    return printersService.testPrinter(data);
  },

  getPrintersStatus() {
    return printersService.getPrintersStatus();
  },

  async getPrinterRoutingMode() {
    return printersService.getPrinterRoutingMode();
  },

  async setPrinterRoutingMode(mode) {
    return printersService.setPrinterRoutingMode(mode);
  },

  async getRecentPrintJobs(limit = 50) {
    return printersService.getRecentPrintJobs(limit);
  },

  async getPrinters() {
    return printersService.getPrinters();
  },

  async createPrinter(data) {
    return printersService.createPrinter(data);
  },

  async updatePrinter(printerId, data) {
    return printersService.updatePrinter(printerId, data);
  },

  async deletePrinter(printerId) {
    return printersService.deletePrinter(printerId);
  },

  async testPrinterDirect(printerId) {
    return printersService.testPrinterDirect(printerId);
  },

  async auditPrinters() {
    return printersService.auditPrinters();
  },

  async getRoutingMatrix() {
    return printersService.getRoutingMatrix();
  },

  async saveRoutingRule(data) {
    return printersService.saveRoutingRule(data);
  },

  async deleteRoutingRule(areaTrabajoId, categoriaImpresionId) {
    return printersService.deleteRoutingRule(areaTrabajoId, categoriaImpresionId);
  },

  async getPrintCategories() {
    return printersService.getPrintCategories();
  },

  async createPrintCategory(data) {
    return printersService.createPrintCategory(data);
  },

  async updatePrintCategory(id, data) {
    return printersService.updatePrintCategory(id, data);
  },

  async deletePrintCategory(id) {
    return printersService.deletePrintCategory(id);
  },
};

module.exports = settingsService;
