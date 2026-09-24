// tests/unit/inventory.test.js
// Pruebas unitarias de validación para el servicio de inventario y recetas

const test = require("node:test");
const assert = require("node:assert/strict");
const inventoryService = require("../../src/modules/inventory/inventory.service");
const { BadRequestError } = require("../../src/common/errors");

test("inventoryService validation tests", async (t) => {
  await t.test("createItem throws BadRequestError if name missing", async () => {
    await assert.rejects(
      () => inventoryService.createItem({ name: "" }),
      (err) => err instanceof BadRequestError && err.message.includes("name")
    );
  });

  await t.test("updateItem throws BadRequestError if id or name invalid", async () => {
    await assert.rejects(
      () => inventoryService.updateItem(0, { name: "Tomate" }),
      (err) => err instanceof BadRequestError && err.message.includes("id")
    );
    await assert.rejects(
      () => inventoryService.updateItem(1, { name: "" }),
      (err) => err instanceof BadRequestError && err.message.includes("name")
    );
  });

  await t.test("deleteItem throws BadRequestError if id invalid", async () => {
    await assert.rejects(
      () => inventoryService.deleteItem(0),
      (err) => err instanceof BadRequestError && err.message.includes("id")
    );
  });

  await t.test("getMovements throws BadRequestError if itemId invalid", async () => {
    await assert.rejects(
      () => inventoryService.getMovements(0),
      (err) => err instanceof BadRequestError && err.message.includes("itemId")
    );
  });

  await t.test("recordMovement throws BadRequestError if params missing or qty <= 0", async () => {
    await assert.rejects(
      () => inventoryService.recordMovement({ inventoryItemId: 0, type: "entry", quantity: 5 }),
      (err) => err instanceof BadRequestError && err.message.includes("inventoryItemId")
    );
    await assert.rejects(
      () => inventoryService.recordMovement({ inventoryItemId: 1, type: "entry", quantity: 0 }),
      (err) => err instanceof BadRequestError && err.message.includes("quantity")
    );
  });

  await t.test("getProductRecipe throws BadRequestError if productId missing", async () => {
    await assert.rejects(
      () => inventoryService.getProductRecipe(0),
      (err) => err instanceof BadRequestError && err.message.includes("productId")
    );
  });

  await t.test("saveProductRecipe throws BadRequestError if productId missing", async () => {
    await assert.rejects(
      () => inventoryService.saveProductRecipe(0, []),
      (err) => err instanceof BadRequestError && err.message.includes("productId")
    );
  });
});
