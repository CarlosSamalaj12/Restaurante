// tests/unit/digital_menu.test.js
// Pruebas unitarias para seguridad criptográfica, validaciones y permisos del Menú Digital

const { test, describe } = require("node:test");
const assert = require("node:assert");
const {
  generateTableToken,
  generateRandomSalt,
} = require("../../src/modules/digital_menu/middleware/validateTableToken");
const digitalMenuService = require("../../src/modules/digital_menu/digital_menu.service");
const { BadRequestError, ForbiddenError } = require("../../src/common/errors");

describe("Digital Menu Cryptographic Table Tokens", () => {
  test("generateTableToken produces valid deterministic HMAC-SHA256 hash", () => {
    const salt = "test_salt_123456";
    const token1 = generateTableToken(5, 1, salt);
    const token2 = generateTableToken(5, 1, salt);
    assert.strictEqual(token1, token2);
    assert.strictEqual(typeof token1, "string");
    assert.strictEqual(token1.length, 64); // SHA-256 hex string length
  });

  test("different tableId or salt produces distinct token signatures (tamper protection)", () => {
    const salt = "test_salt_123456";
    const tokenMesa5 = generateTableToken(5, 1, salt);
    const tokenMesa6 = generateTableToken(6, 1, salt);
    const tokenAltSalt = generateTableToken(5, 1, "different_salt_789");

    assert.notStrictEqual(tokenMesa5, tokenMesa6);
    assert.notStrictEqual(tokenMesa5, tokenAltSalt);
  });

  test("generateRandomSalt generates a unique random hex string", () => {
    const salt1 = generateRandomSalt();
    const salt2 = generateRandomSalt();
    assert.strictEqual(typeof salt1, "string");
    assert.notStrictEqual(salt1, salt2);
  });
});

describe("Digital Menu Service Validation & Security Tests", () => {
  test("toggleModuleEnabled rejects non-superadmin users with ForbiddenError", async () => {
    const regularAdmin = { id: 1, role: "admin", full_name: "Admin Normal" };
    const waiter = { id: 2, role: "waiter", full_name: "Mesero" };

    await assert.rejects(
      async () => {
        await digitalMenuService.toggleModuleEnabled(true, regularAdmin);
      },
      (err) => err instanceof ForbiddenError && err.status === 403
    );

    await assert.rejects(
      async () => {
        await digitalMenuService.toggleModuleEnabled(true, waiter);
      },
      (err) => err instanceof ForbiddenError && err.status === 403
    );
  });

  test("createMenu throws BadRequestError if name or slug missing", async () => {
    await assert.rejects(
      async () => {
        await digitalMenuService.createMenu({ name: "" });
      },
      (err) => err instanceof BadRequestError && err.status === 400
    );

    await assert.rejects(
      async () => {
        await digitalMenuService.createMenu({ name: "Menú Nuevo", slug: "" });
      },
      (err) => err instanceof BadRequestError && err.status === 400
    );
  });

  test("bindDeviceSession throws BadRequestError if tableId or deviceFingerprint missing", async () => {
    await assert.rejects(
      async () => {
        await digitalMenuService.bindDeviceSession({ tableId: null, deviceFingerprint: "fp_123" });
      },
      (err) => err instanceof BadRequestError && err.status === 400
    );

    await assert.rejects(
      async () => {
        await digitalMenuService.bindDeviceSession({ tableId: 5, deviceFingerprint: "" });
      },
      (err) => err instanceof BadRequestError && err.status === 400
    );
  });

  test("sendGuestOrder throws BadRequestError if items array is empty or invalid", async () => {
    await assert.rejects(
      async () => {
        await digitalMenuService.sendGuestOrder({ sessionToken: "dummy", items: [] });
      },
      (err) => err instanceof BadRequestError && err.status === 400
    );

    await assert.rejects(
      async () => {
        await digitalMenuService.sendGuestOrder({ sessionToken: "dummy", items: null });
      },
      (err) => err instanceof BadRequestError && err.status === 400
    );
  });

  test("callWaiter throws BadRequestError if sessionToken is missing", async () => {
    await assert.rejects(
      async () => {
        await digitalMenuService.callWaiter("");
      },
      (err) => err instanceof BadRequestError && err.status === 400
    );
  });

  test("requestBill throws BadRequestError if sessionToken is missing", async () => {
    await assert.rejects(
      async () => {
        await digitalMenuService.requestBill("");
      },
      (err) => err instanceof BadRequestError && err.status === 400
    );
  });

  test("attendWaiterCall throws BadRequestError if tableId is missing", async () => {
    await assert.rejects(
      async () => {
        await digitalMenuService.attendWaiterCall(null);
      },
      (err) => err instanceof BadRequestError && err.status === 400
    );
  });

  test("accountsRepository exposes query and waiter call/payment request methods", () => {
    const accountsRepository = require("../../src/modules/accounts/accounts.repository");
    assert.strictEqual(typeof accountsRepository.query, "function", "accountsRepository.query must be a function");
    assert.strictEqual(typeof accountsRepository.updateCallWaiterStatus, "function", "updateCallWaiterStatus must be a function");
    assert.strictEqual(typeof accountsRepository.updateRequestedPaymentMethod, "function", "updateRequestedPaymentMethod must be a function");
    assert.strictEqual(typeof accountsRepository.dismissWaiterCallByTable, "function", "dismissWaiterCallByTable must be a function");
  });
});

