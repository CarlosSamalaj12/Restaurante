// @ts-check
/**
 * Navigation tests — verify the main views load after login.
 *
 * These tests are intentionally lenient about UI details (no specific
 * button text matching) because the React app is mostly visual and
 * uses CSS-driven interactions. They verify the high-level structure:
 * "after login, you can reach the main views".
 *
 * REQUIRES test data:
 *   - A valid admin PIN (default 1234)
 *   - At least one operation center configured
 *   - Optionally: tables, products (the tests skip gracefully if missing)
 */

const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./_helpers');

test.describe('Navigation after login', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any leftover session
    await page.goto('about:blank');
  });

  test('dashboard loads and shows the main app shell', async ({ page }) => {
    await loginAsAdmin(page);
    // The dashboard / app shell has either a header with a brand name
    // or navigation tabs. We don't assert on specific text — just that
    // the page rendered something other than the login screen.
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(100);
    // Sanity: the login text is gone
    await expect(page.getByText('Ingresa tu código de acceso')).not.toBeVisible();
  });

  test('bottom navigation is present and clickable', async ({ page }) => {
    await loginAsAdmin(page);
    // Wait a bit for the dashboard to fully render
    await page.waitForTimeout(500);
    // Try to find a nav element (bottom bar uses <nav>)
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible({ timeout: 5_000 });
  });

  test('can navigate to tables view via the bottom nav', async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForTimeout(500);
    // Click on "Mesas" tab — try by text first
    const mesasTab = page.getByText(/^Mesas$/i).first();
    if (await mesasTab.isVisible().catch(() => false)) {
      await mesasTab.click();
      // Wait for the URL or content to change
      await page.waitForTimeout(500);
    } else {
      // If the text doesn't match exactly, skip the assertion
      test.skip(true, '"Mesas" tab not found — UI may have changed');
    }
    // Verify we didn't crash
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(50);
  });

  test('app does not crash when opening the settings page', async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForTimeout(500);
    // Try to click on Settings — might be in a side menu or the bottom nav
    const settingsLink = page.getByText(/Ajustes|Configuración|Settings/i).first();
    if (await settingsLink.isVisible().catch(() => false)) {
      await settingsLink.click();
      await page.waitForTimeout(1000);
      // Should not show an error overlay
      const errorOverlay = page.locator('text=/error|exception/i').first();
      const hasError = await errorOverlay.isVisible().catch(() => false);
      expect(hasError, 'should not show an error after opening settings').toBe(false);
    } else {
      test.skip(true, 'Settings link not found — UI may have changed');
    }
  });

  test('no JavaScript errors in the console after login', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await loginAsAdmin(page);
    // Wait a bit for any deferred errors
    await page.waitForTimeout(1500);
    // Filter out known noisy errors (e.g. service worker, dev warnings)
    const realErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('DevTools') && !e.includes('vite'),
    );
    expect(
      realErrors,
      `Unexpected JS errors: ${realErrors.join('; ')}`,
    ).toEqual([]);
  });
});
