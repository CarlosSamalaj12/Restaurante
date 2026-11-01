// tests/unit/printers.test.js
const test = require("node:test");
const assert = require("node:assert/strict");

const printersService = require("../../src/modules/settings/printers/printers.service");
const { BadRequestError } = require("../../src/common/errors");

test("printersService unit & validation tests (subdomain printers)", async (t) => {
  await t.test("setPrinterRoutingMode throws BadRequestError on invalid mode", async () => {
    await assert.rejects(
      async () => {
        await printersService.setPrinterRoutingMode("invalid_mode");
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /Modo de impresión inválido/);
        return true;
      }
    );
  });

  await t.test("createPrinter throws BadRequestError if name missing", async () => {
    await assert.rejects(
      async () => {
        await printersService.createPrinter({ name: "", ip: "192.168.1.50" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /nombre de la impresora es requerido/);
        return true;
      }
    );
  });

  await t.test("createPrinter throws BadRequestError if ip missing", async () => {
    await assert.rejects(
      async () => {
        await printersService.createPrinter({ name: "Caja 1", ip: "" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /dirección IP es requerida/);
        return true;
      }
    );
  });

  await t.test("createProductionCenter throws BadRequestError if name missing", async () => {
    await assert.rejects(
      async () => {
        await printersService.createProductionCenter({ name: "" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /name es requerido/);
        return true;
      }
    );
  });

  await t.test("saveRoutingRule throws BadRequestError if required ids are missing", async () => {
    await assert.rejects(
      async () => {
        await printersService.saveRoutingRule({ areaTrabajoId: 1, categoriaImpresionId: null });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /son requeridos/);
        return true;
      }
    );
  });

  await t.test("deleteRoutingRule throws BadRequestError if areaTrabajoId or categoriaImpresionId missing", async () => {
    await assert.rejects(
      async () => {
        await printersService.deleteRoutingRule(null, 1);
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /son requeridos/);
        return true;
      }
    );
  });

  await t.test("createPrintCategory throws BadRequestError if nombre missing", async () => {
    await assert.rejects(
      async () => {
        await printersService.createPrintCategory({ nombre: "" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /nombre es requerido/);
        return true;
      }
    );
  });
});
