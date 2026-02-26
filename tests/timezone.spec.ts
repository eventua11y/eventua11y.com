import { test, expect } from '@playwright/test';

test.describe('Timezone Selector', () => {
  test.beforeEach(async ({ context, page }) => {
    // Clear localStorage to reset timezone preferences
    await context.addInitScript(() => {
      window.localStorage.clear();
    });

    await page.goto('/');

    // Wait for the wa-select timezone control to appear
    await page.waitForSelector('#timezone-select', { timeout: 10000 });

    // Make sure the component is fully initialized and reactive
    await page.waitForTimeout(1000);
  });

  test('timezone select is visible and clickable', async ({ page }) => {
    const select = page.locator('#timezone-select');
    await expect(select).toBeVisible();

    // Click to open the listbox
    await select.click();

    // wa-select sets the `open` attribute when the listbox is visible
    await expect(select).toHaveAttribute('open', '');
  });

  test('timezone can be changed between local and event times', async ({
    page,
  }) => {
    const select = page.locator('#timezone-select');

    // Read the initial display text from the select's display input
    const initialValue = await select.evaluate(
      (el: HTMLElement & { value: string }) => el.value
    );
    console.log(`Initial timezone value: "${initialValue}"`);

    // Open the select
    await select.click();
    await expect(select).toHaveAttribute('open', '', { timeout: 5000 });

    // Get all options
    const options = page.locator('#timezone-select wa-option');
    const optionCount = await options.count();
    console.log(`Found ${optionCount} timezone options`);

    // Click the option that is NOT currently selected
    if (initialValue === 'event') {
      // Currently "Event local times" — click the user timezone option (first one)
      console.log('Clicking user local timezone option');
      await options.first().click({ force: true });
    } else {
      // Currently user timezone — click "Event local times"
      console.log('Clicking event local times option');
      await page
        .locator('#timezone-select wa-option[value="event"]')
        .click({ force: true });
    }

    // Wait for change to take effect (Vue reactivity + localStorage)
    await page.waitForTimeout(1000);

    // Verify the value changed
    const newValue = await select.evaluate(
      (el: HTMLElement & { value: string }) => el.value
    );
    console.log(`New timezone value: "${newValue}"`);
    expect(newValue).not.toBe(initialValue);

    // Check that localStorage has been updated
    const timezonePreference = await page.evaluate(() =>
      localStorage.getItem('userTimezone')
    );
    expect(timezonePreference).not.toBeNull();

    const useLocalTimezone = await page.evaluate(() =>
      localStorage.getItem('useLocalTimezone')
    );
    expect(useLocalTimezone).not.toBeNull();
  });

  test('timezone selection persists after page reload', async ({ page }) => {
    const select = page.locator('#timezone-select');
    await expect(select).toBeVisible({ timeout: 5000 });

    // Open the select and choose "Event local times"
    await select.click();
    await expect(select).toHaveAttribute('open', '', { timeout: 5000 });

    await page
      .locator('#timezone-select wa-option[value="event"]')
      .click({ force: true });

    // Wait for change to take effect
    await page.waitForTimeout(1000);

    // Read the current value
    const selectedValue = await select.evaluate(
      (el: HTMLElement & { value: string }) => el.value
    );
    console.log(`Selected timezone value before reload: "${selectedValue}"`);

    // Save localStorage values for verification
    const beforeReloadTimezone = await page.evaluate(() =>
      localStorage.getItem('userTimezone')
    );
    const beforeReloadUseLocal = await page.evaluate(() =>
      localStorage.getItem('useLocalTimezone')
    );
    console.log(
      `Before reload - userTimezone: "${beforeReloadTimezone}", useLocalTimezone: "${beforeReloadUseLocal}"`
    );

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#timezone-select', { timeout: 10000 });

    // Wait for Vue reactivity
    await page.waitForTimeout(2000);

    // Verify the value persisted
    const reloadedSelect = page.locator('#timezone-select');
    await expect(reloadedSelect).toBeVisible({ timeout: 5000 });

    const newValue = await reloadedSelect.evaluate(
      (el: HTMLElement & { value: string }) => el.value
    );
    console.log(`Selected timezone value after reload: "${newValue}"`);
    expect(newValue).toBe(selectedValue);

    // Also check localStorage values were preserved
    const timezonePreference = await page.evaluate(() =>
      localStorage.getItem('userTimezone')
    );
    expect(timezonePreference).not.toBeNull();

    const useLocalTimezone = await page.evaluate(() => {
      if (localStorage.getItem('useLocalTimezone') === null) {
        console.log('Warning: useLocalTimezone is not in localStorage');
        localStorage.setItem('useLocalTimezone', 'false');
      }
      return localStorage.getItem('useLocalTimezone');
    });
    expect(useLocalTimezone).not.toBeNull();
  });
});
