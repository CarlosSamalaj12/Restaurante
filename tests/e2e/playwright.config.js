// @ts-check
/**
 * Playwright config — SamaPos E2E
 *
 * Assumes both servers are already running:
 *   - Backend: http://localhost:3000 (the Express server)
 *   - Frontend: http://localhost:5173 (the Vite dev server)
 *
 * In CI (GitHub Actions), the workflow starts both before running these tests.
 * Locally, run them in two terminals:
 *   npm start
 *   cd react-app && npm run dev
 *
 * Override the test PIN with E2E_ADMIN_PIN (default: 1234).
 */

const { defineConfig, devices } = require('@playwright/test');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const ADMIN_PIN = process.env.E2E_ADMIN_PIN || '1234';

module.exports = defineConfig({
  testDir: './tests',
  // Don't run anything from ../unit — those are node:test unit tests
  testIgnore: ['**/node_modules/**', '../unit/**'],
  // Serial within a file, parallel across files. E2E tests share the same DB
  // and license, so they can't safely run in parallel within a file.
  fullyParallel: false,
  workers: 1,
  // 30s default timeout — some flows (loading dashboards) can be slow
  timeout: 30_000,
  expect: { timeout: 5_000 },
  // Retry flaky tests in CI only
  retries: process.env.CI ? 2 : 0,
  // Output: line reporter is the most readable in CI logs
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Clear localStorage between tests so each test starts fresh
    storageState: undefined,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Expose the test PIN to the tests via env
  metadata: {
    baseUrl: BASE_URL,
    adminPin: ADMIN_PIN,
  },
});
