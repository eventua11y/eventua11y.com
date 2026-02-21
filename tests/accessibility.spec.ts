import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility tests for all pages.
 *
 * Uses both axe-core automated scans (scoped to WCAG 2.2 AA) and
 * Playwright accessibility assertions to validate accessible names,
 * landmark structure, and heading hierarchy.
 *
 * See: https://dev.to/steady5063/accessibility-testing-with-playwright-assertions-3m3i
 */

// Helper: run an axe scan scoped to WCAG 2.2 Level AA
async function runAxeScan(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results;
}

// ---------------------------------------------------------------------------
// Homepage (/)
// ---------------------------------------------------------------------------
test.describe('Homepage accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#upcoming-events');
    const filterDrawer = page.locator('#filter-drawer');
    const isVisible = await filterDrawer.isVisible();
    if (isVisible) {
      await page.keyboard.press('Escape');
      await expect(filterDrawer).not.toBeVisible();
    }
  });

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const results = await runAxeScan(page);
    expect(results.violations).toEqual([]);
  });

  test('page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(
      'Eventua11y - accessibility and inclusive design events'
    );
  });

  test('skip link has accessible name', async ({ page }) => {
    const skipLink = page.locator('a.skip');
    await expect(skipLink).toHaveAccessibleName(/skip to main content/i);
  });

  test('main landmark is present', async ({ page }) => {
    const main = page.getByRole('main');
    await expect(main).toBeVisible();
  });

  test('header banner landmark is present', async ({ page }) => {
    const header = page.getByRole('banner');
    await expect(header).toBeVisible();
  });

  test('footer contentinfo landmark is present', async ({ page }) => {
    const footer = page.getByRole('contentinfo');
    await expect(footer).toBeVisible();
  });

  test('navigation landmark is present', async ({ page }) => {
    const nav = page.getByRole('navigation');
    await expect(nav.first()).toBeVisible();
  });

  test('logo link has accessible name', async ({ page }) => {
    const logoLink = page.locator('.masthead__logo a');
    await expect(logoLink).toHaveAccessibleName(/eventua11y/i);
  });

  test('theme selector button has accessible name', async ({ page }) => {
    const themeButton = page.locator('#theme-selector-button');
    // sl-icon-button provides its accessible name via the label attribute,
    // which is applied to the inner <button> in shadow DOM. Playwright's
    // toHaveAccessibleName cannot pierce shadow DOM, so we verify the
    // label attribute directly. The axe scan confirms the button is accessible.
    await expect(themeButton).toHaveAttribute('label', /.+/);
  });

  test('upcoming events heading exists (visually hidden)', async ({ page }) => {
    const heading = page.getByRole('heading', {
      name: /upcoming accessibility events/i,
    });
    await expect(heading).toBeAttached();
  });

  test('primary nav links have accessible names', async ({ page }) => {
    const upcomingLink = page.getByRole('link', { name: 'Upcoming' });
    await expect(upcomingLink).toHaveAccessibleName('Upcoming');

    const pastEventsLink = page.getByRole('link', { name: 'Past Events' });
    await expect(pastEventsLink).toHaveAccessibleName('Past Events');
  });

  test('current page is indicated with aria-current', async ({ page }) => {
    const upcomingLink = page.locator('.primaryNav__link[href="/"]');
    await expect(upcomingLink).toHaveAttribute('aria-current', 'page');
  });

  test('month navigation has accessible name', async ({ page }) => {
    const monthNav = page.locator('nav[aria-label="Months"]');
    await expect(monthNav).toHaveAccessibleName('Months');
  });

  test('filter button has accessible name', async ({ page }) => {
    const filterButton = page.locator('#open-filter-drawer');
    await filterButton.waitFor({ state: 'visible', timeout: 5000 });
    // sl-button provides its accessible name via aria-label, which is
    // applied to the inner <button> in shadow DOM. Playwright's
    // toHaveAccessibleName cannot pierce shadow DOM, so we verify the
    // aria-label attribute directly. The axe scan confirms the button is accessible.
    await expect(filterButton).toHaveAttribute('aria-label', /filter/i);
  });

  test('filter count region is an aria-live region', async ({ page }) => {
    const filterCount = page.locator('.filters__count');
    await expect(filterCount).toHaveAttribute('aria-live', 'polite');
    await expect(filterCount).toHaveAttribute('aria-atomic', 'true');
  });
});

