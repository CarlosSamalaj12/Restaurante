// src/modules/sync/sync.routes.js
// Rutas de sincronización para clientes offline

const express = require("express");
const syncController = require("./sync.controller");
const syncRouter = express.Router();

syncRouter.get("/health", syncController.getSyncHealth);
syncRouter.post("/batch", syncController.processBatch);

module.exports = syncRouter;
