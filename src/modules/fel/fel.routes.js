// src/modules/fel/fel.routes.js
// Rutas de la API para Facturación Electrónica en Línea (FEL Guatemala)

const express = require("express");
const router = express.Router();
const felController = require("./fel.controller");
const authService = require("../auth/auth.service");
const requireAuth = authService.requireAuth();
const requireSuperadmin = authService.requireSuperadmin();

router.get("/config", requireAuth, felController.getConfig);
router.put("/config", requireSuperadmin, felController.updateConfig);
router.post("/test-connection", requireSuperadmin, felController.testConnection);
router.get("/consultar-nit/:nit", felController.consultarNit);
router.post("/emitir", felController.emitirFactura);
router.get("/account/:accountId", felController.getAccountInvoice);

module.exports = router;
