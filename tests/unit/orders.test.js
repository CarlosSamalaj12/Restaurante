// tests/unit/orders.test.js
// Pruebas unitarias de validación para el servicio de órdenes e ítems

const test = require("node:test");
const assert = require("node:assert/strict");
const ordersService = require("../../src/modules/orders/orders.service");
const { BadRequestError } = require("../../src/common/errors");

test("ordersService validation tests", async (t) => {
  await t.test("addItemToAccount throws BadRequestError if accountId invalid", async () => {
    await assert.rejects(
      () => ordersService.addItemToAccount({ accountId: 0, productId: 1, qty: 1 }),
      (err) => err instanceof BadRequestError && err.message.includes("accountId")
    );
  });

  await t.test("addItemToAccount throws BadRequestError if productId missing", async () => {
    await assert.rejects(
      () => ordersService.addItemToAccount({ accountId: 1, productId: null, qty: 1 }),
      (err) => err instanceof BadRequestError && err.message.includes("productId")
    );
  });

  await t.test("addItemToAccount throws BadRequestError if qty <= 0", async () => {
    await assert.rejects(
      () => ordersService.addItemToAccount({ accountId: 1, productId: 1, qty: 0 }),
      (err) => err instanceof BadRequestError && err.message.includes("qty")
    );
  });

  await t.test("sendOrder throws BadRequestError if accountId invalid", async () => {
    await assert.rejects(
      () => ordersService.sendOrder({ accountId: 0, waiterId: 1 }),
      (err) => err instanceof BadRequestError && err.message.includes("accountId")
    );
  });

  await t.test("moveItemSeat throws BadRequestError if itemId or newSeatNo missing", async () => {
    await assert.rejects(
      () => ordersService.moveItemSeat(0, 1),
      (err) => err instanceof BadRequestError && err.message.includes("itemId")
    );
    await assert.rejects(
      () => ordersService.moveItemSeat(1, 0),
      (err) => err instanceof BadRequestError && err.message.includes("itemId y newSeatNo")
    );
  });

  await t.test("updateItemQty throws BadRequestError if qty <= 0 or itemId missing", async () => {
    await assert.rejects(
      () => ordersService.updateItemQty(1, 0),
      (err) => err instanceof BadRequestError && err.message.includes("qty")
    );
    await assert.rejects(
      () => ordersService.updateItemQty(0, 2),
      (err) => err instanceof BadRequestError && err.message.includes("itemId")
    );
  });

  await t.test("voidItem throws BadRequestError if itemId invalid", async () => {
    await assert.rejects(
      () => ordersService.voidItem({ itemId: 0 }),
      (err) => err instanceof BadRequestError && err.message.includes("itemId")
    );
  });
});
