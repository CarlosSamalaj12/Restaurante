// src/modules/tables/tables.routes.js
// Definición limpia de rutas para el dominio de mesas y áreas

const express = require("express");
const tablesController = require("./tables.controller");
const authService = require("../auth/auth.service");

const tablesRouter = express.Router();
const tableSettingsRouter = express.Router();

const requireAdmin = authService.requireAdmin();

const accountsController = require("../accounts/accounts.controller");

// Rutas operativas de mesas
tablesRouter.get("/", tablesController.getTables);
tablesRouter.post("/:tableId/accounts", accountsController.createAccount);
tablesRouter.get("/:tableId/accounts", accountsController.getTableAccounts);

// Rutas de administración / configuración (requieren admin)
tableSettingsRouter.use(requireAdmin);
tableSettingsRouter.post("/tables", tablesController.createTable);
tableSettingsRouter.post("/tables/:tableId", tablesController.updateTable);
tableSettingsRouter.delete("/tables/:tableId", tablesController.deleteTable);
tableSettingsRouter.post("/areas", tablesController.createArea);
tableSettingsRouter.post("/areas/:areaId", tablesController.updateArea);

module.exports = {
  tablesRouter,
  tableSettingsRouter,
};
