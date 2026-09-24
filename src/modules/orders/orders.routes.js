// src/modules/orders/orders.routes.js
// Rutas HTTP para ítems, comanda y anulación

const express = require("express");
const ordersController = require("./orders.controller");

const itemsRouter = express.Router();
const ordersAccountRouter = express.Router();

// Rutas montadas bajo /items
itemsRouter.post("/:itemId/move-seat", ordersController.moveSeat);
itemsRouter.post("/:itemId/qty", ordersController.updateQty);
itemsRouter.post("/:itemId/void", ordersController.voidItem);

// Rutas montadas bajo /accounts (o integradas en accountsRouter)
ordersAccountRouter.post("/:accountId/items", ordersController.addItem);
ordersAccountRouter.post("/:accountId/send", ordersController.sendOrder);

module.exports = {
  itemsRouter,
  ordersAccountRouter,
};
