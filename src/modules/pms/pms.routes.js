// src/modules/pms/pms.routes.js
// Rutas de API para integración con Hotel PMS

const express = require("express");
const pmsController = require("./pms.controller");
const authService = require("../auth/auth.service");

const pmsRouter = express.Router();
const requireAuth = authService.requireAuth();
const requireAdmin = authService.requireAdmin();

pmsRouter.get("/config", requireAuth, pmsController.getConfig);
pmsRouter.put("/config", requireAdmin, pmsController.updateConfig);
pmsRouter.get("/rooms/lookup", requireAuth, pmsController.lookupRoom);
pmsRouter.post("/charges", requireAuth, pmsController.postCharge);
pmsRouter.post("/charges/:transactionId/reverse", requireAuth, pmsController.reverseCharge);
pmsRouter.post("/test-connection", requireAdmin, pmsController.testConnection);
pmsRouter.get("/history", requireAuth, pmsController.getRecentCharges);

module.exports = pmsRouter;
