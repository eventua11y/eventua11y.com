import { test, expect } from '@playwright/test';

// The switcher is two-state over a three-state model: "light", "dark", or no
// stored value at all, meaning follow the device. Toggling to the state the
// device already asks for clears the override rather than pinning a match.
const storedTheme = (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.localStorage.getItem('theme'));

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
    if ((await filterDrawer.getAttribute('open')) !== null) {
      await page.keyboard.press('Escape');
      await expect(filterDrawer).not.toHaveAttribute('open');
    }
  });

  test('should start with system theme and no stored override', async ({
    page,
  }) => {
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await storedTheme(page)).toBeNull();
    // wa-button is a Web Component — the label lives on the child wa-icon,
    // not on the wa-button host element (see AGENTS.md shadow DOM caveat).
    // It names the theme the toggle switches to, not the current one.
    await expect(
      page.locator('#theme-selector-button wa-icon')
    ).toHaveAttribute('label', 'Switch to dark mode');
  });

  test('should toggle away from the system theme and persist', async ({
    browser,
    context,
    page,
  }) => {
    await page.click('#theme-selector-button');

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(
      page.locator('#theme-selector-button wa-icon')
    ).toHaveAttribute('label', 'Switch to light mode');
    expect(await storedTheme(page)).toBe('dark');

    // Verify persistence in a fresh context. Reusing this one would not work:
    // its init script clears localStorage on every page it opens.
    const newContext = await browser.newContext({
      storageState: await context.storageState(),
    });
    const newPage = await newContext.newPage();
    await newPage.goto('/');
    await expect(newPage.locator('html')).toHaveAttribute('data-theme', 'dark');
    await newContext.close();
  });

  test('should clear the override when toggling back to the system theme', async ({
    page,
  }) => {
    await page.click('#theme-selector-button');
    expect(await storedTheme(page)).toBe('dark');

    await page.click('#theme-selector-button');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    // Light matches the device, so nothing is stored and the device is
    // followed again rather than pinned to a value that happens to match.
    expect(await storedTheme(page)).toBeNull();
  });

  test('should follow the system theme while no override is stored', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await storedTheme(page)).toBeNull();
    await expect(
      page.locator('#theme-selector-button wa-icon')
    ).toHaveAttribute('label', 'Switch to light mode');

    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('should keep a stored override when the system preference changes', async ({
    page,
  }) => {
    await page.click('#theme-selector-button');
    expect(await storedTheme(page)).toBe('dark');

    // A device that switches at sunset leaves a deliberate choice alone.
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await storedTheme(page)).toBe('dark');

    // Toggling now stores light, because light is no longer what the device asks for.
    await page.click('#theme-selector-button');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await storedTheme(page)).toBe('light');
  });
});
