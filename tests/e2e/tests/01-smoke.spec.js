// @ts-check
/**
 * Smoke tests — verify the app loads end-to-end.
 *
 * These tests run first and are the most basic sanity check.
 * If any of these fail, the rest of the suite is likely to fail too.
 */

const { test, expect } = require('@playwright/test');
const { BASE_URL, expectOnLoginScreen } = require('./_helpers');

test.describe('Smoke', () => {
  test('app responds at the base URL', async ({ page }) => {
    const response = await page.goto(BASE_URL);
    expect(response, 'no response from base URL').toBeTruthy();
    expect(response.status(), 'expected 2xx/3xx').toBeLessThan(400);
  });

  test('shows the login screen on first visit', async ({ page }) => {
    await page.goto(BASE_URL);
    // Clear any leftover session from previous tests
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await page.reload();
    await expectOnLoginScreen(page);
  });

  test('the login screen has a PIN pad', async ({ page }) => {
    await page.goto(BASE_URL);
    await expectOnLoginScreen(page);
    // The PIN pad renders 0-9, Limpiar, and a backspace button
    for (const digit of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']) {
      await expect(page.getByRole('button', { name: digit, exact: true })).toBeVisible();
    }
    await expect(page.getByText(/Limpiar/i)).toBeVisible();
  });

  test('no 5xx errors in the network log on first load', async ({ page }) => {
    const fivexx = [];
    page.on('response', (response) => {
      if (response.status() >= 500) {
        fivexx.push(`${response.status()} ${response.url()}`);
      }
    });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    expect(
      fivexx,
      `5xx responses on initial load: ${fivexx.join(', ')}`,
    ).toEqual([]);
  });
});
