import { test, expect } from '@playwright/test';

// Topics stays off while server middleware supplies only safe defaults.
test.describe('Topics feature flag — flag OFF (default)', () => {
  for (const path of [
    '/topics',
    '/topics/accessibility',
    '/topics/this-topic-does-not-exist-12345',
  ]) {
    test(`${path} returns the 404 page without redirecting`, async ({
      page,
    }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      expect(new URL(page.url()).pathname).toBe(path);
      await expect(
        page.getByRole('heading', { name: 'Page not found', level: 1 })
      ).toBeVisible();
    });
  }

  test('header nav does not contain a Topics link when flag is off', async ({
    page,
  }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute(
      'data-flags-source',
      'default'
    );
    await expect(page.locator('#global-header')).toBeVisible();
    const topicsLink = page
      .getByRole('navigation')
      .getByRole('link', { name: 'Topics' });
    await expect(topicsLink).toHaveCount(0);
  });

  test('sitemap does not include /topics URLs when flag is off', async ({
    request,
  }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/xml');
    const body = await response.text();
    expect(body).toContain('<urlset');
    expect(body).not.toContain('/topics');
  });
});
