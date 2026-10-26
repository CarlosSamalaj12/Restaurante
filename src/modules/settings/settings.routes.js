// src/modules/settings/settings.routes.js
// Definición de rutas para Bootstrap, Configuración y Sesión

const express = require("express");
const settingsController = require("./settings.controller");

const authService = require("../auth/auth.service");
const requireAuth = authService.requireAuth();
const requireSuperadmin = authService.requireSuperadmin();

// 1. Router para /api/bootstrap
const bootstrapRouter = express.Router();
bootstrapRouter.get("/", settingsController.getBootstrap);

// 2. Router para /api/config
const configRouter = express.Router();
configRouter.get("/data", settingsController.getConfigData);

// 3. Router para /api/auth/refresh-session
const authRefreshRouter = express.Router();
authRefreshRouter.post("/refresh-session", settingsController.refreshSession);

// 4. Router para /api/settings
const settingsRouter = express.Router();
settingsRouter.use(requireAuth);

settingsRouter.get("/", settingsController.getFullSettings);

// Branding, logo, login bg, propina (Exclusivo Superadmin)
settingsRouter.post("/branding", requireSuperadmin, settingsController.updateBranding);
settingsRouter.post("/logo", requireSuperadmin, settingsController.uploadLogo);
settingsRouter.post("/login-bg", requireSuperadmin, settingsController.uploadLoginBg);
settingsRouter.post("/receipt-logo", requireSuperadmin, settingsController.uploadReceiptLogo);
settingsRouter.post("/tip-config", requireSuperadmin, settingsController.updateTipConfig);
settingsRouter.get("/business-profile", settingsController.getBusinessProfile);
settingsRouter.put("/business-profile", requireSuperadmin, settingsController.updateBusinessProfile);
settingsRouter.post("/business-profile", requireSuperadmin, settingsController.updateBusinessProfile);
settingsRouter.get("/tip-excluded-methods", settingsController.getTipExcludedMethods);
settingsRouter.post("/tip-excluded-methods", requireSuperadmin, settingsController.updateTipExcludedMethods);

// Módulos
settingsRouter.post("/user-modules", requireSuperadmin, settingsController.updateUserModules);
settingsRouter.post("/device-modules", requireSuperadmin, settingsController.updateDeviceModules);

// Roles y Permisos (Exclusivo Superadmin)
settingsRouter.get("/roles", requireSuperadmin, settingsController.getRoles);
settingsRouter.post("/roles", requireSuperadmin, settingsController.createRole);
settingsRouter.put("/roles/:roleId", requireSuperadmin, settingsController.updateRole);
settingsRouter.delete("/roles/:roleId", requireSuperadmin, settingsController.deleteRole);
settingsRouter.post("/roles/:roleId/permissions", requireSuperadmin, settingsController.setRolePermissions);
settingsRouter.post("/users/:userId/roles", requireSuperadmin, settingsController.setUserRoles);

// Centros de Operación y Bindings (Admin & Superadmin)
settingsRouter.get("/operation-centers/:centerId/usage", settingsController.getOperationCenterUsage);
settingsRouter.post("/operation-centers", settingsController.createOperationCenter);
settingsRouter.post("/operation-centers/:centerId", settingsController.updateOperationCenter);
settingsRouter.put("/operation-centers/:centerId", settingsController.updateOperationCenter);
settingsRouter.delete("/operation-centers/:centerId", settingsController.deleteOperationCenter);
settingsRouter.post("/operation-centers/:centerId/products", settingsController.setOperationCenterProducts);
settingsRouter.post("/terminal-binding", requireSuperadmin, settingsController.setTerminalBinding);

// Métodos de Pago y Descuentos
settingsRouter.get("/payment-methods", settingsController.getPaymentMethods);
settingsRouter.post("/payment-methods", requireSuperadmin, settingsController.savePaymentMethod);
settingsRouter.delete("/payment-methods/:code", requireSuperadmin, settingsController.deletePaymentMethod);
settingsRouter.post("/discount-presets", settingsController.createDiscountPreset);
settingsRouter.post("/discount-presets/:presetId", settingsController.updateDiscountPreset);

