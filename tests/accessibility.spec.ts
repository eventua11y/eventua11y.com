import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('main page passes accessibility checks', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
  
  test('past events page passes accessibility checks', async ({ page }) => {
    await page.goto('/past-events');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
  
  test('filter drawer passes accessibility checks', async ({ page }) => {
    // Go to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Open filter drawer
    const filterButton = page.locator('#open-filter-drawer');
    await filterButton.click();
    
    // Wait for drawer to be fully visible
    const drawer = page.locator('#filter-drawer');
    await expect(drawer).toBeVisible();
    
    // Run accessibility check on the open drawer
    const results = await new AxeBuilder({ page })
      .include('#filter-drawer')
      .analyze();
    
    expect(results.violations).toEqual([]);
  });
  
  test('keyboard navigation works for essential elements', async ({ page }) => {
    // Navigate specifically to the upcoming events page where the filter drawer is available
    await page.goto('/');
    await page.waitForSelector('#upcoming-events');
    await page.waitForSelector('#open-filter-drawer:not([disabled])');
    
    // Press tab to navigate to first interactive element
    await page.keyboard.press('Tab');
    
    // Check that skip link is focused first (common a11y pattern)
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.textContent : null;
    });
    
    expect(focusedElement).toContain('Skip');
    
    // Tab to filter button - use a focus tracker to more reliably find the filter button
    let filterButtonFound = false;
    let tabPresses = 0;
    const maxTabs = 10; // Safety limit
    
    while (!filterButtonFound && tabPresses < maxTabs) {
      await page.keyboard.press('Tab');
      tabPresses++;
      
      // Check if we've reached the filter button
      const result = await page.evaluate(() => {
        const el = document.activeElement;
        return el && (el.id === 'open-filter-drawer' || 
                     (el.getAttribute('aria-label') === 'Filter') || 
                     (el.textContent && el.textContent.includes('Filter')));
      });
      
      filterButtonFound = Boolean(result);
    }
    
    expect(filterButtonFound).toBeTruthy();
    
    // Check that filter button can be activated with keyboard
    await page.keyboard.press('Enter');
    
    // Verify filter drawer opens
    const drawer = page.locator('#filter-drawer');
    await expect(drawer).toBeVisible();
    
    // Verify we can close with Escape key
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
  });
});
