import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto(baseURL);
  // Wait for hydration indicators
  await page.waitForSelector('#upcoming-events');
  await page.waitForSelector('#filters');
  await page.waitForSelector('.filters__count:not(:empty)');
  await page.waitForSelector('#open-filter-drawer:not([disabled])');
  await page.waitForSelector('#upcoming-events');
  await page.waitForSelector('#filters');
});

test('filter button is visible', async ({ page }) => {
  // Wait for page ready
  await page.waitForLoadState('domcontentloaded');

  // Locate and verify button
  const filterButton = page.getByRole('button', { name: 'Filter' });
  await filterButton.waitFor({ state: 'visible', timeout: 5000 });
  await expect(filterButton).toBeVisible();
  await expect(filterButton).toBeEnabled();
});

test('filter drawer opens when filter button is clicked', async ({ page }) => {
  // Wait for initial page load
  await page.waitForLoadState('domcontentloaded');

  // Get filter button and wait for it to be ready
  const filterButton = page.getByRole('button', { name: 'Filter' });
  await filterButton.waitFor({ state: 'visible', timeout: 5000 });

  // Click and wait for drawer
  await filterButton.click();

  // Get drawer and verify state
  const drawer = page.locator('#filter-drawer');
  await expect(drawer).toHaveAttribute('open', '');
  await expect(drawer).toBeVisible();

  // Optional: Wait for transition
  await page.waitForTimeout(300);
});

test('filter drawer closes when close button is clicked', async ({ page }) => {
  // Open drawer
  const filterButton = page.getByRole('button', { name: 'Filter' });
  await filterButton.waitFor({ state: 'visible' });
  await filterButton.click({ force: true });

  // Wait for drawer to be visible
  const drawer = page.locator('#filter-drawer');
  await expect(drawer).toBeVisible();

  // Close drawer
  const closeButton = page.getByRole('button', { name: 'Close' });
  await closeButton.waitFor({ state: 'visible' });
  await closeButton.click();

  // Verify drawer is closed
  await expect(drawer).not.toBeVisible();

  // Optional: Wait for animation
  await page.waitForTimeout(300);
});

test('filter drawer closes when esc key is pressed', async ({ page }) => {
  // Initial page load
  await page.waitForLoadState('domcontentloaded');

  // Get and click filter button
  const filterButton = page.getByRole('button', { name: 'Filter' });
  await filterButton.waitFor({ state: 'visible' });
  await filterButton.click();

  // Verify drawer opens
  const drawer = page.locator('#filter-drawer');
  await expect(drawer).toHaveAttribute('open', '');
  await expect(drawer).toBeVisible();

  // Press escape and wait for transition
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Verify drawer closes
  await expect(drawer).not.toHaveAttribute('open');
  await expect(drawer).not.toBeVisible();
});

test('reset button appears when filters are applied', async ({ page }) => {
  // Setup
  await page.waitForLoadState('domcontentloaded');

  // Open drawer
  const filterButton = page.getByRole('button', { name: 'Filter' });
  await filterButton.waitFor({ state: 'visible' });
  await filterButton.click();

  // Verify drawer opens
  const drawer = page.locator('#filter-drawer');
  await expect(drawer).toBeVisible();

  // Verify reset button initially hidden
  const resetButton = page.getByRole('button', { name: 'Reset Filters' });
  await expect(resetButton).not.toBeVisible();

  // Change filter and wait for update
  const onlineCheckbox = page.getByRole('checkbox', { name: 'Online' });
  await onlineCheckbox.waitFor({ state: 'visible' });
  await onlineCheckbox.check({ force: true });
  await page.waitForTimeout(300);

  // Verify reset button appears
  await expect(resetButton.first()).toBeVisible({ timeout: 5000 });
});

// Reset button clears filters
test('reset button clears filters', async ({ page }) => {
  await page.getByRole('button', { name: 'Filter' }).click();
  await page
    .getByRole('checkbox', { name: 'Not accepting talks' }, { exact: true })
    .check();
  await page.getByTestId('drawer-reset').click({ force: true });
  await expect(page.getByTestId('drawer-reset')).not.toBeVisible();
});
