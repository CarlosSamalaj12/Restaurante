// src/modules/digital_menu/routes/orders.routes.js
// Sub-enrutador para emisión de auto-comandas (comensales QR o Kioscos)

const express = require("express");
const digitalMenuController = require("../digital_menu.controller");
const { validateTableToken } = require("../middleware/validateTableToken");

const router = express.Router();

// POST /public/orders/send - Envía comanda sin mesero directo a cocina / KDS
router.post("/orders/send", validateTableToken, digitalMenuController.sendGuestOrder);

module.exports = router;
