// src/modules/kds/kds.routes.js
// Rutas HTTP para KDS (Kitchen Display System)

const express = require("express");
const kdsController = require("./kds.controller");

const kdsRouter = express.Router();

kdsRouter.get("/orders", kdsController.getActiveOrders);
kdsRouter.get("/orders-with-voided", kdsController.getOrdersWithVoided);
kdsRouter.post("/items/:itemId/done", kdsController.markItemDone);
kdsRouter.post("/accounts/:accountId/done-all", kdsController.markAccountDone);
kdsRouter.get("/completed", kdsController.getCompleted);
kdsRouter.get("/voided", kdsController.getVoided);
kdsRouter.get("/production-centers", kdsController.getProductionCenters);
kdsRouter.get("/report", kdsController.getReport);

module.exports = kdsRouter;
