// @ts-check
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto(baseURL);
});

test('has title', async ({ page }) => {
  await expect(page).toHaveTitle(/Eventua11y/);
});

test('header is visible', async ({ page }) => {
  await expect(page.locator('#global-header')).toBeVisible();
});

test('Today heading is visible', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
});

test('footer is visible', async ({ page }) => {
  await expect(page.locator('#global-footer')).toBeVisible();
});

test('has no accessibility violations', async ({ page }) => {
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});

test('has at least one upcoming event', async ({ page }) => {
  const upcomingEvents = page.locator('.event');
  const countOfEvents = await upcomingEvents.count();
  await expect(countOfEvents).toBeGreaterThan(0);
});
