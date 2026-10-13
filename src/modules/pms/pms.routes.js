// src/modules/pms/pms.routes.js
// Rutas de API para integración con Hotel PMS

const express = require("express");
const pmsController = require("./pms.controller");

const pmsRouter = express.Router();

pmsRouter.get("/config", pmsController.getConfig);
pmsRouter.put("/config", pmsController.updateConfig);
pmsRouter.get("/rooms/lookup", pmsController.lookupRoom);
pmsRouter.post("/charges", pmsController.postCharge);
pmsRouter.post("/charges/:transactionId/reverse", pmsController.reverseCharge);
pmsRouter.post("/test-connection", pmsController.testConnection);
pmsRouter.get("/history", pmsController.getRecentCharges);

module.exports = pmsRouter;
