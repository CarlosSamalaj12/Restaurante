// src/modules/settings/settings.controller.js
// Controlador HTTP Facade para configuración global, delegando a subdominios especializados

const asyncHandler = require("../../common/asyncHandler");
const settingsService = require("./settings.service");
const generalController = require("./general/general.controller");
const staffController = require("./staff/staff.controller");
const printersController = require("./printers/printers.controller");
const operationsController = require("./operations/operations.controller");

const settingsController = {
  // ───────── General, Perfil, Branding & Bootstrap (Subdominio general) ─────────
  getBootstrap: generalController.getBootstrap,
  getFullSettings: generalController.getFullSettings,
  getConfigData: generalController.getConfigData,
  updateBranding: generalController.updateBranding,
  uploadLogo: generalController.uploadLogo,
  uploadLoginBg: generalController.uploadLoginBg,
  uploadReceiptLogo: generalController.uploadReceiptLogo,
  updateTipConfig: generalController.updateTipConfig,
  getBusinessProfile: generalController.getBusinessProfile,
  updateBusinessProfile: generalController.updateBusinessProfile,
  getTipExcludedMethods: generalController.getTipExcludedMethods,
  updateTipExcludedMethods: generalController.updateTipExcludedMethods,

  refreshSession: asyncHandler(async (req, res) => {
    const userId = req.user?.id || req.auth?.userId || req.body?.userId;
    let permissions = [];
    if (userId) {
      try {
        permissions = await settingsService.getUserPermissions(userId);
      } catch (_) {}
    }
    res.json({ ok: true, permissions });
  }),

  // ───────── Personal, Roles y Permisos (Subdominio staff) ─────────
  updateUserModules: staffController.updateUserModules,
  updateDeviceModules: staffController.updateDeviceModules,
  getRoles: staffController.getRoles,
  createRole: staffController.createRole,
  updateRole: staffController.updateRole,
  deleteRole: staffController.deleteRole,
  setRolePermissions: staffController.setRolePermissions,
  setUserRoles: staffController.setUserRoles,
  createStaffUser: staffController.createStaffUser,
  updateStaffUser: staffController.updateStaffUser,
  deleteStaffUser: staffController.deleteStaffUser,
  setStaffUserCenter: staffController.setStaffUserCenter,

  // ───────── Operaciones, Pagos, Descuentos y Terminales (Subdominio operations) ─────────
  getOperationCenterUsage: operationsController.getOperationCenterUsage,
  createOperationCenter: operationsController.createOperationCenter,
  updateOperationCenter: operationsController.updateOperationCenter,
  deleteOperationCenter: operationsController.deleteOperationCenter,
  setOperationCenterProducts: operationsController.setOperationCenterProducts,
  setTerminalBinding: operationsController.setTerminalBinding,
  getPaymentMethods: operationsController.getPaymentMethods,
  savePaymentMethod: operationsController.savePaymentMethod,
  deletePaymentMethod: operationsController.deletePaymentMethod,
  createDiscountPreset: operationsController.createDiscountPreset,
  updateDiscountPreset: operationsController.updateDiscountPreset,
  createTerminal: operationsController.createTerminal,
  updateTerminal: operationsController.updateTerminal,
  deleteTerminal: operationsController.deleteTerminal,
  getKitchenNotes: operationsController.getKitchenNotes,
  createKitchenNote: operationsController.createKitchenNote,
  updateKitchenNote: operationsController.updateKitchenNote,
  deleteKitchenNote: operationsController.deleteKitchenNote,

  // ───────── Impresoras y Centros de Producción (Subdominio printers) ─────────
  getProductionCenters: printersController.getProductionCenters,
  createProductionCenter: printersController.createProductionCenter,
  updateProductionCenter: printersController.updateProductionCenter,
  deleteProductionCenter: printersController.deleteProductionCenter,
  testPrinter: printersController.testPrinter,
  getPrintersStatus: printersController.getPrintersStatus,
  getPrinterRoutingMode: printersController.getPrinterRoutingMode,
  setPrinterRoutingMode: printersController.setPrinterRoutingMode,
  getRecentPrintJobs: printersController.getRecentPrintJobs,
  getPrinters: printersController.getPrinters,
  createPrinter: printersController.createPrinter,
  updatePrinter: printersController.updatePrinter,
  deletePrinter: printersController.deletePrinter,
  testPrinterDirect: printersController.testPrinterDirect,
  auditPrinters: printersController.auditPrinters,
  getRoutingMatrix: printersController.getRoutingMatrix,
  saveRoutingRule: printersController.saveRoutingRule,
  deleteRoutingRule: printersController.deleteRoutingRule,
  getPrintCategories: printersController.getPrintCategories,
  createPrintCategory: printersController.createPrintCategory,
  updatePrintCategory: printersController.updatePrintCategory,
  deletePrintCategory: printersController.deletePrintCategory,
};

module.exports = settingsController;
