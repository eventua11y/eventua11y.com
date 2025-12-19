import { test, expect } from '@playwright/test';

test.describe('Fathom Analytics', () => {
  test('should load Fathom script without SPA mode', async ({ page }) => {
    // Navigate to the page
    await page.goto('/');

    // Check if the Fathom script is present
    const fathomScript = page.locator('script[src="https://cdn.usefathom.com/script.js"]');
    await expect(fathomScript).toBeAttached();

    // Verify that data-spa attribute is NOT present
    const dataSpa = await fathomScript.getAttribute('data-spa');
    expect(dataSpa).toBeNull();

    // Verify that data-site attribute is present
    const dataSite = await fathomScript.getAttribute('data-site');
    expect(dataSite).toBe('XTSPEPUF');

    // Verify that defer attribute is present
    const hasDefer = await fathomScript.evaluate((el) => el.hasAttribute('defer'));
    expect(hasDefer).toBe(true);
  });

  test('should not cause elm.events.push errors', async ({ page }) => {
    const errors: string[] = [];

    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Navigate to the page
    await page.goto('/');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Check for the specific error
    const hasElmEventsError = errors.some((error) =>
      error.includes('elm.events.push')
    );
    expect(hasElmEventsError).toBe(false);

    // Check for any errors related to addEventListener or Fathom
    const hasFathomError = errors.some(
      (error) =>
        error.includes('addEventListener') ||
        error.includes('fathom') ||
        error.includes('spaHistory')
    );
    expect(hasFathomError).toBe(false);
  });
});
