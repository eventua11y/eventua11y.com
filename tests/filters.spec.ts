import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto(baseURL);
  await page.waitForSelector('#upcoming-events');
  await page.waitForSelector('#filters');
});

test('filter button is visible', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Filter' })).toBeVisible();
});

test('filter drawer opens when filter button is clicked', async ({ page }) => {
  await page.getByRole('button', { name: 'Filter' }).click();
  await expect(page.locator('#filter-drawer')).toBeVisible();
});

test('filter drawer closes when close button is clicked', async ({ page }) => {
  await page.getByRole('button', { name: 'Filter' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('#filter-drawer')).not.toBeVisible();
});

test('filter drawer closes when esc key is pressed', async ({ page }) => {
  await page.getByRole('button', { name: 'Filter' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#filter-drawer')).not.toBeVisible();
});

// Reset button appears when filters are applied
test('reset button appears when filters are applied', async ({ page }) => {
  await page.getByRole('button', { name: 'Filter' }).click();
  await expect(
    page.getByRole('button', { name: 'Reset Filters' })
  ).not.toBeVisible();
  await page.getByRole('checkbox', { name: 'Not accepting talks' }).check();
  await expect(
    page.getByRole('button', { name: 'Reset Filters' }).first()
  ).toBeVisible();
});

// Reset button clears filters
test('reset button clears filters', async ({ page }) => {
  await page.getByRole('button', { name: 'Filter' }).click();
  await page
    .getByRole('checkbox', { name: 'Not accepting talks' }, { exact: true })
    .check();
  await page.getByTestId('drawer-reset').click();
  await expect(page.getByTestId('drawer-reset')).not.toBeVisible();
});
