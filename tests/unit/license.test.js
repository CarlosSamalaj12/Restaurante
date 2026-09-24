'use strict';

/**
 * Unit tests for src/license.js — pure functions only.
 *
 * We mock `src/db.js` via the require cache BEFORE loading the license module
 * so that the test doesn't try to open a real MySQL pool. The functions tested
 * here don't touch the DB anyway, but the module imports it at the top.
 *
 * Run with: npm run test:unit
 *
 * What we test (only public surface of the module):
 *   - signLicenseToken
 *   - verifyLicenseToken
 *   - isDevBypass
 *   - constants (TOKEN_TTL_SECONDS, HEARTBEAT_STALE_SECONDS)
 *
 * Internal helpers (b64urlEncode/Decode, devBypassSerialList) are not
 * exported and we don't reach into them — they get covered indirectly by
 * the sign/verify tests.
 */

const Module = require('node:module');

// ─── Stub the db module before license.js is required ─────────────────────────
// The license module does `require('./db')` at the top, which creates a
// mysql2 connection pool. We don't want that in tests, so we intercept.
const dbStub = { query: async () => [[], []], pool: {} };
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (
    typeof request === 'string' &&
    (request === './db' || request === '../db') &&
    parent &&
    parent.filename &&
    parent.filename.replace(/\\/g, '/').endsWith('/src/license.js')
  ) {
    return dbStub;
  }
  return originalLoad.call(this, request, parent, isMain);
};

// Now we can safely require license
process.env.LICENSE_HMAC_SECRET = 'test-secret-please-do-not-use-in-prod';
// Make sure we don't accidentally hit a real dev bypass in tests
delete process.env.LICENSE_DEV_MODE;
delete process.env.LICENSE_DEV_SERIALS;

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const license = require('../../src/license');

// ─── Sanity checks on the module surface ──────────────────────────────────────

test('module exports the expected public surface', () => {
  for (const key of [
    'signLicenseToken',
    'verifyLicenseToken',
    'isDevBypass',
    'TOKEN_TTL_SECONDS',
    'HEARTBEAT_STALE_SECONDS',
  ]) {
    assert.ok(license[key] !== undefined, `expected export: ${key}`);
  }
  assert.equal(typeof license.signLicenseToken, 'function');
  assert.equal(typeof license.verifyLicenseToken, 'function');
  assert.equal(typeof license.isDevBypass, 'function');
  assert.equal(typeof license.TOKEN_TTL_SECONDS, 'number');
  assert.equal(typeof license.HEARTBEAT_STALE_SECONDS, 'number');
});

test('constants are within sane ranges', () => {
  // 7 días de gracia offline
  assert.equal(license.TOKEN_TTL_SECONDS, 7 * 24 * 60 * 60);
  // 2 horas de heartbeat stale
  assert.equal(license.HEARTBEAT_STALE_SECONDS, 2 * 60 * 60);
});

// ─── signLicenseToken ─────────────────────────────────────────────────────────

describe('signLicenseToken', () => {
  test('produces a string with body.signature format', () => {
    const token = license.signLicenseToken({ user: 'test' });
    assert.equal(typeof token, 'string');
    const parts = token.split('.');
    assert.equal(parts.length, 2, 'expected body.signature');
    assert.ok(parts[0].length > 0, 'body is not empty');
    assert.ok(parts[1].length > 0, 'signature is not empty');
  });

  test('different payloads produce different tokens', () => {
    const a = license.signLicenseToken({ user: 'a' });
    const b = license.signLicenseToken({ user: 'b' });
    assert.notEqual(a, b);
  });

  test('same payload + same secret = same token (deterministic)', () => {
    const payload = { user: 'test', exp: 1234567890 };
    const a = license.signLicenseToken(payload);
    const b = license.signLicenseToken(payload);
    assert.equal(a, b);
  });
});

// ─── verifyLicenseToken ───────────────────────────────────────────────────────

