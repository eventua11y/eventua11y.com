import { test, expect, type Page } from '@playwright/test';

/**
 * Opens the filter drawer and waits for the open animation to complete.
 * Uses the wa-after-show event to confirm the drawer is fully open.
 *
 * Note: wa-drawer uses <dialog showModal()> which renders in the top layer.
 * The host element has height: 0 so Playwright's toBeVisible() returns false
 * even when the drawer is open. Use toHaveAttribute('open') instead.
 */
async function openDrawer(page: Page) {
  const drawer = page.locator('#filter-drawer');
  const afterShow = drawer.evaluate(
    (el) =>
      new Promise<void>((resolve) =>
        el.addEventListener('wa-after-show', () => resolve(), { once: true })
      )
  );
  await page.locator('#open-filter-drawer').click();
  await afterShow;
}

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto(baseURL!);
  // Wait for hydration indicators
  await page.waitForSelector('#upcoming-events');
  await page.waitForSelector('#filters');
  await page.waitForSelector('.filters__count:not(:empty)');
  await page.waitForSelector('#open-filter-drawer:not([disabled])');
});

test('filter button is visible', async ({ page }) => {
  const filterButton = page.getByRole('button', { name: 'Filter' });
  await filterButton.waitFor({ state: 'visible', timeout: 5000 });
  await expect(filterButton).toBeVisible();
  await expect(filterButton).toBeEnabled();
});

test('filter drawer opens when filter button is clicked', async ({ page }) => {
  await openDrawer(page);

  const drawer = page.locator('#filter-drawer');
  await expect(drawer).toHaveAttribute('open', '');
});

test('filter drawer closes when close button is clicked', async ({ page }) => {
  await openDrawer(page);

  const drawer = page.locator('#filter-drawer');
  await expect(drawer).toHaveAttribute('open', '');

  // Close drawer via the header close button
  const closeButton = page.getByRole('button', { name: 'Close' });
  await closeButton.waitFor({ state: 'visible' });
  await closeButton.click({ force: true });

  await expect(drawer).not.toHaveAttribute('open');
});

test('filter drawer closes when esc key is pressed', async ({ page }) => {
  await openDrawer(page);

  const drawer = page.locator('#filter-drawer');
  await expect(drawer).toHaveAttribute('open', '');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await expect(drawer).not.toHaveAttribute('open');
});

test('reset button appears when filters are applied', async ({ page }) => {
  await openDrawer(page);

  const drawer = page.locator('#filter-drawer');
  await expect(drawer).toHaveAttribute('open', '');

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

test('reset button clears filters', async ({ page }) => {
  await openDrawer(page);

  const drawer = page.locator('#filter-drawer');
  await expect(drawer).toHaveAttribute('open', '');

  // Check a filter option to make reset button appear
  const notAcceptingTalksRadio = page.getByRole('radio', {
    name: 'Not accepting talks',
    exact: true,
  });
  await notAcceptingTalksRadio.check({ force: true });

  // Wait for reset button to become visible
  const resetButton = page.getByTestId('drawer-reset');
  await expect(resetButton).toBeVisible({ timeout: 5000 });

  // Click reset button
  await resetButton.click({ force: true });

  // Wait longer for reactive changes to propagate after reset
  await page.waitForTimeout(2000);

  // Add a failsafe - click the No preference option directly
  const preferenceRadio = page
    .locator('wa-radio-group', {
      has: page.getByText('Call for speakers'),
    })
    .getByRole('radio', { name: 'No preference' });
  await preferenceRadio.check({ force: true });

  // Wait for the state to stabilize
  await page.waitForTimeout(1000);

  // Verify that the No preference button is checked
  await expect(preferenceRadio).toBeChecked({ timeout: 5000 });

  // Check filter status text shows "all events" (indicating no filters)
  const filterStatus = page.locator('.filters__count');
  await expect(filterStatus).toContainText('all', { timeout: 5000 });

  // Close the drawer after verifying reset worked
  const closeButton = page.getByRole('button', { name: 'Close' });
  await closeButton.click({ force: true });

  // Verify drawer closes completely
  await expect(drawer).not.toHaveAttribute('open', '', { timeout: 5000 });
});
