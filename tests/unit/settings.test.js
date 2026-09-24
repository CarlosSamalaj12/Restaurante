// tests/unit/settings.test.js
const test = require("node:test");
const assert = require("node:assert/strict");

const settingsService = require("../../src/modules/settings/settings.service");
const { BadRequestError } = require("../../src/common/errors");

test("settingsService validation tests", async (t) => {
  await t.test("updateBranding throws BadRequestError if restaurantName missing", async () => {
    await assert.rejects(
      async () => {
        await settingsService.updateBranding("");
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /restaurantName es requerido/);
        return true;
      }
    );
  });

  await t.test("saveLogo throws BadRequestError if invalid format", async () => {
    await assert.rejects(
      async () => {
        await settingsService.saveLogo("invalid-base64");
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /Formato de imagen inválido/);
        return true;
      }
    );
  });

  await t.test("updateTipConfig throws BadRequestError if tip out of bounds", async () => {
    await assert.rejects(
      async () => {
        await settingsService.updateTipConfig(-5);
      },
      (err) => {
        assert(err instanceof BadRequestError);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await settingsService.updateTipConfig(150);
      },
      (err) => {
        assert(err instanceof BadRequestError);
        return true;
      }
    );
  });

  await t.test("updateUserModules throws BadRequestError if userId missing", async () => {
    await assert.rejects(
      async () => {
        await settingsService.updateUserModules(0, ["restaurant"]);
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /userId es requerido/);
        return true;
      }
    );
  });

  await t.test("createRole throws BadRequestError if name or slug missing", async () => {
    await assert.rejects(
      async () => {
        await settingsService.createRole({ name: "Admin" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /name y slug son requeridos/);
        return true;
      }
    );
  });

  await t.test("createOperationCenter throws BadRequestError if name missing", async () => {
    await assert.rejects(
      async () => {
        await settingsService.createOperationCenter({});
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /name es requerido/);
        return true;
      }
    );
  });

  await t.test("savePaymentMethod throws BadRequestError if code or label missing", async () => {
    await assert.rejects(
      async () => {
        await settingsService.savePaymentMethod({});
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /code y label son requeridos/);
        return true;
      }
    );
  });

  await t.test("createStaffUser throws BadRequestError if fullName or pinCode missing", async () => {
    await assert.rejects(
      async () => {
        await settingsService.createStaffUser({ fullName: "Carlos" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /fullName y pinCode son requeridos/);
        return true;
      }
    );
  });

  await t.test("createTerminal throws BadRequestError if operationCenterId or name missing", async () => {
    await assert.rejects(
      async () => {
        await settingsService.createTerminal({ name: "Caja 1" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /operationCenterId y name son requeridos/);
        return true;
      }
    );
  });
});