// Centros de Producción (Exclusivo Superadmin)
settingsRouter.get("/production-centers", settingsController.getProductionCenters);
settingsRouter.post("/production-centers", requireSuperadmin, settingsController.createProductionCenter);
settingsRouter.post("/production-centers/:centerId", requireSuperadmin, settingsController.updateProductionCenter);
settingsRouter.delete("/production-centers/:centerId", requireSuperadmin, settingsController.deleteProductionCenter);

// Catálogo Central de Impresoras y Diagnóstico (Exclusivo Superadmin)
settingsRouter.get("/printers", settingsController.getPrinters);
settingsRouter.get("/printers/audit", settingsController.auditPrinters);
settingsRouter.get("/printers/status", settingsController.getPrintersStatus);
settingsRouter.get("/printers/mode", settingsController.getPrinterRoutingMode);
settingsRouter.put("/printers/mode", requireSuperadmin, settingsController.setPrinterRoutingMode);
settingsRouter.get("/printers/recent", settingsController.getRecentPrintJobs);
settingsRouter.post("/printers/test", requireSuperadmin, settingsController.testPrinter);
settingsRouter.post("/printers", requireSuperadmin, settingsController.createPrinter);
settingsRouter.put("/printers/:printerId", requireSuperadmin, settingsController.updatePrinter);
settingsRouter.delete("/printers/:printerId", requireSuperadmin, settingsController.deletePrinter);
settingsRouter.post("/printers/:printerId/test", requireSuperadmin, settingsController.testPrinterDirect);

// Usuarios del Sistema (Exclusivo Superadmin)
settingsRouter.post("/staff-users", requireSuperadmin, settingsController.createStaffUser);
settingsRouter.put("/staff-users/:userId", requireSuperadmin, settingsController.updateStaffUser);
settingsRouter.delete("/staff-users/:userId", requireSuperadmin, settingsController.deleteStaffUser);
settingsRouter.post("/staff-users/:userId/center", requireSuperadmin, settingsController.setStaffUserCenter);

// Terminales (Exclusivo Superadmin)
settingsRouter.post("/terminals", requireSuperadmin, settingsController.createTerminal);
settingsRouter.post("/terminals/:terminalId", requireSuperadmin, settingsController.updateTerminal);
settingsRouter.delete("/terminals/:terminalId", requireSuperadmin, settingsController.deleteTerminal);

// Matriz de Enrutamiento & Categorías de Impresión (Exclusivo Superadmin)
settingsRouter.get("/routing-matrix", settingsController.getRoutingMatrix);
settingsRouter.post("/routing-matrix", requireSuperadmin, settingsController.saveRoutingRule);
settingsRouter.delete("/routing-matrix", requireSuperadmin, settingsController.deleteRoutingRule);

settingsRouter.get("/print-categories", settingsController.getPrintCategories);
settingsRouter.post("/print-categories", requireSuperadmin, settingsController.createPrintCategory);
settingsRouter.put("/print-categories/:id", requireSuperadmin, settingsController.updatePrintCategory);
settingsRouter.delete("/print-categories/:id", requireSuperadmin, settingsController.deletePrintCategory);

// Observaciones y Atajos Rápidos de Cocina
settingsRouter.get("/kitchen-notes", settingsController.getKitchenNotes);
settingsRouter.post("/kitchen-notes", settingsController.createKitchenNote);
settingsRouter.put("/kitchen-notes/:id", settingsController.updateKitchenNote);
settingsRouter.delete("/kitchen-notes/:id", settingsController.deleteKitchenNote);

module.exports = {
  bootstrapRouter,
  configRouter,
  authRefreshRouter,
  settingsRouter,
};
