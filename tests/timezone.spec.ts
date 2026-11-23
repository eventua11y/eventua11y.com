import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const timezone = 'Asia/Tokyo';

async function mockUserInfo(page: Page) {
  await page.route('**/api/get-user-info', (route) =>
    route.fulfill({
      json: { timezone, acceptLanguage: 'en', geo: { timezone } },
    })
  );
}

async function chooseTimezone(page: Page, value: string) {
  const select = page.locator('#timezone-select');
  await select.click();
  await page
    .locator('#timezone-select wa-option')
    .filter({ hasText: value })
    .click();
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
]) {
  test(`header timezone control is keyboard accessible at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await mockUserInfo(page);
    await page.goto('/');

    const select = page.locator('#global-header #timezone-select');
    await expect(select).toHaveCount(1);
    await expect(page.locator('#filters #timezone-select')).toHaveCount(0);
    const combobox = select.getByRole('combobox');
    await expect(combobox).toHaveAccessibleName('Timezone');
    await expect(combobox).toHaveValue('Event local times');
    await page.locator('#global-header nav a').last().focus();
    await page.keyboard.press('Tab');
    await expect(combobox).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(select).toHaveAttribute('open', '');
    const results = await new AxeBuilder({ page })
      .include('#global-header')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    await expect(select).not.toHaveAttribute('open', '');
    await expect(combobox).toHaveValue(/Tokyo/);
  });
}

test('switches listing times and month groups and persists across navigation', async ({
  page,
}) => {
  await mockUserInfo(page);
  await page.route('**/api/get-books', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/get-events', (route) =>
    route.fulfill({
      json: {
        today: [],
        future: [
          {
            _id: 'timezone-test',
            title: 'Timezone test event',
            type: 'conference',
            dateStart: '2030-12-31T23:30:00Z',
            timezone: 'America/New_York',
          },
        ],
        past: [],
      },
    })
  );
  await page.goto('/');
  const event = page
    .locator('#upcoming-events')
    .getByText('Timezone test event');
  await expect(event).toBeVisible();
  const date = page.locator('#upcoming-events .event__dates').first();
  const original = await date.innerText();
  await expect(page.locator('#section-2030-12')).toBeVisible();

  await chooseTimezone(page, 'Tokyo');
  await expect(date).not.toHaveText(original);
  await expect(page.locator('#section-2031-1')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('useLocalTimezone')))
    .toBe('true');

  await page.goto('/past-events');
  await expect(page.locator('#timezone-select')).toHaveJSProperty(
    'value',
    timezone
  );
  await page.reload();
  await expect(page.locator('#timezone-select')).toHaveJSProperty(
    'value',
    timezone
  );
  await chooseTimezone(page, 'Event local times');
  await page.goto('/');
  await expect(page.locator('#timezone-select')).toHaveJSProperty(
    'value',
    'event'
  );
  await expect(page.locator('#section-2030-12')).toBeVisible();
});

test('changes event detail times and retains the selection after reload', async ({
  page,
}) => {
  await mockUserInfo(page);
  await page.goto('/events/well-i-didnt-see-that-coming');
  const date = page.locator('.event-detail .event__dates').first();
  await expect(date).toBeVisible();
  const original = await date.innerText();

  await chooseTimezone(page, 'Tokyo');
  await expect(date).not.toHaveText(original);
  const localDate = await date.innerText();

  await page.reload();
  await expect(page.locator('#timezone-select')).toHaveJSProperty(
    'value',
    timezone
  );
  await expect(date).toHaveText(localDate);
  await chooseTimezone(page, 'Event local times');
  await expect(date).toHaveText(original);
});

test('a late user-info response does not overwrite the selected preference', async ({
  page,
}) => {
  let releaseUserInfo!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseUserInfo = resolve;
  });
  await page.addInitScript(() => {
    localStorage.setItem('userGeo', JSON.stringify({ timezone: 'Asia/Tokyo' }));
    localStorage.setItem('userTimezone', 'Asia/Tokyo');
    localStorage.setItem('useLocalTimezone', 'true');
  });
  await page.route('**/api/get-user-info', async (route) => {
    await gate;
    await route.fulfill({
      json: { timezone, acceptLanguage: 'en', geo: { timezone } },
    });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await chooseTimezone(page, 'Event local times');
  const response = page.waitForResponse('**/api/get-user-info');
  releaseUserInfo();
  await response;
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('userLocale')))
    .toBe('en');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('userTimezone')))
    .toBe('event');
  await expect(page.locator('#timezone-select')).toHaveJSProperty(
    'value',
    'event'
  );
});

test('uses UTC and explains when timezone detection fails', async ({
  page,
}) => {
  await page.route('**/api/get-user-info', (route) => route.abort());
  await page.goto('/curation-policy');
  const select = page.locator('#timezone-select');
  await expect(select).toHaveJSProperty(
    'hint',
    'Timezone unavailable. UTC is available instead.'
  );
  await chooseTimezone(page, 'UTC');
  await expect(select).toHaveJSProperty('value', 'UTC');
});

test('does not present an unusable selector without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#timezone-select')).toHaveCount(0);
  await expect(page.locator('#global-header')).toBeVisible();
  await context.close();
});
