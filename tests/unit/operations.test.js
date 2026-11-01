// tests/unit/operations.test.js
const test = require("node:test");
const assert = require("node:assert/strict");

const operationsService = require("../../src/modules/settings/operations/operations.service");
const { BadRequestError } = require("../../src/common/errors");

test("operationsService unit & validation tests (subdomain operations)", async (t) => {
  await t.test("createOperationCenter throws BadRequestError if name is missing", async () => {
    await assert.rejects(
      async () => {
        await operationsService.createOperationCenter({ name: "" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /name es requerido/);
        return true;
      }
    );
  });

  await t.test("updateOperationCenter throws BadRequestError if centerId or name missing", async () => {
    await assert.rejects(
      async () => {
        await operationsService.updateOperationCenter(0, { name: "Bar" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /centerId y name son requeridos/);
        return true;
      }
    );
  });

  await t.test("getOperationCenterUsage throws BadRequestError if centerId is invalid", async () => {
    await assert.rejects(
      async () => {
        await operationsService.getOperationCenterUsage(null);
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /centerId es requerido/);
        return true;
      }
    );
  });

  await t.test("deleteOperationCenter throws BadRequestError if centerId is missing", async () => {
    await assert.rejects(
      async () => {
        await operationsService.deleteOperationCenter(undefined);
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /centerId es requerido/);
        return true;
      }
    );
  });

  await t.test("setOperationCenterProducts throws BadRequestError if centerId or productId missing", async () => {
    await assert.rejects(
      async () => {
        await operationsService.setOperationCenterProducts(0, 10);
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /centerId y productId son requeridos/);
        return true;
      }
    );
  });

  await t.test("setTerminalBinding throws BadRequestError if ipAddress or centerId missing", async () => {
    await assert.rejects(
      async () => {
        await operationsService.setTerminalBinding("", 1);
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /centerId e ip son requeridos/);
        return true;
      }
    );
  });

  await t.test("savePaymentMethod throws BadRequestError if code or label missing", async () => {
    await assert.rejects(
      async () => {
        await operationsService.savePaymentMethod({ code: "", label: "Efectivo" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /code y label son requeridos/);
        return true;
      }
    );
  });

  await t.test("deletePaymentMethod protects core payment methods (cash, card, cxc)", async () => {
    await assert.rejects(
      async () => {
        await operationsService.deletePaymentMethod("cash");
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /No se puede eliminar la forma de pago principal 'cash'/);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await operationsService.deletePaymentMethod("card");
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /No se puede eliminar la forma de pago principal 'card'/);
        return true;
      }
    );
  });

  await t.test("createDiscountPreset throws BadRequestError if name missing or invalid type", async () => {
    await assert.rejects(
      async () => {
        await operationsService.createDiscountPreset({ name: "Promo", type: "invalid_type" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /name y type \(percent\|fixed\) son requeridos/);
        return true;
      }
    );
  });

  await t.test("createTerminal throws BadRequestError if operationCenterId or name missing", async () => {
    await assert.rejects(
      async () => {
        await operationsService.createTerminal({ name: "Caja 1" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /operationCenterId y name son requeridos/);
        return true;
      }
    );
  });

  await t.test("createKitchenNote throws BadRequestError if label is empty", async () => {
    await assert.rejects(
      async () => {
        await operationsService.createKitchenNote({ label: "   " });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /label es requerido/);
        return true;
      }
    );
  });

  await t.test("updateKitchenNote throws BadRequestError if id is invalid", async () => {
    await assert.rejects(
      async () => {
        await operationsService.updateKitchenNote(0, { label: "Sin cebolla" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /id es requerido/);
        return true;
      }
    );
  });
});
