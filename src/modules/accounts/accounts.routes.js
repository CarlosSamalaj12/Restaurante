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

// Operaciones por ID de cuenta
accountsRouter.get("/:accountId", accountsController.getAccountById);
accountsRouter.delete("/:accountId", accountsController.deleteAccount);
accountsRouter.get("/:accountId/receipt", accountsController.getAccountReceipt);
accountsRouter.post("/:accountId/precheck", accountsController.getAccountPrecheck);
accountsRouter.post("/:accountId/items", ordersController.addItem);
accountsRouter.post("/:accountId/send", ordersController.sendOrder);

// Pagos, descuentos y cierre
accountsRouter.post("/:accountId/discounts", paymentsController.addDiscount);
accountsRouter.post("/:accountId/payments", paymentsController.addPayment);
accountsRouter.post("/:accountId/close", paymentsController.closeAccount);

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
