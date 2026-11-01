// src/modules/settings/printers/printers.routes.js
// Rutas Express para Impresoras, Centros de Producción, Diagnósticos, Matriz de Ruteo y Categorías

const express = require("express");
const printersController = require("./printers.controller");
const authService = require("../../auth/auth.service");

const requireAuth = authService.requireAuth();
const requireSuperadmin = authService.requireSuperadmin();

const printersRouter = express.Router();
printersRouter.use(requireAuth);

// Centros de Producción (Exclusivo Superadmin para escritura)
printersRouter.get("/production-centers", printersController.getProductionCenters);
printersRouter.post("/production-centers", requireSuperadmin, printersController.createProductionCenter);
printersRouter.post("/production-centers/:centerId", requireSuperadmin, printersController.updateProductionCenter);
printersRouter.delete("/production-centers/:centerId", requireSuperadmin, printersController.deleteProductionCenter);

// Catálogo Central de Impresoras y Diagnóstico
printersRouter.get("/printers", printersController.getPrinters);
printersRouter.get("/printers/audit", printersController.auditPrinters);
printersRouter.get("/printers/status", printersController.getPrintersStatus);
printersRouter.get("/printers/mode", printersController.getPrinterRoutingMode);
printersRouter.put("/printers/mode", requireSuperadmin, printersController.setPrinterRoutingMode);
printersRouter.get("/printers/recent", printersController.getRecentPrintJobs);
printersRouter.post("/printers/test", requireSuperadmin, printersController.testPrinter);
printersRouter.post("/printers", requireSuperadmin, printersController.createPrinter);
printersRouter.put("/printers/:printerId", requireSuperadmin, printersController.updatePrinter);
printersRouter.delete("/printers/:printerId", requireSuperadmin, printersController.deletePrinter);
printersRouter.post("/printers/:printerId/test", requireSuperadmin, printersController.testPrinterDirect);

// Matriz de Enrutamiento & Categorías de Impresión
printersRouter.get("/routing-matrix", printersController.getRoutingMatrix);
printersRouter.post("/routing-matrix", requireSuperadmin, printersController.saveRoutingRule);
printersRouter.delete("/routing-matrix", requireSuperadmin, printersController.deleteRoutingRule);

printersRouter.get("/print-categories", printersController.getPrintCategories);
printersRouter.post("/print-categories", requireSuperadmin, printersController.createPrintCategory);
printersRouter.put("/print-categories/:id", requireSuperadmin, printersController.updatePrintCategory);
printersRouter.delete("/print-categories/:id", requireSuperadmin, printersController.deletePrintCategory);

module.exports = printersRouter;
