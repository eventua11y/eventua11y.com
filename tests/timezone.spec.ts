import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const events = [
  {
    _id: 'offset-change',
    type: 'conference',
    title: 'Offset change event',
    dateStart: '2031-03-09T06:30:00Z',
    dateEnd: '2031-03-09T07:30:00Z',
    timezone: 'America/New_York',
  },
  {
    _id: 'new-york-event',
    type: 'conference',
    title: 'New York event',
    slug: { current: 'new-york-event' },
    dateStart: '2030-12-31T23:30:00Z',
    dateEnd: '2031-01-01T00:30:00Z',
    timezone: 'America/New_York',
  },
  {
    _id: 'london-event',
    type: 'conference',
    title: 'London event',
    slug: { current: 'london-event' },
    dateStart: '2030-12-31T12:00:00Z',
    timezone: 'Europe/London',
  },
  {
    _id: 'tokyo-event',
    type: 'conference',
    title: 'Tokyo event',
    dateStart: '2030-12-31T16:00:00Z',
    timezone: 'Asia/Tokyo',
  },
  {
    _id: 'no-timezone-event',
    type: 'conference',
    title: 'Event without timezone',
    dateStart: '2030-12-31T23:30:00Z',
  },
  {
    _id: 'all-day-event',
    type: 'conference',
    title: 'All-day event',
    dateStart: '2030-12-31T12:00:00Z',
    timezone: 'Europe/London',
    day: true,
  },
  {
    _id: 'awareness-day',
    type: 'theme',
    title: 'Awareness day',
    dateStart: '2030-12-31T00:00:00Z',
  },
  {
    _id: 'deadline',
    type: 'deadline',
    title: 'Deadline event',
    dateStart: '2030-12-31T12:00:00Z',
    timezone: 'Europe/London',
    website: 'https://example.com',
  },
];

async function mockEvents(page: Page) {
  await page.route('**/api/get-user-info', (route) =>
    route.fulfill({
      json: { timezone: 'UTC', acceptLanguage: 'en', geo: { timezone: 'UTC' } },
    })
  );
  await page.route('**/api/get-books', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/get-events', (route) =>
    route.fulfill({ json: { today: [], future: events, past: [] } })
  );
}

function eventCard(page: Page, title: string) {
  return page.locator('#upcoming-events .event').filter({ hasText: title });
}

