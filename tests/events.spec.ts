// @ts-check
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/', { timeout: 30000 });

  // Wait for critical UI elements - either the events list or the events container
  await Promise.race([
    page.waitForSelector('#upcoming-events', { timeout: 30000 }),
    page.waitForSelector('#events', { timeout: 30000 }),
  ]);

  // Close filter drawer if open
  const filterDrawer = page.locator('#filter-drawer');
  const isVisible = await filterDrawer.isVisible();
  if (isVisible) {
    await page.keyboard.press('Escape');
    await expect(filterDrawer).not.toBeVisible();
  }

  // Give the page time to stabilize
  await page.waitForLoadState('domcontentloaded');
});

test('has title', async ({ page }) => {
  await expect(page).toHaveTitle(/Eventua11y/);
});

test('header is visible', async ({ page }) => {
  // Header is now inside wa-page with slot="header"
  await expect(page.locator('[slot="header"]')).toBeVisible();
});

test('Today heading is visible', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
});

test('footer is visible', async ({ page }) => {
  await expect(page.locator('#global-footer')).toBeVisible();
});

test('has no accessibility violations', async ({ page }) => {
  const accessibilityScanResults = await new AxeBuilder({ page })
    // Exclude 'region' rule - the skip-to-content link inside wa-page's shadow DOM
    // is flagged as not being in a landmark, but this is a Web Awesome internal structure
    // we cannot modify. The skip link still functions correctly.
    .disableRules(['region'])
    .analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});

test('has at least one upcoming event', async ({ page }) => {
  // Wait for events to be loaded from the API
  await page.waitForSelector('.event', { timeout: 10000 }); // Adding a longer timeout to ensure events load

  const upcomingEvents = page.locator('.event');
  const countOfEvents = await upcomingEvents.count();
  await expect(countOfEvents).toBeGreaterThan(0);
});
