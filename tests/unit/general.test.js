// tests/unit/general.test.js
const test = require("node:test");
const assert = require("node:assert/strict");

const generalService = require("../../src/modules/settings/general/general.service");
const { BadRequestError } = require("../../src/common/errors");

test("generalService unit & validation tests (subdomain general)", async (t) => {
  await t.test("updateBranding throws BadRequestError if restaurantName is missing", async () => {
    await assert.rejects(
      async () => {
        await generalService.updateBranding("");
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /restaurantName es requerido/);
        return true;
      }
    );
  });

  await t.test("saveLogo throws BadRequestError if logoData is missing or invalid", async () => {
    await assert.rejects(
      async () => {
        await generalService.saveLogo("");
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /logoData es requerido/);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await generalService.saveLogo("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=");
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /Formato de imagen inválido/);
        return true;
      }
    );
  });

  await t.test("saveLoginBg throws BadRequestError if bgData is invalid", async () => {
    await assert.rejects(
      async () => {
        await generalService.saveLoginBg("not-a-valid-data-uri");
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /Formato de imagen inválido/);
        return true;
      }
    );
  });

  await t.test("saveReceiptLogo throws BadRequestError if format is invalid", async () => {
    await assert.rejects(
      async () => {
        await generalService.saveReceiptLogo("data:text/plain;base64,SGVsbG8=");
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /Formato de imagen inválido/);
        return true;
      }
    );
  });

  await t.test("updateTipConfig throws BadRequestError if tip is out of bounds or NaN", async () => {
    await assert.rejects(
      async () => {
        await generalService.updateTipConfig(-1);
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /tipPercent debe estar entre 0 y 100/);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await generalService.updateTipConfig(101);
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /tipPercent debe estar entre 0 y 100/);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await generalService.updateTipConfig("not-a-number");
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /tipPercent debe estar entre 0 y 100/);
        return true;
      }
    );
  });
});
