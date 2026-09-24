// tests/unit/cxc.test.js
// Pruebas unitarias de validación para el servicio CXC (Cuentas por Cobrar)

const test = require("node:test");
const assert = require("node:assert/strict");
const cxcService = require("../../src/modules/cxc/cxc.service");
const { BadRequestError } = require("../../src/common/errors");

test("cxcService validation tests", async (t) => {
  await t.test("createArea throws BadRequestError if name missing", async () => {
    await assert.rejects(
      () => cxcService.createArea({ name: "" }),
      (err) => err instanceof BadRequestError && err.message.includes("Nombre")
    );
  });

  await t.test("updateArea throws BadRequestError if areaId invalid", async () => {
    await assert.rejects(
      () => cxcService.updateArea(0, { name: "Zona A" }),
      (err) => err instanceof BadRequestError && err.message.includes("areaId")
    );
  });

  await t.test("createClient throws BadRequestError if full_name missing", async () => {
    await assert.rejects(
      () => cxcService.createClient({ full_name: "" }),
      (err) => err instanceof BadRequestError && err.message.includes("Nombre")
    );
  });

  await t.test("updateClient throws BadRequestError if clientId invalid", async () => {
    await assert.rejects(
      () => cxcService.updateClient(0, { full_name: "Cliente" }),
      (err) => err instanceof BadRequestError && err.message.includes("clientId")
    );
  });

  await t.test("createAccount throws BadRequestError if client_id or amount missing", async () => {
    await assert.rejects(
      () => cxcService.createAccount({ client_id: 0, amount: 100 }),
      (err) => err instanceof BadRequestError && err.message.includes("client_id y amount")
    );
    await assert.rejects(
      () => cxcService.createAccount({ client_id: 1, amount: 0 }),
      (err) => err instanceof BadRequestError && err.message.includes("client_id y amount")
    );
  });

  await t.test("addAccountPayment throws BadRequestError if cxcAccountId or amount missing", async () => {
    await assert.rejects(
      () => cxcService.addAccountPayment(0, { amount: 50 }),
      (err) => err instanceof BadRequestError && err.message.includes("cxcAccountId")
    );
    await assert.rejects(
      () => cxcService.addAccountPayment(1, { amount: 0 }),
      (err) => err instanceof BadRequestError && err.message.includes("Monto")
    );
  });

  await t.test("payGlobal throws BadRequestError if clientId or amount <= 0", async () => {
    await assert.rejects(
      () => cxcService.payGlobal(0, { amount: 100 }),
      (err) => err instanceof BadRequestError && err.message.includes("clientId y monto")
    );
    await assert.rejects(
      () => cxcService.payGlobal(1, { amount: 0 }),
      (err) => err instanceof BadRequestError && err.message.includes("clientId y monto")
    );
  });

  await t.test("checkDiscount throws BadRequestError if clientId or productId missing", async () => {
    await assert.rejects(
      () => cxcService.checkDiscount(0, 1),
      (err) => err instanceof BadRequestError && err.message.includes("client_id y product_id")
    );
    await assert.rejects(
      () => cxcService.checkDiscount(1, 0),
      (err) => err instanceof BadRequestError && err.message.includes("client_id y product_id")
    );
  });
});
