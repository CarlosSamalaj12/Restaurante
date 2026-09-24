// src/modules/settings/settings.routes.js
// Definición de rutas para Bootstrap, Configuración y Sesión

const express = require("express");
const settingsController = require("./settings.controller");

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

settingsRouter.get("/", settingsController.getFullSettings);

// Branding, logo, login bg, propina
settingsRouter.post("/branding", settingsController.updateBranding);
settingsRouter.post("/logo", settingsController.uploadLogo);
settingsRouter.post("/login-bg", settingsController.uploadLoginBg);
settingsRouter.post("/tip-config", settingsController.updateTipConfig);
settingsRouter.get("/business-profile", settingsController.getBusinessProfile);
settingsRouter.put("/business-profile", settingsController.updateBusinessProfile);
settingsRouter.get("/tip-excluded-methods", settingsController.getTipExcludedMethods);
settingsRouter.post("/tip-excluded-methods", settingsController.updateTipExcludedMethods);

// Módulos
settingsRouter.post("/user-modules", settingsController.updateUserModules);
settingsRouter.post("/device-modules", settingsController.updateDeviceModules);

// Roles y Permisos
settingsRouter.get("/roles", settingsController.getRoles);
settingsRouter.post("/roles", settingsController.createRole);
settingsRouter.put("/roles/:roleId", settingsController.updateRole);
settingsRouter.delete("/roles/:roleId", settingsController.deleteRole);
settingsRouter.post("/roles/:roleId/permissions", settingsController.setRolePermissions);
settingsRouter.post("/users/:userId/roles", settingsController.setUserRoles);

// Centros de Operación y Bindings
settingsRouter.post("/operation-centers", settingsController.createOperationCenter);
settingsRouter.post("/operation-centers/:centerId", settingsController.updateOperationCenter);
settingsRouter.delete("/operation-centers/:centerId", settingsController.deleteOperationCenter);
settingsRouter.post("/operation-centers/:centerId/products", settingsController.setOperationCenterProducts);
settingsRouter.post("/terminal-binding", settingsController.setTerminalBinding);

// Métodos de Pago y Descuentos
settingsRouter.get("/payment-methods", settingsController.getPaymentMethods);
settingsRouter.post("/payment-methods", settingsController.savePaymentMethod);
settingsRouter.delete("/payment-methods/:code", settingsController.deletePaymentMethod);
settingsRouter.post("/discount-presets", settingsController.createDiscountPreset);
settingsRouter.post("/discount-presets/:presetId", settingsController.updateDiscountPreset);

// Centros de Producción e Impresoras
settingsRouter.get("/production-centers", settingsController.getProductionCenters);
settingsRouter.post("/production-centers", settingsController.createProductionCenter);
settingsRouter.post("/production-centers/:centerId", settingsController.updateProductionCenter);
settingsRouter.delete("/production-centers/:centerId", settingsController.deleteProductionCenter);
settingsRouter.post("/printers/test", settingsController.testPrinter);
settingsRouter.get("/printers/status", settingsController.getPrintersStatus);
settingsRouter.get("/printers/recent", settingsController.getRecentPrintJobs);

// Usuarios del Sistema
settingsRouter.post("/staff-users", settingsController.createStaffUser);
settingsRouter.put("/staff-users/:userId", settingsController.updateStaffUser);
settingsRouter.delete("/staff-users/:userId", settingsController.deleteStaffUser);
settingsRouter.post("/staff-users/:userId/center", settingsController.setStaffUserCenter);

// Terminales
settingsRouter.post("/terminals", settingsController.createTerminal);
settingsRouter.post("/terminals/:terminalId", settingsController.updateTerminal);
settingsRouter.delete("/terminals/:terminalId", settingsController.deleteTerminal);

// Matriz de Enrutamiento & Categorías de Impresión
settingsRouter.get("/routing-matrix", settingsController.getRoutingMatrix);
settingsRouter.post("/routing-matrix", settingsController.saveRoutingRule);
settingsRouter.delete("/routing-matrix", settingsController.deleteRoutingRule);

settingsRouter.get("/print-categories", settingsController.getPrintCategories);
settingsRouter.post("/print-categories", settingsController.createPrintCategory);
settingsRouter.put("/print-categories/:id", settingsController.updatePrintCategory);
settingsRouter.delete("/print-categories/:id", settingsController.deletePrintCategory);

module.exports = {
  bootstrapRouter,
  configRouter,
  authRefreshRouter,
  settingsRouter,
};
