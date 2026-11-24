import { test, expect, type Locator, type Page } from '@playwright/test';
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
    _id: 'overnight-event',
    type: 'conference',
    title: 'Overnight event',
    dateStart: '2030-12-29T14:00:00Z',
    dateEnd: '2030-12-29T16:00:00Z',
    timezone: 'Asia/Tokyo',
  },
  {
    _id: 'multi-day-event',
    type: 'conference',
    title: 'Multi-day event',
    dateStart: '2031-02-08T21:00:00Z',
    dateEnd: '2031-02-10T21:00:00Z',
    timezone: 'Europe/London',
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

const timezoneButtonName = /show in your timezone/i;
const timezonePopoverSelector = '[popover]:not([popover="manual"])';

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
    const newYorkPopover = newYorkDate.locator(timezonePopoverSelector);
    const popoverId = await newYorkPopover.getAttribute('id');
    expect(popoverId).toBeTruthy();
    await expect(newYorkButton).toHaveAttribute('popovertarget', popoverId!);
    await expect(newYorkPopover).toBeVisible();
    await expect(newYorkPopover).not.toContainText('Event local time');
    await expect(newYorkPopover).toContainText('Your local time');
    await expect(newYorkPopover).toContainText(/January 1/);
    await expect(newYorkPopover).not.toContainText(/December 31|2030|2031/);
    await expect(newYorkPopover).toContainText(/8:30\s*AM/i);
    await expect(newYorkPopover).toContainText(/9:30\s*AM/i);
    await expect(newYorkPopover).not.toContainText(/6:30\s*PM/i);
    await expect(newYorkPopover).not.toContainText(/Eastern Standard Time/i);
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
    await expect(londonPopover).not.toContainText(/December|January/);
    await expect(londonPopover).not.toContainText(/12:00\s*PM/i);
    await expect(londonPopover).toContainText(/9:00\s*PM/i);
    await expect(londonPopover).not.toContainText(/8:30\s*AM/i);
  });

  test('opens by keyboard, closes with Escape and remains accessible', async ({
    page,
  }) => {
    const event = eventCard(page, 'New York event');
    const button = event.getByRole('button', {
      name: timezoneButtonName,
    });
    const popover = event.locator(timezonePopoverSelector);
    await event.getByRole('link', { name: 'New York event' }).focus();
    await page.keyboard.press('Tab');
    await expect(button).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(popover).toBeVisible();
    const content = popover.getByRole('group', { name: 'Your local time' });
    await expect(content).toBeFocused();
    await expect(popover).toHaveCSS('outline-style', 'solid');
    await expect(content).toHaveAccessibleDescription(
      /January 1.*8:30\s*AM.*until.*9:30\s*AM.*Japan Standard Time/i
    );
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
    await expect(content).toBeFocused();
  });

  test('moves pointer focus into the popover and returns it when toggled closed', async ({
    page,
  }) => {
    const event = eventCard(page, 'New York event');
    const button = event.getByRole('button', {
      name: timezoneButtonName,
    });
    const popover = event.locator('[popover]');
    await button.click();
    await expect(popover.getByRole('group')).toBeFocused();
    await expect(popover).toHaveCSS('outline-style', 'none');
    await button.click();
    await expect(popover).toBeHidden();
    await expect(button).toBeFocused();
  });

  test('does not steal focus when another control light-dismisses the popover', async ({
    page,
  }) => {
    const event = eventCard(page, 'New York event');
    await event.getByRole('button', { name: timezoneButtonName }).click();
    const popover = event.locator('[popover]');
    await expect(popover.getByRole('group')).toBeFocused();
    const otherControl = page.getByRole('switch', { name: 'Awareness days' });
    await page.locator('#filter-show-awareness-days-bar').click();
    await expect(popover).toBeHidden();
    await expect(otherControl).toBeFocused();
  });

  test('does not return focus after Tab has moved out of the popover', async ({
    page,
  }) => {
    const event = eventCard(page, 'New York event');
    await event.getByRole('button', { name: timezoneButtonName }).click();
    const popover = event.locator('[popover]');
    await expect(popover.getByRole('group')).toBeFocused();
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    const focusedElement = await focused.elementHandle();
    expect(focusedElement).not.toBeNull();
    await expect(popover.getByRole('group')).not.toBeFocused();
    await page.keyboard.press('Escape');
    await expect(popover).toBeHidden();
    expect(
      await focusedElement!.evaluate(
        (element) => element === document.activeElement
      )
    ).toBe(true);
  });

  test('shows only the converted time, without relative labels or copy controls', async ({
    page,
  }) => {
    const event = eventCard(page, 'New York event');
    await event.getByRole('button', { name: timezoneButtonName }).click();
    const popover = event.locator(timezonePopoverSelector);
    await expect(popover).toBeVisible();
    await expect(popover.locator('.timezone-popover__row')).toHaveCount(1);
    await expect(popover.locator('.timezone-popover__row')).toContainText(
      /Your local time.*January 1.*8:30\s*AM.*(?:JST|GMT\+9)/i
    );
    await expect(popover).not.toContainText(
      /Event local time|from now|\bago\b|Tomorrow|Yesterday|\bIn \d/i
    );
    await expect(popover.locator('wa-copy-button')).toHaveCount(0);
  });

  test('shows dates only when the event crosses midnight in a shown timezone', async ({
    page,
  }) => {
    const openRows = async (title: string) => {
      const event = eventCard(page, title);
      await event.getByRole('button', { name: timezoneButtonName }).click();
      return event.locator('[popover]:popover-open .timezone-popover__row');
    };

    // Same calendar date in New York and Tokyo: times only.
    const sameDay = await openRows('Offset change event');
    await expect(sameDay).toHaveCount(1);
    await expect(sameDay).toContainText(/3:30\s*PM.*4:30\s*PM/i);
    await expect(sameDay).not.toContainText(/March/);
    await expect(sameDay.locator('time').first()).toHaveAttribute(
      'datetime',
      '2031-03-09T15:30:00+09:00'
    );
    await page.keyboard.press('Escape');

    // One Tokyo date, but the event's own date differs: keep the date.
    const shifted = await openRows('New York event');
    await expect(shifted).toHaveCount(1);
    await expect(shifted).toContainText(/January 1.*8:30\s*AM.*9:30\s*AM/i);
    await page.keyboard.press('Escape');

    // Range that crosses midnight in the viewer's timezone.
    const overnight = await openRows('Multi-day event');
    await expect(overnight).toHaveCount(1);
    await expect(overnight).toContainText(
      /February 9.*6:00\s*AM.*February 11.*6:00\s*AM/i
    );
  });

  test('puts each multi-day range endpoint on its own line and allows reflow', async ({
    page,
  }) => {
    const event = eventCard(page, 'Multi-day event');
    await event.getByRole('button', { name: timezoneButtonName }).click();
    const popover = event.locator('[popover]:popover-open');
    const rows = popover.locator('.timezone-popover__row');
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText(/February 9.*6:00\s*AM/i);
    await expect(rows).toContainText(/February 11.*6:00\s*AM/i);

    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const row of await rows.all()) {
        const times = row.locator('time');
        const start = await times.first().boundingBox();
        const end = await times.last().boundingBox();
        const separator = await row
          .locator('[aria-hidden="true"]')
          .boundingBox();
        expect(start).not.toBeNull();
        expect(end).not.toBeNull();
        expect(separator).not.toBeNull();
        expect(end!.y).toBeGreaterThanOrEqual(start!.y + start!.height - 1);
        expect(Math.abs(separator!.y - end!.y)).toBeLessThan(2);
        expect(separator!.x).toBeLessThan(end!.x);
        expect(
          await times.last().evaluate((time) => time.getClientRects().length)
        ).toBe(1);
      }
    }

    await popover.evaluate((element) => {
      element.style.width = '130px';
    });
    const end = rows.first().locator('time').last();
    await expect
      .poll(() => end.evaluate((time) => time.getClientRects().length))
      .toBeGreaterThan(1);
    const content = popover.locator('.timezone-popover__content');
    expect(
      await content.evaluate(
        (element) => element.scrollWidth <= element.clientWidth
      )
    ).toBe(true);
  });

  test('prefers below on detail pages and above on cards, with opposite-side fallbacks', async ({
    page,
  }) => {
    const checkPlacement = async (
      button: Locator,
      top: number,
      side: 'top' | 'bottom'
    ) => {
      await button.evaluate((element, top) => {
        Object.assign(element.style, {
          position: 'fixed',
          top: `${top}px`,
          left: '150px',
        });
      }, top);
      await button.press('Space');
      const popover = page.locator(
        `#${await button.getAttribute('popovertarget')}`
      );
      await expect(popover).toBeVisible();
      await expect
        .poll(async () => {
          const anchor = await button.boundingBox();
          const panel = await popover.boundingBox();
          return Math.round(
            side === 'bottom'
              ? panel!.y - (anchor!.y + anchor!.height)
              : anchor!.y - (panel!.y + panel!.height)
          );
        })
        .toBe(10);
      await expect(popover).toHaveClass(
        new RegExp(
          `timezone-popover--arrow-${side === 'bottom' ? 'top' : 'bottom'}`
        )
      );
      const typeSizes = await popover.evaluate((element) => ({
        panel: getComputedStyle(element).fontSize,
        label: getComputedStyle(element.querySelector('strong, p')!).fontSize,
      }));
      await page.keyboard.press('Escape');
      return typeSizes;
    };

    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const cardButton = eventCard(page, 'New York event').getByRole('button', {
        name: timezoneButtonName,
      });
      const cardTypeSizes = await checkPlacement(cardButton, 420, 'top');
      await checkPlacement(cardButton, 20, 'bottom');

      await page.goto('/events/test-fixture-event-tutorial');
      const detailButton = page
        .locator('.event-detail .timezone-trigger')
        .first();
      const detailTypeSizes = await checkPlacement(detailButton, 420, 'bottom');
      expect(detailTypeSizes).toEqual(cardTypeSizes);
      await checkPlacement(detailButton, 820, 'top');
    }
  });

  test('exposes range endpoints and until in reading order', async ({
    page,
  }) => {
    for (const title of ['New York event', 'Offset change event']) {
      const event = eventCard(page, title);
      await event.getByRole('button', { name: timezoneButtonName }).click();
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
        const row = popover.locator('.timezone-popover__row');
        await expect(row.locator('time').first()).toHaveAttribute(
          'datetime',
          '2031-03-09T15:30:00+09:00'
        );
        await expect(row.locator('time').last()).toHaveAttribute(
          'datetime',
          '2031-03-09T16:30:00+09:00'
        );
        await expect(row.locator('.timezone-popover__zone')).toHaveCount(1);
      }
      await page.keyboard.press('Escape');
    }

    const single = eventCard(page, 'London event');
    await single.getByRole('button', { name: timezoneButtonName }).click();
    const singlePopover = single.locator('[popover]:popover-open');
    await expect(singlePopover.locator('time')).toHaveCount(1);
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
      event.getByRole('button', { name: timezoneButtonName })
    ).toHaveCount(0);
    await expect(event.locator(timezonePopoverSelector)).toHaveCount(0);
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
    await event.getByRole('button', { name: timezoneButtonName }).click();
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
    await event.getByRole('button', { name: timezoneButtonName }).click();
    const popover = event.locator(timezonePopoverSelector);
    await expect(
      popover.getByRole('group', {
        name: 'Your device uses the event timezone.',
      })
    ).toBeFocused();
    await expect(popover).toContainText(
      /same (?:time ?zone|local time)|device uses the event time ?zone/i
    );
    await expect(popover.locator('.timezone-popover__row')).toHaveCount(0);
    await expect(popover.locator('time')).toHaveCount(0);
    await expect(popover).not.toContainText(
      /from now|\bago\b|Tomorrow|Yesterday|\bIn \d/i
    );
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
    await event.getByRole('button', { name: timezoneButtonName }).click();
    const popover = event.locator(timezonePopoverSelector);
    await expect(popover).not.toContainText(/January 1/);
    await expect(popover).toContainText(/December 31.*8:00\s*AM/i);
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
        event.getByRole('button', { name: timezoneButtonName })
      ).toHaveCount(0);
      await expect(event.locator(timezonePopoverSelector)).toHaveCount(0);
    }
  });
});
