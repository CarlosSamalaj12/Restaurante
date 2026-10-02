// src/modules/payments/payments.routes.js
// Rutas HTTP para pagos y descuentos

const express = require("express");
const paymentsController = require("./payments.controller");
const authService = require("../auth/auth.service");

const paymentsRouter = express.Router();

paymentsRouter.post("/:accountId/discounts", authService.requirePermissionOrSupervisor("orders.discount"), paymentsController.addDiscount);
paymentsRouter.post("/:accountId/payments", authService.requirePermission("payments.create"), paymentsController.addPayment);
paymentsRouter.post("/:accountId/close", authService.requirePermissionOrSupervisor("accounts.close"), paymentsController.closeAccount);

module.exports = paymentsRouter;
