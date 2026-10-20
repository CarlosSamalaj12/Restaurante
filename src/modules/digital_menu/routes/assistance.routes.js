// src/modules/digital_menu/routes/assistance.routes.js
// Sub-enrutador para solicitud de servicio en mesa y cobro de cuenta

const express = require("express");
const digitalMenuController = require("../digital_menu.controller");
const { validateTableToken } = require("../middleware/validateTableToken");

const router = express.Router();

// POST /public/table/call-waiter - Notifica llamado de asistencia al POS / mesero
router.post("/table/call-waiter", validateTableToken, digitalMenuController.callWaiter);

// POST /public/table/request-bill - Solicita cuenta indicando método de pago preferido
router.post("/table/request-bill", validateTableToken, digitalMenuController.requestBill);

module.exports = router;
