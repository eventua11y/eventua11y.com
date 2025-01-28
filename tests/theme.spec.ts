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
    await expect(
      page.locator('#theme-selector-button sl-icon[label="Light mode"]')
    ).toBeVisible();
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
    await expect(
      page.locator('#theme-selector-button sl-icon[label="Light mode"]')
    ).toBeVisible();

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
    await expect(
      page.locator('#theme-selector-button sl-icon[label="Dark mode"]')
    ).toBeVisible();

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

  test('should switch to dark theme and back to light theme', async ({
    page,
  }) => {
    // Switch to dark theme
    await page.click('#theme-selector-button');
    await page.click('#dark-mode');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(
      page.locator('#theme-selector-button sl-icon[label="Dark mode"]')
    ).toBeVisible();

    // Switch back to light theme
    await page.click('#theme-selector-button');
    await page.click('#light-mode');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(
      page.locator('#theme-selector-button sl-icon[label="Light mode"]')
    ).toBeVisible();
  });

  test('should handle theme switching with multiple tabs', async ({
    context,
    page,
    browser,
  }) => {
    // Open a new tab
    const newPage = await context.newPage();
    await newPage.goto('/');

    // Switch theme in the first tab
    await page.click('#theme-selector-button');
    await page.click('#dark-mode');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(
      page.locator('#theme-selector-button sl-icon[label="Dark mode"]')
    ).toBeVisible();

    // Verify theme change in the new tab
    await newPage.reload();
    await expect(newPage.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(
      newPage.locator('#theme-selector-button sl-icon[label="Dark mode"]')
    ).toBeVisible();

    // Switch back to light theme in the new tab
    await newPage.click('#theme-selector-button');
    await newPage.click('#light-mode');
    await expect(newPage.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(
      newPage.locator('#theme-selector-button sl-icon[label="Light mode"]')
    ).toBeVisible();

    // Verify theme change in the first tab
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(
      page.locator('#theme-selector-button sl-icon[label="Light mode"]')
    ).toBeVisible();
  });

  test('should handle theme switching with system preference change', async ({
    page,
  }) => {
    // Switch to system theme
    await page.click('#theme-selector-button');
    await page.click('#system-default');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(
      page.locator('#theme-selector-button sl-icon[label="Light mode"]')
    ).toBeVisible();

    // Change system preference to dark
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(
      page.locator('#theme-selector-button sl-icon[label="Dark mode"]')
    ).toBeVisible();

    // Change system preference back to light
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(
      page.locator('#theme-selector-button sl-icon[label="Light mode"]')
    ).toBeVisible();
  });
});
