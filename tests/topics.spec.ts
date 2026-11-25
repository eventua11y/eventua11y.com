import { test, expect } from '@playwright/test';

test('visitors can browse Topics from the primary navigation', async ({
  page,
}) => {
  await page.goto('/');
  const topicsLink = page
    .getByRole('navigation')
    .getByRole('link', { name: 'Topics', exact: true });
  await topicsLink.click();
  await expect(page).toHaveURL(/\/topics$/);
  await expect(topicsLink).toHaveAttribute('aria-current', 'page');
  await expect(
    page.getByRole('main').getByRole('heading', { name: 'Topics', level: 1 })
  ).toBeVisible();

  // The test dataset can contain duplicate copies of a published topic.
  await page
    .getByRole('main')
    .getByRole('link', { name: 'Open Source', exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/topics\/open-source$/);
  await expect(
    page
      .getByRole('main')
      .getByRole('heading', { name: 'Open Source', level: 1 })
  ).toBeVisible();
});

test('event details link to related topics', async ({ page }) => {
  await page.goto('/events/all-things-open-2026');
  await expect(
    page
      .getByRole('main')
      .getByRole('link', { name: 'Open Source', exact: true })
  ).toHaveAttribute('href', '/topics/open-source');
});

test('an unknown topic returns the 404 page without redirecting', async ({
  page,
}) => {
  const path = '/topics/this-topic-does-not-exist-12345';
  const response = await page.goto(path);
  expect(response?.status()).toBe(404);
  expect(new URL(page.url()).pathname).toBe(path);
  await expect(
    page.getByRole('heading', { name: 'Page not found', level: 1 })
  ).toBeVisible();
});

test('the sitemap includes the Topics index and published topics', async ({
  request,
}) => {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/xml');
  const body = await response.text();
  expect(body).toContain('<loc>https://eventua11y.com/topics</loc>');
  expect(body).toContain(
    '<loc>https://eventua11y.com/topics/open-source</loc>'
  );
});
