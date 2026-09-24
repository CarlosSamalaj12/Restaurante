// @ts-check
/**
 * Shared helpers for SamaPos E2E tests.
 *
 * These are utilities, not test files. Playwright will only pick up `*.spec.js`.
 */

const { expect } = require('@playwright/test');

const ADMIN_PIN = process.env.E2E_ADMIN_PIN || '1234';
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

/**
 * Log in with the admin PIN via the PIN pad.
 *
 * The login is a button-based PIN pad that also accepts physical keyboard.
 * After 4 digits, press Enter to submit.
 *
 * If there's a "Select terminal" step after login, click the first terminal.
 */
async function loginAsAdmin(page, pin = ADMIN_PIN) {
  await page.goto(BASE_URL);

  // Wait for the PIN pad to render
  await page.waitForSelector('text=Ingresa tu código de acceso', { timeout: 10_000 });

  // Type the PIN via keyboard (works on both the on-screen pad and physical kb)
  await page.keyboard.type(pin);
  await page.keyboard.press('Enter');

  // Either we go to the terminal selection or directly to the dashboard
  // (depends on whether the deployment has terminals configured).
  const terminalHeading = page.getByText('Selecciona la terminal');
  const dashboardLocator = page.locator('body');

  // Give it a moment to advance
  try {
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return (
          text.includes('Selecciona la terminal') ||
          // The dashboard typically shows navigation tabs or a header
          text.match(/Mesas|Tables|Dashboard|Inicio/i) !== null
        );
      },
      { timeout: 5_000 },
    );
  } catch {
    throw new Error(
      'Login did not advance to terminal selection or dashboard. ' +
        'Is the server up at ' +
        BASE_URL +
        '? Is the PIN correct?',
    );
  }

  if (await terminalHeading.isVisible().catch(() => false)) {
    // Click the first terminal button
    const firstTerminal = page.locator('button').filter({ hasText: /.+/ }).first();
    await firstTerminal.click();
  }

  // Wait for the dashboard to settle
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
}

/**
 * Log out by clearing localStorage and going back to the login page.
 * This is more reliable than trying to find a "logout" button (the UI
 * may not expose one in a way that's easy to find).
 */
async function logout(page) {
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
}

/**
 * Check that we're on the login screen.
 */
async function expectOnLoginScreen(page) {
  await expect(page.getByText('Ingresa tu código de acceso')).toBeVisible({
    timeout: 10_000,
  });
}

module.exports = {
  ADMIN_PIN,
  BASE_URL,
  loginAsAdmin,
  logout,
  expectOnLoginScreen,
};
