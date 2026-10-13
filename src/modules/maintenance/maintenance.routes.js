// src/modules/maintenance/maintenance.routes.js
// Rutas de API para estado de mantenimiento y versiones

const express = require("express");
const router = express.Router();
const maintenanceController = require("./maintenance.controller");
const authService = require("../auth/auth.service");

const requireSuperadmin = authService.requireSuperadmin();

// Estado público accesible por cualquier terminal
router.get("/status", maintenanceController.getStatus);

// Operaciones protegidas exclusivas para Superadmin
router.post("/start", requireSuperadmin, maintenanceController.startCountdown);
router.post("/abort", requireSuperadmin, maintenanceController.abortCountdown);
router.post("/end", requireSuperadmin, maintenanceController.endMaintenance);
router.get("/versions", requireSuperadmin, maintenanceController.getVersions);
router.post("/versions", requireSuperadmin, maintenanceController.createVersion);

module.exports = router;