test.describe('Event timezone conversion', () => {
  test.use({ timezoneId: 'Asia/Tokyo', locale: 'en-US', hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await mockEvents(page);
    await page.goto('/');
    await expect(eventCard(page, 'New York event')).toBeVisible();
  });

  test('shows the friendly countdown on Today cards', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2030-12-31T02:00:00Z'));
    await page.route('**/api/get-events', (route) =>
      route.fulfill({ json: { today: [events[2]], future: [], past: [] } })
    );
    await page.reload();

    const event = page.locator('#today .event').filter({
      hasText: 'London event',
    });
    await expect(event.locator('.event__progress-label')).toHaveText(
      'In 10 hours'
    );
  });

  test('shows each event in its own timezone and converts the correct event across midnight', async ({
    page,
  }) => {
    await expect(page.locator('#timezone-select')).toHaveCount(0);
    const newYork = eventCard(page, 'New York event');
    const london = eventCard(page, 'London event');
    const newYorkDate = newYork.locator('.event__dates');
    const londonDate = london.locator('.event__dates');
    const newYorkButton = newYorkDate.getByRole('button', {
      name: /show in your timezone.*EST|EST.*show in your timezone/i,
    });
    const londonButton = londonDate.getByRole('button', {
      name: /show in your timezone.*GMT|GMT.*show in your timezone/i,
    });

    await expect(newYorkDate.locator('time').first()).toContainText(
      /December 31/
    );
    await expect(newYorkDate.locator('time').first()).toContainText(/6:30/i);
    await expect(newYorkButton).toContainText('EST');
    await expect(londonButton).toContainText('GMT');

    await newYorkButton.click();
    const newYorkPopover = newYorkDate.locator(
      '[popover]:not([popover="manual"])'
    );
    const popoverId = await newYorkPopover.getAttribute('id');
    expect(popoverId).toBeTruthy();
    await expect(newYorkButton).toHaveAttribute('popovertarget', popoverId!);
    await expect(newYorkPopover).toBeVisible();
    await expect(newYorkPopover).toContainText('Event local time');
    await expect(newYorkPopover).toContainText('Your local time');
    await expect(newYorkPopover).toContainText(/January 1/);
    await expect(newYorkPopover).not.toContainText(/2030|2031/);
    await expect(newYorkPopover).toContainText(/8:30\s*AM/i);
    await expect(newYorkPopover).toContainText(/9:30\s*AM/i);
    await expect(newYorkPopover).toContainText(/Eastern Standard Time/i);
    await expect(newYorkPopover).toContainText(/Japan Standard Time/i);
    await expect(newYorkPopover).not.toContainText(
      /next day in your timezone/i
    );
    await expect(newYorkDate.locator('time').first()).toContainText(
      /December 31/
    );
    await expect(page.locator('#section-2030-12')).toBeVisible();

    await londonButton.tap();
    const londonPopover = londonDate.locator(
      '[popover]:not([popover="manual"])'
    );
    await expect(londonPopover).toBeVisible();
    await expect(londonPopover).toContainText('Your local time');
    await expect(londonPopover).toContainText(/December 31/);
    await expect(londonPopover).toContainText(/9:00\s*PM/i);
    await expect(londonPopover).not.toContainText(/8:30\s*AM/i);
  });

  test('opens by keyboard, closes with Escape and remains accessible', async ({
    page,
  }) => {
    const event = eventCard(page, 'New York event');
    const button = event.getByRole('button', {
      name: /show in your timezone/i,
    });
    const popover = event.locator('[popover]:not([popover="manual"])');
    await event.getByRole('link', { name: 'New York event' }).focus();
    await page.keyboard.press('Tab');
    await expect(button).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(popover).toBeVisible();
    await expect(popover).toContainText('Your local time');
    const results = await new AxeBuilder({ page })
      .include('#upcoming-events')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(popover).toBeHidden();
    await expect(button).toBeFocused();
    await page.keyboard.press('Space');
    await expect(popover).toBeVisible();
  });

  test('shows both local times without copy controls', async ({ page }) => {
    const event = eventCard(page, 'New York event');
    await event.getByRole('button', { name: /show in your timezone/i }).click();
    const popover = event.locator('[popover]:not([popover="manual"])');
    await expect(popover).toBeVisible();
    const eventRow = popover
      .getByText('Event local time', { exact: true })
      .locator('..');
    const viewerRow = popover
      .getByText('Your local time', { exact: true })
      .locator('..');
    await expect(eventRow).toContainText(/December 31.*6:30\s*PM.*EST/i);
    await expect(viewerRow).toContainText(
      /January 1.*8:30\s*AM.*(?:JST|GMT\+9)/i
    );

    await expect(popover.locator('wa-copy-button')).toHaveCount(0);
  });

  test('shows relative time for the event', async ({ page }) => {
    const event = eventCard(page, 'New York event');
    await event.getByRole('button', { name: /show in your timezone/i }).click();
    await expect(
      event.locator('[popover]:not([popover="manual"])')
    ).toContainText(
      /(?:in\s+(?:[\d,]+|an?)\s+(?:minutes?|hours?|days?|weeks?|months?|years?)|(?:[\d,]+|an?)\s+(?:minutes?|hours?|days?|weeks?|months?|years?)\s+(?:ago|from now))/i
    );
  });

  test('exposes range endpoints and until in reading order', async ({
    page,
  }) => {
    for (const title of ['New York event', 'Offset change event']) {
      const event = eventCard(page, title);
      await event
        .getByRole('button', { name: /show in your timezone/i })
        .click();
      const popover = event.locator('[popover]:popover-open');
      for (const row of await popover.locator('.timezone-popover__row').all()) {
        await expect(row.locator('time')).toHaveCount(2);
        for (const time of await row.locator('time').all()) {
          await expect(time).toHaveAttribute(
            'datetime',
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/
          );
        }
        await expect(row.locator('.sr-only')).toHaveText('until');
        await expect(row.locator('[aria-hidden="true"]')).toHaveText('–');
        const snapshot = await row.ariaSnapshot();
        expect(snapshot).toMatch(/- time: .+\n- text: .*until\n- time: /);
        expect(snapshot).not.toContain('–');
      }
      if (title === 'Offset change event') {
        const eventRow = popover.locator('.timezone-popover__row').first();
        await expect(eventRow.locator('time').first()).toHaveAttribute(
          'datetime',
          '2031-03-09T01:30:00-05:00'
        );
        await expect(eventRow.locator('time').last()).toHaveAttribute(
          'datetime',
          '2031-03-09T03:30:00-04:00'
        );
        await expect(eventRow.locator('.timezone-popover__zone')).toHaveCount(
          2
        );
      }
      await page.keyboard.press('Escape');
    }

    const single = eventCard(page, 'London event');
    await single
      .getByRole('button', { name: /show in your timezone/i })
      .click();
    const singlePopover = single.locator('[popover]:popover-open');
    await expect(singlePopover.locator('time')).toHaveCount(2);
    await expect(singlePopover.locator('.sr-only')).toHaveCount(0);
    await expect(singlePopover.locator('[aria-hidden="true"]')).toHaveCount(0);
  });

  test('uses the device timezone for timed events without an event timezone', async ({
    page,
  }) => {
    const event = eventCard(page, 'Event without timezone');
    await expect(event.locator('.event__dates time').first()).toContainText(
      /January 1.*8:30\s*AM/i
    );
    await expect(event.locator('.event__dates time').first()).toHaveAttribute(
      'datetime',
      '2031-01-01T08:30:00+09:00'
    );
    await expect(
      event.getByRole('button', { name: /show in your timezone/i })
    ).toHaveCount(0);
    await expect(
      event.locator('[popover]:not([popover="manual"])')
    ).toHaveCount(0);
  });

  test('keeps event links usable after opening the timezone popover', async ({
    page,
  }) => {
    await page.route('**/events/new-york-event', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><title>Event destination</title><h1>Event destination</h1>',
      })
    );
    const event = eventCard(page, 'New York event');
    await event.getByRole('button', { name: /show in your timezone/i }).click();
    await expect(page).toHaveURL('/');
    await event.getByRole('link', { name: 'New York event' }).click();
    await expect(page).toHaveURL('/events/new-york-event');
    await expect(
      page.getByRole('heading', { name: 'Event destination' })
    ).toBeVisible();
  });

  test('avoids duplicate rows when the device and event timezones match', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      timezoneId: 'America/New_York',
      locale: 'en-US',
    });
    const page = await context.newPage();
    await mockEvents(page);
    await page.goto('/');
    const event = eventCard(page, 'New York event');
    await event.getByRole('button', { name: /show in your timezone/i }).click();
    const popover = event.locator('[popover]:not([popover="manual"])');
    await expect(popover).toContainText(
      /same (?:time ?zone|local time)|device uses the event time ?zone/i
    );
    await expect(popover.locator('.timezone-popover__row')).toHaveCount(1);
    await context.close();
  });

  test('shows the previous viewer date without a separate day-change hint', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      timezoneId: 'America/Los_Angeles',
      locale: 'en-US',
    });
    const page = await context.newPage();
    await mockEvents(page);
    await page.goto('/');
    const event = eventCard(page, 'Tokyo event');
    await event.getByRole('button', { name: /show in your timezone/i }).click();
    const popover = event.locator('[popover]:not([popover="manual"])');
    await expect(popover).toContainText(/January 1/);
    await expect(popover).toContainText(/December 31/);
    await expect(popover).not.toContainText(/previous day in your timezone/i);
    await context.close();
  });

  test('does not offer timezone conversion for date-only events', async ({
    page,
  }) => {
    for (const title of ['All-day event', 'Awareness day', 'Deadline event']) {
      const event = eventCard(page, title);
      await expect(event).toBeVisible();
      await expect(event.locator('.event__dates time').first()).toBeVisible();
      await expect(
        event.getByRole('button', { name: /show in your timezone/i })
      ).toHaveCount(0);
      await expect(
        event.locator('[popover]:not([popover="manual"])')
      ).toHaveCount(0);
    }
  });
});
