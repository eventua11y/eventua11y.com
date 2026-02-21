// @ts-check
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto(baseURL);
  // await page.waitForLoadState('networkidle');
  const filterDrawer = page.locator('#filter-drawer');
  const isVisible = await filterDrawer.isVisible();
  if (isVisible) {
    await page.keyboard.press('Escape');
    await expect(filterDrawer).not.toBeVisible();
  }
  await page.waitForSelector('#upcoming-events');
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
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
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
