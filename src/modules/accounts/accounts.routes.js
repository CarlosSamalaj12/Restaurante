// src/modules/accounts/accounts.routes.js
// Rutas HTTP para el dominio de cuentas

const express = require("express");
const accountsController = require("./accounts.controller");

const accountsRouter = express.Router();

// Búsqueda y listados globales de cuentas
accountsRouter.get("/open", accountsController.getOpenAccounts);
accountsRouter.get("/by-check/:checkNumber", accountsController.getAccountByCheck);
accountsRouter.get("/paid/search", accountsController.searchPaidAccounts);

const ordersController = require("../orders/orders.controller");
const paymentsController = require("../payments/payments.controller");
const authService = require("../auth/auth.service");

// Operaciones por ID de cuenta
accountsRouter.get("/:accountId", accountsController.getAccountById);
accountsRouter.delete("/:accountId", authService.requirePermissionOrSupervisor("accounts.void"), accountsController.deleteAccount);
accountsRouter.get("/:accountId/receipt", accountsController.getAccountReceipt);
accountsRouter.post("/:accountId/precheck", accountsController.getAccountPrecheck);
accountsRouter.post("/:accountId/items", authService.requirePermission("orders.create"), ordersController.addItem);
accountsRouter.post("/:accountId/send", authService.requirePermission("orders.send"), ordersController.sendOrder);

// Reabrir cuenta (protegido por permiso accounts.reopen o PIN de supervisor)
accountsRouter.post(
  "/:accountId/reopen",
  authService.requirePermissionOrSupervisor("accounts.reopen"),
  accountsController.reopenAccount
);

// Rectificar / cambiar forma de pago (con PIN de supervisor)
accountsRouter.post(
  "/:accountId/change-payment-method",
  authService.requireAuth(),
  paymentsController.changePaymentMethod
);

// Pagos, descuentos y cierre
accountsRouter.post("/:accountId/discounts", authService.requirePermissionOrSupervisor("orders.discount"), paymentsController.addDiscount);
accountsRouter.post("/:accountId/payments", authService.requirePermission("payments.create"), paymentsController.addPayment);
accountsRouter.delete("/:accountId/payments/:paymentId", authService.requirePermissionOrSupervisor("payments.refund"), paymentsController.deletePayment);
accountsRouter.post("/:accountId/close", authService.requirePermissionOrSupervisor("accounts.close"), paymentsController.closeAccount);

// Gestión de propina
accountsRouter.post("/:accountId/remove-tip", accountsController.removeTip);
accountsRouter.post("/:accountId/restore-tip", accountsController.restoreTip);

// Transferencias y divisiones
accountsRouter.post("/:accountId/transfer-seat", accountsController.transferSeat);
accountsRouter.post("/:accountId/move-item", accountsController.moveItem);
accountsRouter.post("/:accountId/split-equal", accountsController.splitEqual);
accountsRouter.post("/:accountId/split-custom", accountsController.splitCustom);
accountsRouter.post("/:accountId/split-shared", accountsController.splitShared);
accountsRouter.post("/:accountId/transfer-account", accountsController.transferAccount);
accountsRouter.post("/:accountId/join-with", accountsController.joinAccounts);

module.exports = accountsRouter;
