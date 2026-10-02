// tests/unit/fel.test.js
// Pruebas unitarias para el servicio y drivers de Facturación Electrónica (FEL SAT)

const test = require("node:test");
const assert = require("node:assert/strict");
const felService = require("../../src/modules/fel/fel.service");
const DemoFelDriver = require("../../src/modules/fel/drivers/demo.driver");
const InfileFelDriver = require("../../src/modules/fel/drivers/infile.driver");
const DigifactFelDriver = require("../../src/modules/fel/drivers/digifact.driver");
const GuatefacturasFelDriver = require("../../src/modules/fel/drivers/guatefacturas.driver");
const { BadRequestError } = require("../../src/common/errors");

test("felService driver factory tests", async (t) => {
  await t.test("getDriver returns DemoFelDriver for demo or unspecified provider", () => {
    const d1 = felService.getDriver({ provider: "demo" });
    assert.ok(d1 instanceof DemoFelDriver);

    const d2 = felService.getDriver({});
    assert.ok(d2 instanceof DemoFelDriver);
  });

  await t.test("getDriver returns InfileFelDriver for infile provider", () => {
    const d = felService.getDriver({ provider: "infile" });
    assert.ok(d instanceof InfileFelDriver);
  });

  await t.test("getDriver returns DigifactFelDriver for digifact provider", () => {
    const d = felService.getDriver({ provider: "digifact" });
    assert.ok(d instanceof DigifactFelDriver);
  });

  await t.test("getDriver returns GuatefacturasFelDriver for guatefacturas provider", () => {
    const d = felService.getDriver({ provider: "guatefacturas" });
    assert.ok(d instanceof GuatefacturasFelDriver);
  });
});

test("DemoFelDriver functionality tests", async (t) => {
  const driver = new DemoFelDriver({ environment: "sandbox" });

  await t.test("consultarNit for CF returns CONSUMIDOR FINAL", async () => {
    const res = await driver.consultarNit("CF");
    assert.equal(res.nit, "CF");
    assert.equal(res.name, "CONSUMIDOR FINAL");
    assert.equal(res.valid, true);
  });

  await t.test("consultarNit for known NIT returns entity details", async () => {
    const res = await driver.consultarNit("12345678");
    assert.equal(res.nit, "12345678");
    assert.ok(res.name.includes("CORPORACION GASTRONOMICA"));
    assert.equal(res.valid, true);
  });

  await t.test("emitirFactura produces valid SAT DTE structure and calculates 12% IVA", async () => {
    const dte = await driver.emitirFactura({
      recipientNit: "CF",
      recipientName: "CONSUMIDOR FINAL",
      recipientAddress: "CIUDAD",
      total: 112.00,
      issuerNit: "99887766",
      items: [
        { product_name: "Hamburguesa Clásica", qty: 1, unit_price: 112.00, line_total: 112.00 }
      ]
    });

    assert.equal(dte.success, true);
    assert.ok(dte.uuid && dte.uuid.length === 36);
    assert.ok(dte.serie.startsWith("DEMO"));
    assert.ok(dte.dteNumber);
    assert.equal(dte.totalAmount, 112.00);
    // En Guatemala: Q112 / 1.12 = Q100 Base, Q12 IVA
    assert.equal(dte.netAmount, 100.00);
    assert.equal(dte.taxAmount, 12.00);
    assert.ok(dte.qrData.includes("portal.sat.gob.gt"));
  });

  await t.test("testConnection returns success in sandbox", async () => {
    const res = await driver.testConnection();
    assert.equal(res.success, true);
    assert.equal(res.environment, "sandbox");
  });
});

test("felService validation tests", async (t) => {
  await t.test("emitirFactura throws BadRequestError if accountId is 0 or invalid", async () => {
    await assert.rejects(
      () => felService.emitirFactura({ accountId: 0 }),
      (err) => err instanceof BadRequestError && err.message.includes("accountId")
    );
  });

  await t.test("getAccountInvoice throws BadRequestError if accountId is invalid", async () => {
    await assert.rejects(
      () => felService.getAccountInvoice(0),
      (err) => err instanceof BadRequestError && err.message.includes("accountId")
    );
  });
});
