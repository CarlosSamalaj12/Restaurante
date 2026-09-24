// src/modules/payments/payments.routes.js
// Rutas HTTP para pagos y descuentos

const express = require("express");
const paymentsController = require("./payments.controller");

const paymentsRouter = express.Router();

paymentsRouter.post("/:accountId/discounts", paymentsController.addDiscount);
paymentsRouter.post("/:accountId/payments", paymentsController.addPayment);
paymentsRouter.post("/:accountId/close", paymentsController.closeAccount);

module.exports = paymentsRouter;
