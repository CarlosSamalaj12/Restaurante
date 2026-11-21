// src/modules/sync/sync.routes.js
// Rutas de sincronización para clientes offline

const express = require("express");
const syncController = require("./sync.controller");
const authService = require("../auth/auth.service");
const syncRouter = express.Router();

syncRouter.get("/health", syncController.getSyncHealth);
syncRouter.post("/batch", authService.requireAuth(), syncController.processBatch);

module.exports = syncRouter;
