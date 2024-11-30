// @ts-check
const { test, expect, describe } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto(baseURL);
});

describe('Eventua11y Page Tests', () => {
  test('should have the correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Eventua11y/);
  });

  test('should display the header', async ({ page }) => {
    const header = page.locator('#global-header');
    await expect(header).toBeVisible();
    await expect(header).toHaveAttribute('role', 'banner');
  });

  test('should display the Today heading', async ({ page }) => {
    const todayHeading = page.getByRole('heading', { name: 'Today' });
    await expect(todayHeading).toBeVisible();
    await expect(todayHeading).toHaveText('Today');
  });

  test('should display the footer', async ({ page }) => {
    const footer = page.locator('#global-footer');
    await expect(footer).toBeVisible();
    await expect(footer).toHaveAttribute('role', 'contentinfo');
  });

  test('should have no accessibility violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});