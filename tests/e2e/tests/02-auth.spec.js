// @ts-check
/**
 * Authentication tests.
 *
 * Tests the PIN-based login flow.
 *
 * REQUIRES test data:
 *   - At least one staff user with a known PIN
 *   - Default PIN is "1234" (admin). Override with E2E_ADMIN_PIN env var.
 */

const { test, expect } = require('@playwright/test');
const { loginAsAdmin, logout, expectOnLoginScreen, ADMIN_PIN } = require('./_helpers');

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Always start each test on a clean session
    await page.goto('about:blank');
  });

  test('rejects an invalid PIN', async ({ page }) => {
    await page.goto(process.env.E2E_BASE_URL || 'http://localhost:5173');
    await expectOnLoginScreen(page);
    await page.keyboard.type('0000'); // very unlikely to be a valid PIN
    await page.keyboard.press('Enter');
    // We should still be on the login screen (or see an error)
    // The login component should show a toast and reset the PIN
    await page.waitForTimeout(1500);
    const stillOnLogin = await page
      .getByText('Ingresa tu código de acceso')
      .isVisible()
      .catch(() => false);
    expect(stillOnLogin, 'should remain on login after invalid PIN').toBe(true);
  });

  test('accepts a valid PIN and reaches the dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    // After login we should NOT be on the login screen anymore
    const onLogin = await page
      .getByText('Ingresa tu código de acceso')
      .isVisible()
      .catch(() => false);
    expect(onLogin, 'should not still be on the login screen').toBe(false);
  });

  test('logout clears the session', async ({ page }) => {
    await loginAsAdmin(page);
    await logout(page);
    await expectOnLoginScreen(page);
  });

  test('refreshing the page keeps the user logged in (token in storage)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
    // After reload, we should NOT be back on the login screen
    // (the token + serial in localStorage should be enough)
    const onLogin = await page
      .getByText('Ingresa tu código de acceso')
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    expect(onLogin, 'should remain logged in after page refresh').toBe(false);
  });

  test('typing a PIN pads the input and shows a hint', async ({ page }) => {
    await page.goto(process.env.E2E_BASE_URL || 'http://localhost:5173');
    await expectOnLoginScreen(page);
    await page.keyboard.type('1');
    // Should now say "Faltan 3 dígitos" or similar
    await expect(page.getByText(/Faltan 3/i)).toBeVisible();
    await page.keyboard.type('2');
    await expect(page.getByText(/Faltan 2/i)).toBeVisible();
    await page.keyboard.type('3');
    await expect(page.getByText(/Faltan 1/i)).toBeVisible();
    await page.keyboard.type('4');
    // Should now say "Código completo" (or similar) and not "Faltan"
    await expect(page.getByText(/Código completo|completo/i)).toBeVisible();
  });
});
