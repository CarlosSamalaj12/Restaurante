#!/usr/bin/env node
/**
 * Smoke test — SamaPos
 *
 * Pings critical endpoints to verify the server is up and the main API
 * surface is alive. Designed to be runnable in CI (with --ci flag) or
 * manually on a developer machine.
 *
 * Exit codes:
 *   0 = all checks passed
 *   1 = one or more checks failed
 *   2 = setup error (couldn't reach the server at all)
 *
 * Usage:
 *   node scripts/smoke.js                       # use defaults (localhost:3000)
 *   node scripts/smoke.js --base-url http://localhost:3000
 *   node scripts/smoke.js --pin 1234            # also test authenticated endpoints
 *   node scripts/smoke.js --ci                  # CI mode: strict, no colors
 *   node scripts/smoke.js --verbose             # print response bodies on failure
 */

'use strict';

const BASE_URL_DEFAULT = 'http://localhost:3000';
const TIMEOUT_MS = 8000;
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

// ─── Args ────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    baseUrl: BASE_URL_DEFAULT,
    pin: null,
    ci: false,
    verbose: false,
    timeout: TIMEOUT_MS,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base-url') args.baseUrl = argv[++i];
    else if (a === '--pin') args.pin = argv[++i];
    else if (a === '--ci') args.ci = true;
    else if (a === '--verbose' || a === '-v') args.verbose = true;
    else if (a === '--timeout') args.timeout = Number(argv[++i]) || TIMEOUT_MS;
    else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: node scripts/smoke.js [--base-url URL] [--pin PIN] [--ci] [--verbose] [--timeout MS]',
      );
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(2);
    }
  }
  return args;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function c(color, text, enabled) {
  if (!enabled) return String(text);
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

class Reporter {
  constructor(args) {
    this.args = args;
    this.results = [];
  }
  record(id, name, ok, details = '') {
    this.results.push({ id, name, ok, details });
  }
  summary() {
    const passed = this.results.filter((r) => r.ok).length;
    const failed = this.results.length - passed;
    return { passed, failed, total: this.results.length };
  }
  print() {
    const useColor = !this.args.ci;
    const { passed, failed, total } = this.summary();
    console.log('');
    console.log(c('bold', '─'.repeat(60), useColor));
    console.log(c('bold', 'SMOKE TEST RESULTS', useColor));
    console.log(c('bold', '─'.repeat(60), useColor));
    for (const r of this.results) {
      const status = r.ok
        ? c('green', '✓ PASS', useColor)
        : c('red', '✗ FAIL', useColor);
      const id = c('dim', r.id.padEnd(12), useColor);
      const name = r.name;
      console.log(`${status}  ${id}  ${name}`);
      if (r.details && (!r.ok || this.args.verbose)) {
        console.log(`         ${c('dim', r.details, useColor)}`);
      }
    }
    console.log(c('bold', '─'.repeat(60), useColor));
    const passLabel = c('green', `${passed} passed`, useColor);
    const failLabel =
      failed > 0
        ? c('red', `${failed} failed`, useColor)
        : c('dim', `${failed} failed`, useColor);
    console.log(`Total: ${total}  •  ${passLabel}  •  ${failLabel}`);
    console.log(c('bold', '─'.repeat(60), useColor));
  }
}

// ─── Checks ──────────────────────────────────────────────────────────────────

async function checkServerReachable(baseUrl, reporter) {
  try {
    const r = await fetchWithTimeout(`${baseUrl}/`, { method: 'GET' });
    if (r.status >= 500) {
      reporter.record(
        'SERVER',
        'GET / returns OK (not 5xx)',
        false,
        `status=${r.status}`,
      );
      return false;
    }
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('text/html') && !ct.includes('application/json')) {
      reporter.record(
        'SERVER',
        'GET / returns HTML/JSON',
        false,
        `content-type=${ct}`,
      );
      return false;
    }
    reporter.record(
      'SERVER',
      'GET / returns HTML/JSON',
      true,
      `status=${r.status}, content-type=${ct}`,
    );
    return true;
  } catch (err) {
    reporter.record(
      'SERVER',
      'GET / is reachable',
      false,
      `${err.name}: ${err.message}`,
    );
    return false;
  }
}

async function checkJsonEndpoint(baseUrl, path, id, name, reporter) {
  try {
    const r = await fetchWithTimeout(`${baseUrl}${path}`, {
      headers: { 'X-Terminal-Serial': 'ca5dc38b-a695-4b48-bf16-89392eedf74d' },
    });
    if (r.status >= 500) {
      reporter.record(id, name, false, `status=${r.status}`);
      return null;
    }
    // Some endpoints can return 401/403 — that's "alive", not a fail.
    if (r.status === 401 || r.status === 403) {
      reporter.record(
        id,
        `${name} (alive, auth required)`,
        true,
        `status=${r.status}`,
      );
      return null;
    }
    if (r.status >= 400) {
      reporter.record(id, name, false, `status=${r.status}`);
      return null;
    }
    let body = null;
    try {
      body = await r.json();
    } catch {
      reporter.record(id, name, false, 'invalid JSON body');
      return null;
    }
    reporter.record(id, name, true, `status=${r.status}`);
    return body;
  } catch (err) {
    reporter.record(id, name, false, `${err.name}: ${err.message}`);
    return null;
  }
}

