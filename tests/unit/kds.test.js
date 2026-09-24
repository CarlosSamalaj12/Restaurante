// tests/unit/kds.test.js
// Pruebas unitarias de validación para el servicio KDS (pantallas de cocina)

const test = require("node:test");
const assert = require("node:assert/strict");
const kdsService = require("../../src/modules/kds/kds.service");
const { BadRequestError } = require("../../src/common/errors");

test("kdsService validation tests", async (t) => {
  await t.test("markItemDone throws BadRequestError if itemId invalid", async () => {
    await assert.rejects(
      () => kdsService.markItemDone(0),
      (err) => err instanceof BadRequestError && err.message.includes("itemId")
    );
  });

  await t.test("markAccountDone throws BadRequestError if accountId invalid", async () => {
    await assert.rejects(
      () => kdsService.markAccountDone(0),
      (err) => err instanceof BadRequestError && err.message.includes("accountId")
    );
  });
});
