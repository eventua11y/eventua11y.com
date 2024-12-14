// @ts-check
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto(baseURL);
});

test.describe('Theme Switching', () => {
  test('should switch to light theme', async ({ page }) => {
    await page.click('#theme-selector-button');
    await page.click('#light-mode');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(
      page.locator('#theme-selector-button sl-icon[label="Light mode"]')
    ).toBeVisible();
  });

  test('should switch to dark theme', async ({ page }) => {
    await page.click('#theme-selector-button');
    await page.click('#dark-mode');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(
      page.locator('#theme-selector-button sl-icon[label="Dark mode"]')
    ).toBeVisible();
  });

  test('should switch to system default theme (dark mode)', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.click('#theme-selector-button');
    await page.click('#system-default');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(
      page.locator('#theme-selector-button sl-icon[label="Dark mode"]')
    ).toBeVisible();
  });

  test('should switch to system default theme (light mode)', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.click('#theme-selector-button');
    await page.click('#system-default');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(
      page.locator('#theme-selector-button sl-icon[label="Light mode"]')
    ).toBeVisible();
  });
});