async function checkPinLogin(baseUrl, pin, reporter) {
  let r;
  try {
    r = await fetchWithTimeout(`${baseUrl}/api/auth/pin-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Terminal-Serial': '427ab413-13de-4c7c-a8c0-c6a4b8f55f24',
      },
      body: JSON.stringify({ pin }),
    });
  } catch (err) {
    reporter.record(
      'AUTH',
      'POST /api/auth/pin-login',
      false,
      `${err.name}: ${err.message}`,
    );
    return null;
  }
  if (r.status >= 500) {
    reporter.record('AUTH', 'POST /api/auth/pin-login', false, `status=${r.status}`);
    return null;
  }
  if (r.status === 401 || r.status === 400) {
    reporter.record(
      'AUTH',
      'POST /api/auth/pin-login (PIN rejected — check your test data)',
      false,
      `status=${r.status}`,
    );
    return null;
  }
  if (!r.ok) {
    reporter.record('AUTH', 'POST /api/auth/pin-login', false, `status=${r.status}`);
    return null;
  }
  let body;
  try {
    body = await r.json();
  } catch {
    reporter.record('AUTH', 'POST /api/auth/pin-login', false, 'invalid JSON body');
    return null;
  }
  if (!body.token) {
    reporter.record(
      'AUTH',
      'POST /api/auth/pin-login',
      false,
      'response missing token',
    );
    return null;
  }
  reporter.record('AUTH', 'POST /api/auth/pin-login → got token', true, '');
  return body.token;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);
  const useColor = !args.ci;
  const reporter = new Reporter(args);

  if (!args.ci) {
    console.log(
      c('cyan', `→ Smoke test against ${args.baseUrl}`, useColor),
    );
    if (args.pin) console.log(c('dim', `  (with PIN auth)`, useColor));
  }

  // 1) Server reachability
  const reachable = await checkServerReachable(args.baseUrl, reporter);
  if (!reachable) {
    reporter.print();
    if (!args.ci) {
      console.error(
        c(
          'red',
          `\n✗ Server not reachable at ${args.baseUrl}.`,
          useColor,
        ),
      );
      console.error(
        c(
          'dim',
          `  Did you run \`npm start\` in another terminal?`,
          useColor,
        ),
      );
    }
    process.exit(2);
  }

  // 2) Public endpoints (no auth)
  await checkJsonEndpoint(
    args.baseUrl,
    '/api/bootstrap',
    'BOOT',
    'GET /api/bootstrap',
    reporter,
  );
  await checkJsonEndpoint(
    args.baseUrl,
    '/api/license/status',
    'LIC',
    'GET /api/license/status',
    reporter,
  );
  await checkJsonEndpoint(
    args.baseUrl,
    '/api/catalog/categories',
    'CAT',
    'GET /api/catalog/categories',
    reporter,
  );

  // 3) Authenticated endpoints (if --pin provided)
  if (args.pin) {
    const token = await checkPinLogin(args.baseUrl, args.pin, reporter);
    if (token) {
      const authHeaders = {
        'X-Auth-Token': token,
        'X-Terminal-Serial': '427ab413-13de-4c7c-a8c0-c6a4b8f55f24',
      };
      // Hit a few authenticated endpoints
      const authChecks = [
        ['/api/tables', 'TBL', 'GET /api/tables'],
        ['/api/settings', 'SET', 'GET /api/settings'],
        ['/api/shifts/active?centerId=1', 'SHIFT', 'GET /api/shifts/active'],
        ['/api/inventory/items', 'INV', 'GET /api/inventory/items'],
        ['/api/cxc/pending', 'CXC', 'GET /api/cxc/pending'],
      ];
      for (const [path, id, name] of authChecks) {
        try {
          const r = await fetchWithTimeout(`${args.baseUrl}${path}`, {
            headers: authHeaders,
          });
          if (r.status >= 500) {
            reporter.record(id, name, false, `status=${r.status}`);
          } else {
            reporter.record(
              id,
              name,
              true,
              `status=${r.status}`,
            );
          }
        } catch (err) {
          reporter.record(id, name, false, `${err.name}: ${err.message}`);
        }
      }
    }
  }

  // Done
  reporter.print();
  const { failed } = reporter.summary();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(2);
});
