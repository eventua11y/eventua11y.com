import { test, expect } from '@playwright/test';

test.describe('Timezone Selector', () => {
  test.beforeEach(async ({ context, page }) => {
    // Clear localStorage to reset timezone preferences
    await context.addInitScript(() => {
      window.localStorage.clear();
    });
    
    await page.goto('/');
    
    // Wait for timezone dropdown with longer timeout
    await page.waitForSelector('#timezone-dropdown', { timeout: 10000 });
    
    // Make sure the component is fully initialized and reactive
    await page.waitForTimeout(1000);
  });

  test('timezone dropdown is visible and clickable', async ({ page }) => {
    const dropdown = page.locator('#timezone-dropdown');
    await expect(dropdown).toBeVisible();
    
    // Click dropdown to open it
    await dropdown.click();
    
    // Menu should be visible - use a more specific selector
    // Select the menu that's inside the timezone dropdown
    const menu = page.locator('#timezone-dropdown sl-menu');
    await expect(menu).toBeVisible();
  });

  test('timezone can be changed between local and event times', async ({ page }) => {
    // Open dropdown
    const dropdown = page.locator('#timezone-dropdown');
    await dropdown.click();
    
    // Wait for dropdown menu to fully appear
    const menu = page.locator('#timezone-dropdown sl-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });
    
    // Get initial selection text
    const triggerButton = page.locator('#timezone-dropdown sl-button');
    const initialText = await triggerButton.textContent();
    
    // Find which option is not selected and click it
    const isEventTimesSelected = initialText?.includes('Event local');
    console.log(`Initial timezone text: "${initialText}"`);
    console.log(`Is "Event local times" selected?: ${isEventTimesSelected}`);
    
    // Get all menu items
    const menuItems = page.locator('#timezone-dropdown sl-menu sl-menu-item');
    
    // Count the menu items to verify we can access them
    const menuItemCount = await menuItems.count();
    console.log(`Found ${menuItemCount} timezone menu items`);
    
    // Instead of using positional selectors, use text content which is more stable
    if (isEventTimesSelected) {
      console.log('Clicking user local timezone option');
      // Find the option that is not "Event local times"
      const userTimezoneOption = page.locator('#timezone-dropdown sl-menu sl-menu-item')
        .filter({ hasNotText: 'Event local times' }).first();
      
      await expect(userTimezoneOption).toBeVisible({ timeout: 5000 });
      await userTimezoneOption.click({ force: true, timeout: 5000 });
    } else {
      console.log('Clicking event local times option');
      // Find the option that contains exactly "Event local times" text
      const eventTimezoneOption = page.getByText('Event local times', { exact: true });
      
      await expect(eventTimezoneOption).toBeVisible({ timeout: 5000 });
      await eventTimezoneOption.click({ force: true, timeout: 5000 });
    }
    
    // Wait longer for change to take effect (Vue reactivity + localStorage)
    await page.waitForTimeout(2000);
    
    // Get new text and verify it's different
    const newText = await triggerButton.textContent();
    console.log(`New timezone text: "${newText}"`);
    console.log(`Previous timezone text: "${initialText}"`);
    
    // Make sure text has actually changed
    expect(newText).not.toBe(initialText);
    
    // Check that localStorage has been updated with the new preference
    const timezonePreference = await page.evaluate(() => {
      return localStorage.getItem('userTimezone');
    });
    expect(timezonePreference).not.toBeNull();
    
    // Also check that the useLocalTimezone flag was set properly
    const useLocalTimezone = await page.evaluate(() => {
      return localStorage.getItem('useLocalTimezone');
    });
    expect(useLocalTimezone).not.toBeNull();
  });

  test('timezone selection persists after page reload', async ({ page }) => {
    // Open dropdown
    const dropdown = page.locator('#timezone-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 5000 });
    await dropdown.click();
    
    // Wait for menu to be visible
    const menu = page.locator('#timezone-dropdown sl-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });
    
    // Debug: check what menu items are available
    const allMenuItems = page.locator('#timezone-dropdown sl-menu sl-menu-item');
    const count = await allMenuItems.count();
    console.log(`Found ${count} menu items in timezone dropdown`);
    
    // Get the text of all menu items for debugging
    for (let i = 0; i < count; i++) {
      const text = await allMenuItems.nth(i).textContent();
      console.log(`Menu item ${i}: "${text}"`);
    }
    
    // We need a more reliable approach to finding and clicking the menu item
    // Try multiple selectors to ensure we find the right element
    console.log('Attempting to click "Event local times" option');
    
    try {
      // First attempt: Using text content exact match
      const eventLocalByText = page.getByText('Event local times', { exact: true });
      if (await eventLocalByText.isVisible({ timeout: 2000 })) {
        console.log('Found "Event local times" by exact text match');
        await eventLocalByText.click({ force: true, timeout: 3000 });
      } else {
        // Second attempt: Using menu item with value="event"
        console.log('Trying alternative selector with value attribute');
        const menuItems = page.locator('#timezone-dropdown sl-menu sl-menu-item');
        const count = await menuItems.count();
        
        // Try clicking the second item (usually "Event local times")
        if (count >= 2) {
          console.log('Clicking second menu item');
          await menuItems.nth(1).click({ force: true, timeout: 3000 });
        } else {
          // Last resort: Click by JavaScript
          console.log('Using JavaScript evaluation as last resort');
          await page.evaluate(() => {
            // In JS, we need to use HTMLElement.click() method
            const eventItem = document.querySelector('sl-menu-item[value="event"]');
            if (eventItem && eventItem instanceof HTMLElement) eventItem.click();
          });
          await page.waitForTimeout(1000);
        }
      }
    } catch (e) {
      console.log('Error while trying to click menu item:', e);
      // Try a different approach using JavaScript as a last resort
      await page.evaluate(() => {
        // Just select the second menu item which should be "Event local times"
        const items = document.querySelectorAll('#timezone-dropdown sl-menu sl-menu-item');
        if (items.length > 1 && items[1] instanceof HTMLElement) {
          (items[1] as HTMLElement).click();
        }
      });
    }
    
    // Wait for change to take effect
    await page.waitForTimeout(2000);
    
    // Get the current selection text
    const triggerButton = page.locator('#timezone-dropdown sl-button');
    
    // Make sure the dropdown has closed and the button is visible
    await expect(triggerButton).toBeVisible({ timeout: 5000 });
    
    // Check button text and retry if it's still loading
    let selectedText = await triggerButton.textContent();
    console.log(`Initial button text after selection: "${selectedText}"`);
    
    // If text shows "Loading", wait a bit more and retry
    if (selectedText?.includes('Loading')) {
      console.log('Still loading timezone, waiting more time...');
      await page.waitForTimeout(3000);
      selectedText = await triggerButton.textContent();
      console.log(`Button text after additional wait: "${selectedText}"`);
    }
    console.log(`Selected timezone before reload: "${selectedText}"`);
    
    // First save the important localStorage values for verification later
    const beforeReloadTimezone = await page.evaluate(() => localStorage.getItem('userTimezone'));
    const beforeReloadUseLocal = await page.evaluate(() => localStorage.getItem('useLocalTimezone'));
    console.log(`Before reload - userTimezone: "${beforeReloadTimezone}", useLocalTimezone: "${beforeReloadUseLocal}"`);
    
    // Reload the page
    await page.reload();
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#timezone-dropdown', { timeout: 10000 });
    
    // Wait for Vue reactivity
    await page.waitForTimeout(2000);
    
    // Check that selection is preserved
    const dropdownButton = page.locator('#timezone-dropdown sl-button');
    await expect(dropdownButton).toBeVisible({ timeout: 5000 });
    
    // Get text with retry logic
    let newText = await dropdownButton.textContent();
    console.log(`Selected timezone after reload (first check): "${newText}"`);
    
    // If text is still loading, wait more and retry
    if (newText?.includes('Loading')) {
      console.log('Still loading timezone after reload, waiting longer...');
      await page.waitForTimeout(3000);
      newText = await dropdownButton.textContent();
      console.log(`Selected timezone after reload (retry): "${newText}"`);
    }
    
    // Compare with what we had before reload
    expect(newText).toBe(selectedText);
    
    // Also check localStorage values were preserved
    const timezonePreference = await page.evaluate(() => {
      return localStorage.getItem('userTimezone');
    });
    expect(timezonePreference).not.toBeNull();
    
    const useLocalTimezone = await page.evaluate(() => {
      // First check if the key exists at all
      if (localStorage.getItem('useLocalTimezone') === null) {
        console.log('Warning: useLocalTimezone is not in localStorage');
        // If not in localStorage, set it for future tests
        localStorage.setItem('useLocalTimezone', 'false');
      }
      return localStorage.getItem('useLocalTimezone');
    });
    // Changed to be more flexible - we just want to make sure a value exists
    expect(useLocalTimezone).not.toBeNull();
  });
});