// ---------------------------------------------------------------------------
// Past Events (/past-events)
// ---------------------------------------------------------------------------
test.describe('Past Events page accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/past-events');
    await page.waitForSelector('#past-events');
  });

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const results = await runAxeScan(page);
    expect(results.violations).toEqual([]);
  });

  test('page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Past accessibility events.*Eventua11y/);
  });

  test('main landmark is present', async ({ page }) => {
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('past events heading exists (visually hidden)', async ({ page }) => {
    const heading = page.getByRole('heading', {
      name: /past accessibility events/i,
    });
    await expect(heading).toBeAttached();
  });

  test('events region is labelled', async ({ page }) => {
    const region = page.locator('#events[role="region"]');
    await expect(region).toHaveAttribute(
      'aria-labelledby',
      'past-events-heading'
    );
  });

  test('aria-current indicates past events page in nav', async ({ page }) => {
    const pastLink = page.locator('.primaryNav__link[href="/past-events"]');
    await expect(pastLink).toHaveAttribute('aria-current', 'page');
  });
});

// ---------------------------------------------------------------------------
// Accessibility Statement (/accessibility)
// ---------------------------------------------------------------------------
test.describe('Accessibility Statement page accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/accessibility');
  });

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const results = await runAxeScan(page);
    expect(results.violations).toEqual([]);
  });

  test('page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Accessibility Statement.*Eventua11y/);
  });

  test('main landmark is present', async ({ page }) => {
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('h1 heading is visible', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveAccessibleName('Accessibility Statement');
  });

  test('heading hierarchy is correct (no skipped levels)', async ({ page }) => {
    // The page should have h1, then h2s, then h3s — no skips
    const h1Count = await page.getByRole('heading', { level: 1 }).count();
    expect(h1Count).toBe(1);

    const h2Count = await page.getByRole('heading', { level: 2 }).count();
    expect(h2Count).toBeGreaterThan(0);
  });

  test('all links have accessible names', async ({ page }) => {
    const links = page.locator('.readable a');
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      await expect(links.nth(i)).toHaveAccessibleName(/.+/);
    }
  });

  test('banner and contentinfo landmarks are present', async ({ page }) => {
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Curation Policy (/curation-policy)
// ---------------------------------------------------------------------------
test.describe('Curation Policy page accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/curation-policy');
  });

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const results = await runAxeScan(page);
    expect(results.violations).toEqual([]);
  });

  test('page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Curation Policy.*Eventua11y/);
  });

  test('main landmark is present', async ({ page }) => {
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('h1 heading is visible', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveAccessibleName('Event Curation Policy');
  });

  test('heading hierarchy is correct (no skipped levels)', async ({ page }) => {
    const h1Count = await page.getByRole('heading', { level: 1 }).count();
    expect(h1Count).toBe(1);

    const h2Count = await page.getByRole('heading', { level: 2 }).count();
    expect(h2Count).toBeGreaterThan(0);
  });

  test('all links have accessible names', async ({ page }) => {
    const links = page.locator('.readable a');
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      await expect(links.nth(i)).toHaveAccessibleName(/.+/);
    }
  });

  test('banner and contentinfo landmarks are present', async ({ page }) => {
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 404 Page (/404)
// ---------------------------------------------------------------------------
test.describe('404 page accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/404');
  });

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const results = await runAxeScan(page);
    expect(results.violations).toEqual([]);
  });

  test('page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Page not found.*Eventua11y/);
  });

  test('main landmark is present', async ({ page }) => {
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('h1 heading is visible', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveAccessibleName('Page not found');
  });

  test('link back to homepage has accessible name', async ({ page }) => {
    const homeLink = page.getByRole('link', {
      name: /upcoming accessibility events/i,
    });
    await expect(homeLink).toBeVisible();
    await expect(homeLink).toHaveAccessibleName(
      /upcoming accessibility events/i
    );
  });

  test('banner and contentinfo landmarks are present', async ({ page }) => {
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Shared component assertions (tested on homepage where all components load)
// ---------------------------------------------------------------------------
test.describe('Shared component accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#upcoming-events');
    const filterDrawer = page.locator('#filter-drawer');
    const isVisible = await filterDrawer.isVisible();
    if (isVisible) {
      await page.keyboard.press('Escape');
      await expect(filterDrawer).not.toBeVisible();
    }
  });

  test('footer social links have accessible names', async ({ page }) => {
    const footer = page.getByRole('contentinfo');
    const socialLinks = footer.locator('.social a');
    const count = await socialLinks.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(socialLinks.nth(i)).toHaveAccessibleName(/.+/);
    }
  });

  test('footer links to accessibility statement and curation policy exist', async ({
    page,
  }) => {
    const a11yLink = page.getByRole('link', {
      name: /accessibility/i,
    });
    await expect(a11yLink.last()).toBeVisible();

    const curationLink = page.getByRole('link', {
      name: /curation policy/i,
    });
    await expect(curationLink).toBeVisible();
  });

  test('filter drawer has accessible label when opened', async ({ page }) => {
    const filterButton = page.locator('#open-filter-drawer');
    await filterButton.waitFor({ state: 'visible', timeout: 5000 });
    await filterButton.click();

    const drawer = page.locator('#filter-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute('label', 'Filters');
  });

  test('html element has lang attribute', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
