import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * E2E tests for individual event detail pages (/events/[slug]).
 *
 * These tests require at least one event in the test dataset to have a slug.
 * Currently the following test slugs exist:
 *   - interact-london
 *   - agile-testing-days-2024
 *   - wearedevelopers-accessibility-ai-day
 */

// Helper: run an axe scan scoped to WCAG 2.2 Level AA
async function runAxeScan(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results;
}

// Use a known slug from the test dataset
const TEST_SLUG = 'interact-london';
const TEST_EVENT_TITLE = 'Interact London';

test.describe('Event detail page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/events/${TEST_SLUG}`);
  });

  test('has correct page title', async ({ page }) => {
    await expect(page).toHaveTitle(new RegExp(TEST_EVENT_TITLE));
    await expect(page).toHaveTitle(/Eventua11y/);
  });

  test('displays event title as h1', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(TEST_EVENT_TITLE);
  });

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const results = await runAxeScan(page);
    expect(results.violations).toEqual([]);
  });

  test('main landmark is present', async ({ page }) => {
    const main = page.getByRole('main');
    await expect(main).toBeVisible();
  });

  test('header banner landmark is present', async ({ page }) => {
    const banner = page.getByRole('banner');
    await expect(banner).toBeVisible();
  });

  test('footer contentinfo landmark is present', async ({ page }) => {
    const footer = page.getByRole('contentinfo');
    await expect(footer).toBeVisible();
  });

  test('article has Schema.org Event markup', async ({ page }) => {
    const article = page.locator(
      'article[itemtype="https://schema.org/Event"]'
    );
    await expect(article).toBeVisible();
  });

  test('page contains JSON-LD structured data', async ({ page }) => {
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toBeAttached();
    const content = await jsonLd.innerHTML();
    const data = JSON.parse(content);
    expect(data['@type']).toBe('Event');
    expect(data.name).toBe(TEST_EVENT_TITLE);
  });

  test('og:type meta tag is set to event', async ({ page }) => {
    const ogType = page.locator('meta[property="og:type"]');
    await expect(ogType).toHaveAttribute('content', 'event');
  });

  test('og:title includes event name', async ({ page }) => {
    const ogTitle = page.locator('meta[property="og:title"]');
    const content = await ogTitle.getAttribute('content');
    expect(content).toContain(TEST_EVENT_TITLE);
  });

  test('meta description is set', async ({ page }) => {
    const metaDesc = page.locator('meta[name="description"]');
    const content = await metaDesc.getAttribute('content');
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(0);
  });

  test('html element has lang attribute', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test.describe('Event detail page - 404 handling', () => {
  test('non-existent slug redirects to 404', async ({ page }) => {
    const response = await page.goto('/events/this-event-does-not-exist-12345');
    // The page should redirect to /404 or show a 404 response
    const url = page.url();
    expect(url).toContain('404');
  });
});
