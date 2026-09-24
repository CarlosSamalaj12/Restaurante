// src/modules/orders/orders.controller.js
// Controlador HTTP para ítems, comanda y reversiones

const ordersService = require("./orders.service");
const asyncHandler = require("../../common/asyncHandler");

const ordersController = {
  addItem: asyncHandler(async (req, res) => {
    const accountId = Number(req.params.accountId);
    const { productId, seatNo, qty, notes, modifierOptionIds } = req.body || {};
    const result = await ordersService.addItemToAccount({
      accountId,
      productId,
      seatNo,
      qty,
      notes,
      modifierOptionIds,
    });
    res.status(201).json(result);
  }),

  sendOrder: asyncHandler(async (req, res) => {
    const accountId = Number(req.params.accountId);
    const result = await ordersService.sendOrder(accountId);
    res.json(result);
  }),

  moveSeat: asyncHandler(async (req, res) => {
    const itemId = Number(req.params.itemId);
    const { newSeatNo } = req.body || {};
    const result = await ordersService.moveItemSeat(itemId, newSeatNo);
    res.json(result);
  }),

  updateQty: asyncHandler(async (req, res) => {
    const itemId = Number(req.params.itemId);
    const { qty } = req.body || {};
    const result = await ordersService.updateItemQty(itemId, qty);
    res.json(result);
  }),

  voidItem: asyncHandler(async (req, res) => {
    const itemId = Number(req.params.itemId);
    const { reason, authorizedBy, authPin } = req.body || {};
    const result = await ordersService.voidItem({
      itemId,
      reason,
      authorizedBy,
      authPin,
    });
    res.json(result);
  }),
};

module.exports = ordersController;
