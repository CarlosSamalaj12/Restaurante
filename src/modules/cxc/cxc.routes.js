// src/modules/cxc/cxc.routes.js
// Rutas HTTP para Cuentas por Cobrar (CXC)

const express = require("express");
const cxcController = require("./cxc.controller");

const cxcRouter = express.Router();

// Áreas
cxcRouter.get("/areas", cxcController.getAreas);
cxcRouter.post("/areas", cxcController.createArea);
cxcRouter.put("/areas/:areaId", cxcController.updateArea);
cxcRouter.delete("/areas/:areaId", cxcController.deleteArea);

// Clientes
cxcRouter.get("/clients", cxcController.getClients);
cxcRouter.post("/clients", cxcController.createClient);
cxcRouter.put("/clients/:clientId", cxcController.updateClient);
cxcRouter.get("/clients/:clientId/categories", cxcController.getClientCategories);
cxcRouter.post("/clients/:clientId/categories", cxcController.addClientCategory);
cxcRouter.delete("/clients/:clientId/categories/:categoryId", cxcController.deleteClientCategory);
cxcRouter.get("/clients/:clientId/accounts", cxcController.getClientAccounts);
cxcRouter.post("/clients/:clientId/pay-global", cxcController.payGlobal);
cxcRouter.get("/clients/:clientId/statement", cxcController.getStatement);

// Categorías y Descuentos
cxcRouter.get("/categories", cxcController.getCategories);
cxcRouter.get("/check-discount", cxcController.checkDiscount);

// Cuentas CXC y Pagos
cxcRouter.post("/accounts", cxcController.createAccount);
cxcRouter.post("/accounts/:cxcAccountId/payments", cxcController.addAccountPayment);
cxcRouter.get("/accounts/:cxcAccountId", cxcController.getAccountById);
cxcRouter.get("/pending", cxcController.getPending);
cxcRouter.get("/pending-summary", cxcController.getPendingSummary);

// Excel Exports
cxcRouter.get("/export-statement/:clientId", cxcController.exportStatement);
cxcRouter.get("/export-pending-summary", cxcController.exportPendingSummary);

module.exports = cxcRouter;
