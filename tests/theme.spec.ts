import { test, expect } from '@playwright/test';

test.describe('Theme Switching', () => {
  test.beforeEach(async ({ context, page }) => {
    // Set initial state
    await context.addInitScript(() => {
      window.localStorage.clear();
    });
    await context.clearCookies();

    // Reset system preference
    await page.emulateMedia({ colorScheme: 'light' });

    // Load page
    await page.goto('/');
    const filterDrawer = page.locator('#filter-drawer');
    const isVisible = await filterDrawer.isVisible();
    if (isVisible) {
      await page.keyboard.press('Escape');
      await expect(filterDrawer).not.toBeVisible();
    }
  });

  test('should start with system theme', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('#theme-selector-button')).toHaveAttribute(
      'label',
      'Light mode'
    );
  });

  test('should switch to light theme and persist', async ({
    context,
    page,
  }) => {
    // Switch theme
    await page.click('#theme-selector-button');
    await page.click('#light-mode');

    // Verify initial change
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('#theme-selector-button')).toHaveAttribute(
      'label',
      'Light mode'
    );

    // Verify persistence
    const newPage = await context.newPage();
    await newPage.goto('/');
    await expect(newPage.locator('html')).toHaveAttribute(
      'data-theme',
      'light'
    );
  });

  test('should switch to dark theme and persist', async ({
    context,
    page,
    browser,
  }) => {
    // Switch theme
    await page.click('#theme-selector-button');
    await page.click('#dark-mode');

    // Verify initial change
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#theme-selector-button')).toHaveAttribute(
      'label',
      'Dark mode'
    );

    // Get storage state
    const storageState = await context.storageState();

    // Create new context with storage state
    const newContext = await browser.newContext({ storageState });
    const newPage = await newContext.newPage();

    await newPage.goto('/');
    await expect(newPage.locator('html')).toHaveAttribute('data-theme', 'dark');
    await newContext.close();
  });

  test('should respect system preference when set to system theme', async ({
    page,
  }) => {
    // Test dark preference
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.click('#theme-selector-button');
    await page.click('#system-default');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Test light preference
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('should handle theme selector interactions correctly', async ({
    page,
  }) => {
    // Test menu opening
    await page.click('#theme-selector-button');
    await expect(page.locator('#theme-selector sl-menu')).toBeVisible();

    // Test click outside
    await page.click('body');
    await expect(page.locator('#theme-selector sl-menu')).not.toBeVisible();

    // Test keyboard interaction
    await page.click('#theme-selector-button');
    await expect(page.locator('#theme-selector sl-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#theme-selector sl-menu')).not.toBeVisible();
  });
});
