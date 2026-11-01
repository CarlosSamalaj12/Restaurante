// src/modules/settings/operations/operations.routes.js
// Rutas Express para Centros de Operación, Terminales, Formas de Pago, Descuentos y Notas de Cocina

const express = require("express");
const operationsController = require("./operations.controller");
const authService = require("../../auth/auth.service");

const requireAuth = authService.requireAuth();
const requireSuperadmin = authService.requireSuperadmin();

const operationsRouter = express.Router();
operationsRouter.use(requireAuth);

// Centros de Operación y Bindings (Admin & Superadmin)
operationsRouter.get("/operation-centers/:centerId/usage", operationsController.getOperationCenterUsage);
operationsRouter.post("/operation-centers", operationsController.createOperationCenter);
operationsRouter.post("/operation-centers/:centerId", operationsController.updateOperationCenter);
operationsRouter.put("/operation-centers/:centerId", operationsController.updateOperationCenter);
operationsRouter.delete("/operation-centers/:centerId", operationsController.deleteOperationCenter);
operationsRouter.post("/operation-centers/:centerId/products", operationsController.setOperationCenterProducts);
operationsRouter.post("/terminal-binding", requireSuperadmin, operationsController.setTerminalBinding);

// Métodos de Pago y Descuentos
operationsRouter.get("/payment-methods", operationsController.getPaymentMethods);
operationsRouter.post("/payment-methods", requireSuperadmin, operationsController.savePaymentMethod);
operationsRouter.delete("/payment-methods/:code", requireSuperadmin, operationsController.deletePaymentMethod);
operationsRouter.post("/discount-presets", operationsController.createDiscountPreset);
operationsRouter.post("/discount-presets/:presetId", operationsController.updateDiscountPreset);

// Terminales (Exclusivo Superadmin)
operationsRouter.post("/terminals", requireSuperadmin, operationsController.createTerminal);
operationsRouter.post("/terminals/:terminalId", requireSuperadmin, operationsController.updateTerminal);
operationsRouter.delete("/terminals/:terminalId", requireSuperadmin, operationsController.deleteTerminal);

// Observaciones y Atajos Rápidos de Cocina
operationsRouter.get("/kitchen-notes", operationsController.getKitchenNotes);
operationsRouter.post("/kitchen-notes", operationsController.createKitchenNote);
operationsRouter.put("/kitchen-notes/:id", operationsController.updateKitchenNote);
operationsRouter.delete("/kitchen-notes/:id", operationsController.deleteKitchenNote);

module.exports = operationsRouter;
