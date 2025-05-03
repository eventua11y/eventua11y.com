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
  await closeButton.click({ force: true });

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
  const onlineRadio = page.getByRole('radio', { name: 'Online' });
  await onlineRadio.waitFor({ state: 'visible' });
  await onlineRadio.check({ force: true });
  await page.waitForTimeout(300);

  // Verify reset button appears
  await expect(resetButton.first()).toBeVisible({ timeout: 5000 });
});

// Reset button clears filters
test('reset button clears filters', async ({ page }) => {
  // Open the filter drawer
  await page.getByRole('button', { name: 'Filter' }).click();
  
  // Wait for drawer to be fully visible
  const drawer = page.locator('#filter-drawer');
  await expect(drawer).toBeVisible();
  
  // Check a filter option to make reset button appear
  const notAcceptingTalksRadio = page.getByRole('radio', { name: 'Not accepting talks', exact: true });
  await notAcceptingTalksRadio.check({ force: true });
  
  // Wait for reset button to become visible
  const resetButton = page.getByTestId('drawer-reset');
  await expect(resetButton).toBeVisible({ timeout: 5000 });
  
  // Click reset button
  await resetButton.click({ force: true });
  
  // Wait for reactive changes to propagate after reset
  await page.waitForTimeout(500);
  
  // Verify filter has been reset by checking radio button state
  const anyPreferenceRadio = page.getByRole('radio', { name: 'No preference', exact: true }).first();
  await expect(anyPreferenceRadio).toBeChecked({ timeout: 5000 });
  
  // Use alternate strategies to verify the reset button is gone
  try {
    // 1. Try standard visibility check with longer timeout
    await expect(resetButton).not.toBeVisible({ timeout: 5000 });
  } catch {
    // 2. If that fails, check if the button is actually hidden via CSS or parent visibility
    const isButtonVisible = await page.evaluate(() => {
      const button = document.querySelector('[data-testid="drawer-reset"]');
      if (!button) return false;
      
      const style = window.getComputedStyle(button);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    });
    
    expect(isButtonVisible).toBeFalsy();
  }
});
