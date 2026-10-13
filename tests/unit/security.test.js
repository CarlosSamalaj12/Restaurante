// tests/unit/security.test.js
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TooManyRequestsError,
  BadRequestError,
  ForbiddenError,
} = require("../../src/common/errors");
const authService = require("../../src/modules/auth/auth.service");
const settingsService = require("../../src/modules/settings/settings.service");
const expensesService = require("../../src/modules/expenses/expenses.service");
const { hashPin, verifyPin } = require("../../src/common/pinHash");

test("Security validation and hardening tests", async (t) => {
  await t.test("TooManyRequestsError has status 429 and code TOO_MANY_REQUESTS", () => {
    const err = new TooManyRequestsError("Límite excedido");
    assert.equal(err.status, 429);
    assert.equal(err.code, "TOO_MANY_REQUESTS");
    assert.equal(err.message, "Límite excedido");
  });

  await t.test("PIN login rejects non-6-digit PINs with BadRequestError", async () => {
    await assert.rejects(
      async () => {
        await authService.pinLogin({ pin: "123", ip: "10.0.0.99" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /6 dígitos numéricos/);
        return true;
      }
    );
  });

  await t.test("PIN login rate limits and locks out after multiple failed attempts", async () => {
    const authRepository = require("../../src/modules/auth/auth.repository");
    const origFindUser = authRepository.findUserByPin;
    authRepository.findUserByPin = async () => null;

    const testIp = "192.168.100.42";
    try {
      // Realizamos 5 intentos con PIN inexistente
      for (let i = 0; i < 5; i++) {
        try {
          await authService.pinLogin({ pin: "999999", ip: testIp });
        } catch (err) {
          assert(err instanceof ForbiddenError);
        }
      }

      // El 6to intento debe ser bloqueado con TooManyRequestsError
      await assert.rejects(
        async () => {
          await authService.pinLogin({ pin: "999999", ip: testIp });
        },
        (err) => {
          assert(err instanceof TooManyRequestsError);
          assert.equal(err.status, 429);
          assert.match(err.message, /Demasiados intentos fallidos/);
          return true;
        }
      );
    } finally {
      authRepository.findUserByPin = origFindUser;
    }
  });

  await t.test("settingsService.saveLogo rejects SVG images (Stored XSS mitigation)", async () => {
    // Intento con SVG
    const svgBase64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxzY3JpcHQ+YWxlcnQoMSk8L3NjcmlwdD48L3N2Zz4=";
    await assert.rejects(
      async () => {
        await settingsService.saveLogo(svgBase64);
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /Formato de imagen inválido/);
        return true;
      }
    );
  });

  await t.test("expensesService.uploadVoucher rejects unapproved file extensions", async () => {
    await assert.rejects(
      async () => {
        await expensesService.uploadVoucher({
          base64: "data:text/html;base64,PGgxPkhlbGxvPC9oMT4=",
          fileName: "malicious.html",
        });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /Formato de comprobante no permitido/);
        return true;
      }
    );
  });

  await t.test("pinHash correctly hashes and verifies PINs", () => {
    const pin = "123456";
    const hashed = hashPin(pin);
    assert.ok(hashed);
    assert.equal(typeof hashed, "string");
    assert.equal(hashed.length, 64); // sha256 hex length

    assert.equal(verifyPin(pin, hashed), true);
    assert.equal(verifyPin("654321", hashed), false);
    assert.equal(verifyPin("", hashed), false);
    assert.equal(verifyPin(null, hashed), false);
  });
});
