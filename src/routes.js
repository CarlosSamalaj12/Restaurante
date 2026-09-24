// src/routes.js
// Enrutador principal de la API que agrega los módulos de dominio

const express = require("express");
const router = express.Router();

const authRoutes = require("./modules/auth/auth.routes");
const { licenseRouter, adminLicenseRouter } = require("./modules/licenses/licenses.routes");
const { tablesRouter, tableSettingsRouter } = require("./modules/tables/tables.routes");
const accountsRouter = require("./modules/accounts/accounts.routes");
const { itemsRouter } = require("./modules/orders/orders.routes");
const shiftsRouter = require("./modules/shifts/shifts.routes");
const kdsRouter = require("./modules/kds/kds.routes");
const inventoryRouter = require("./modules/inventory/inventory.routes");
const cxcRouter = require("./modules/cxc/cxc.routes");
const reportsRouter = require("./modules/reports/reports.routes");
const {
  catalogRouter,
  modifierTemplatesRouter,
  catalogSettingsRouter,
} = require("./modules/catalog/catalog.routes");
const {
  bootstrapRouter,
  configRouter,
  authRefreshRouter,
  settingsRouter,
} = require("./modules/settings/settings.routes");

// 1. Módulos de Autenticación y Licenciamiento
router.use("/auth", authRoutes);
router.use("/auth", authRefreshRouter);
router.use("/license", licenseRouter);
router.use("/admin", adminLicenseRouter);

// 2. Módulos de Mesas y Cuentas
router.use("/tables", tablesRouter);
router.use("/accounts", accountsRouter);
router.use("/settings", tableSettingsRouter);

// 3. Módulos de Órdenes e Ítems
router.use("/items", itemsRouter);

// 4. Módulo de Turnos y Caja
router.use("/shifts", shiftsRouter);

// 5. Módulo KDS (Kitchen Display System)
router.use("/kds", kdsRouter);

// 6. Módulo de Inventario y Recetas
router.use("/inventory", inventoryRouter);

// 7. Módulo CXC (Cuentas por Cobrar)
router.use("/cxc", cxcRouter);

// 8. Módulo de Reportes
router.use("/reports", reportsRouter);

// 9. Módulo de Catálogo y Modificadores
router.use("/catalog", catalogRouter);
router.use("/modifier-templates", modifierTemplatesRouter);
router.use("/settings", catalogSettingsRouter);

// 10. Módulo de Bootstrap, Config y Ajustes del Sistema
router.use("/bootstrap", bootstrapRouter);
router.use("/config", configRouter);
router.use("/settings", settingsRouter);

module.exports = router;




