import { test, expect } from '@playwright/test';

/**
 * Tests for the `topic_pages_enabled` feature flag gating all topic surfaces.
 *
 * The flag defaults to `false` in all environments. These tests verify the
 * flag-off (default) behaviour only.
 *
 * FLAG-ON BEHAVIOUR (topic_pages_enabled = true):
 * Cannot be tested here because Flagsmith cannot be toggled from Playwright.
 * Flag-on state must be verified manually in a deploy preview by enabling the
 * flag in the Flagsmith non-production environment, then checking:
 *   - /topics returns 200 and renders the topics index
 *   - /topics/<slug> returns 200 and renders the topic detail page
 *   - The header nav contains a "Topics" link
 *   - /sitemap.xml contains /topics and individual topic URLs
 *   - Event detail pages with topics show the .event-detail__topics chip block
 *
 * TODO: If a Flagsmith mock/stub mechanism is added to the test infrastructure,
 * revisit and add flag-on assertions here.
 */

test.describe('Topics feature flag — flag OFF (default)', () => {
  test('/topics redirects to 404 when flag is off', async ({ page }) => {
    const response = await page.goto('/topics');
    // The page redirects to /404; follow the redirect and check the final URL
    const url = page.url();
    expect(url).toContain('404');
  });

  test('/topics/[slug] redirects to 404 when flag is off', async ({ page }) => {
    const response = await page.goto('/topics/some-slug');
    const url = page.url();
    expect(url).toContain('404');
  });

  test('header nav does not contain a Topics link when flag is off', async ({
    page,
  }) => {
    await page.goto('/');
    // Wait for the server-rendered header to be present
    await page.waitForSelector('#global-header');

    const topicsLink = page
      .getByRole('navigation')
      .getByRole('link', { name: 'Topics' });
    await expect(topicsLink).toHaveCount(0);
  });

  test('sitemap does not include /topics URLs when flag is off', async ({
    page,
  }) => {
    const response = await page.goto('/sitemap.xml');
    expect(response).not.toBeNull();
    const body = await page.content();
    expect(body).not.toContain('/topics');
  });

  /**
   * Topic chips on event detail pages (/events/[slug]):
   *
   * The .event-detail__topics block is omitted from the DOM when the flag is
   * off AND the event has topics. We cannot assert its absence on a known event
   * without first confirming that event has topics in the test dataset.
   *
   * TODO: Query the test dataset for an event with at least one topic, then add:
   *   await page.goto(`/events/${slugWithTopics}`);
   *   await expect(page.locator('.event-detail__topics')).toHaveCount(0);
   *
   * For now this surface is covered implicitly: if the flag gate works for
   * /topics and the nav link, the same `hasTopics` boolean (which requires the
   * flag) drives the chip block, so a regression there would be caught by a
   * manual flag-on smoke test.
   */
});
