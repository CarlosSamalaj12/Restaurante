// tests/unit/payments.test.js
// Pruebas unitarias de validación para el servicio de pagos y descuentos

const test = require("node:test");
const assert = require("node:assert/strict");
const paymentsService = require("../../src/modules/payments/payments.service");
const { BadRequestError } = require("../../src/common/errors");

test("paymentsService validation tests", async (t) => {
  await t.test("addDiscount throws BadRequestError if accountId is invalid", async () => {
    await assert.rejects(
      () => paymentsService.addDiscount({ accountId: 0, type: "percent", value: 10, createdBy: 1 }),
      (err) => err instanceof BadRequestError && err.message.includes("accountId")
    );
  });

  await t.test("addDiscount throws BadRequestError if type is invalid", async () => {
    await assert.rejects(
      () => paymentsService.addDiscount({ accountId: 1, type: "invalid_type", value: 10, createdBy: 1 }),
      (err) => err instanceof BadRequestError && err.message.includes("type")
    );
  });

  await t.test("addDiscount throws BadRequestError if value <= 0 or createdBy missing", async () => {
    await assert.rejects(
      () => paymentsService.addDiscount({ accountId: 1, type: "percent", value: 0, createdBy: 1 }),
      (err) => err instanceof BadRequestError && err.message.includes("value y createdBy")
    );
    await assert.rejects(
      () => paymentsService.addDiscount({ accountId: 1, type: "percent", value: 10, createdBy: null }),
      (err) => err instanceof BadRequestError && err.message.includes("value y createdBy")
    );
  });

  await t.test("addPayment throws BadRequestError if accountId invalid", async () => {
    await assert.rejects(
      () => paymentsService.addPayment({ accountId: 0, method: "cash", amount: 50 }),
      (err) => err instanceof BadRequestError && err.message.includes("accountId")
    );
  });

  await t.test("addPayment throws BadRequestError if method missing or amount <= 0", async () => {
    await assert.rejects(
      () => paymentsService.addPayment({ accountId: 1, method: "", amount: 50 }),
      (err) => err instanceof BadRequestError && err.message.includes("method y amount")
    );
    await assert.rejects(
      () => paymentsService.addPayment({ accountId: 1, method: "cash", amount: 0 }),
      (err) => err instanceof BadRequestError && err.message.includes("method y amount")
    );
  });

  await t.test("closeAccount throws BadRequestError if accountId invalid", async () => {
    await assert.rejects(
      () => paymentsService.closeAccount({ accountId: 0 }),
      (err) => err instanceof BadRequestError && err.message.includes("accountId")
    );
  });
});
