// src/modules/digital_menu/routes/sessions.routes.js
// Sub-enrutador para vinculación de huella de dispositivo y sesión de comensal en mesa

const express = require("express");
const digitalMenuController = require("../digital_menu.controller");
const { validateTableToken } = require("../middleware/validateTableToken");

const router = express.Router();

// POST /public/session/bind - Vincula un dispositivo (huella persistente) a una cuenta de mesa
router.post("/session/bind", validateTableToken, digitalMenuController.bindDeviceSession);

// GET /public/session/:sessionToken/status - Consulta si la cuenta de la mesa sigue abierta
router.get("/session/:sessionToken/status", digitalMenuController.checkSessionStatus);

module.exports = router;
