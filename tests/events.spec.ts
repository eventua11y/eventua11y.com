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

  test('should display the main content area', async ({ page }) => {
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should display the footer', async ({ page }) => {
    const footer = page.locator('#global-footer');
    await expect(footer).toBeVisible();
    await expect(footer).toHaveAttribute('role', 'contentinfo');
  });

  test('should have images with alt attributes', async ({ page }) => {
    const images = page.locator('img');
    await expect(images).toHaveCountGreaterThan(0);
    for (let i = 0; i < await images.count(); i++) {
      const img = images.nth(i);
      await expect(img).toHaveAttribute('alt', /.+/);
    }
  });

  test('should have no accessibility violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});