describe('verifyLicenseToken', () => {
  test('accepts a token signed with the same secret', () => {
    const payload = { user: 'test', exp: 1234567890, role: 'admin' };
    const token = license.signLicenseToken(payload);
    const verified = license.verifyLicenseToken(token);
    assert.deepEqual(verified, payload);
  });

  test('rejects a token with tampered signature', () => {
    const token = license.signLicenseToken({ user: 'test' });
    // Flip the last 4 chars of the signature
    const tampered =
      token.slice(0, -4) +
      String.fromCharCode(
        token.charCodeAt(token.length - 1) ^ 1,
        token.charCodeAt(token.length - 2) ^ 1,
        token.charCodeAt(token.length - 3) ^ 1,
        token.charCodeAt(token.length - 4) ^ 1,
      );
    assert.equal(license.verifyLicenseToken(tampered), null);
  });

  test('rejects a token with a completely bogus signature', () => {
    const token = license.signLicenseToken({ user: 'test' });
    const [body] = token.split('.');
    // Bogus base64url body of "modified payload" with a fake signature
    const fakeToken = `${body}.AAAA`;
    assert.equal(license.verifyLicenseToken(fakeToken), null);
  });

  test('rejects garbage input', () => {
    assert.equal(license.verifyLicenseToken('not-a-token'), null);
    assert.equal(license.verifyLicenseToken('only.one.dot'), null);
    assert.equal(license.verifyLicenseToken(''), null);
    assert.equal(license.verifyLicenseToken(null), null);
    assert.equal(license.verifyLicenseToken(undefined), null);
    assert.equal(license.verifyLicenseToken(123), null);
    assert.equal(license.verifyLicenseToken({}), null);
    assert.equal(license.verifyLicenseToken('a.b.c'), null);
  });
});

// ─── isDevBypass ──────────────────────────────────────────────────────────────

describe('isDevBypass', () => {
  test('LICENSE_DEV_MODE=true authorizes any serial', () => {
    process.env.LICENSE_DEV_MODE = 'true';
    process.env.LICENSE_DEV_SERIALS = '';
    assert.equal(license.isDevBypass('any-serial'), true);
    assert.equal(license.isDevBypass('123'), true);
  });

  test('LICENSE_DEV_MODE accepts common truthy values', () => {
    for (const v of ['1', 'true', 'yes', 'on', 'TRUE', 'Yes']) {
      process.env.LICENSE_DEV_MODE = v;
      process.env.LICENSE_DEV_SERIALS = '';
      assert.equal(
        license.isDevBypass('any-serial'),
        true,
        `expected true for LICENSE_DEV_MODE=${v}`,
      );
    }
  });

  test('LICENSE_DEV_MODE falsy values do not auto-allow', () => {
    for (const v of ['0', 'false', 'no', 'off', '', 'random']) {
      process.env.LICENSE_DEV_MODE = v;
      process.env.LICENSE_DEV_SERIALS = '';
      assert.equal(
        license.isDevBypass('any-serial'),
        false,
        `expected false for LICENSE_DEV_MODE=${v}`,
      );
    }
  });

  test('LICENSE_DEV_SERIALS authorizes listed serials', () => {
    process.env.LICENSE_DEV_MODE = '';
    process.env.LICENSE_DEV_SERIALS = 'abc-123, def-456 , ghi-789';
    assert.equal(license.isDevBypass('abc-123'), true);
    assert.equal(license.isDevBypass('def-456'), true);
    assert.equal(license.isDevBypass('ghi-789'), true);
    assert.equal(license.isDevBypass('xyz-000'), false);
  });

  test('LICENSE_DEV_SERIALS is case-insensitive', () => {
    process.env.LICENSE_DEV_MODE = '';
    process.env.LICENSE_DEV_SERIALS = 'Abc-123';
    assert.equal(license.isDevBypass('abc-123'), true);
    assert.equal(license.isDevBypass('ABC-123'), true);
    assert.equal(license.isDevBypass('AbC-123'), true);
  });

  test('handles empty / null / non-string serial', () => {
    process.env.LICENSE_DEV_MODE = '';
    process.env.LICENSE_DEV_SERIALS = '';
    assert.equal(license.isDevBypass(null), false);
    assert.equal(license.isDevBypass(undefined), false);
    assert.equal(license.isDevBypass(''), false);
    assert.equal(license.isDevBypass(123), false);
    assert.equal(license.isDevBypass({}), false);
    assert.equal(license.isDevBypass([]), false);
  });
});

// ─── Integration: sign + verify roundtrip ─────────────────────────────────────

describe('integration: sign + verify roundtrip', () => {
  test('a real-looking license payload survives sign/verify', () => {
    const payload = {
      v: 1,
      serial: '11111111-2222-3333-4444-555555555555',
      licenseId: 42,
      tier: 'standard',
      maxTerminals: 3,
      validUntil: '2026-12-31T23:59:59Z',
      issuedAt: 1700000000,
    };
    const token = license.signLicenseToken(payload);
    const verified = license.verifyLicenseToken(token);
    assert.deepEqual(verified, payload);
  });

  test('a payload with unicode survives sign/verify', () => {
    const payload = { restaurant: 'Café Ñoño 中文 🍕' };
    const token = license.signLicenseToken(payload);
    const verified = license.verifyLicenseToken(token);
    assert.deepEqual(verified, payload);
  });
});
