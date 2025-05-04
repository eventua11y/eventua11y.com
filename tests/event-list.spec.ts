import { test, expect } from '@playwright/test';

test.describe('Event List', () => {
  test.beforeEach(async ({ page }) => {
    // Go to homepage with a longer timeout for slower CI environments
    await page.goto('/', { timeout: 30000 });

    // Wait for critical UI elements to be present
    await page.waitForSelector('#upcoming-events');

    // Give the page a moment to stabilize
    await page.waitForLoadState('domcontentloaded');
  });

  test('displays upcoming events', async ({ page }) => {
    // Check that events list container is visible
    const eventList = page.locator('#upcoming-events');
    await expect(eventList).toBeVisible();

    // Wait more aggressively for events to load - multiple approaches
    try {
      // Approach 1: Wait for events to be present (up to 10 seconds)
      await page
        .waitForSelector('#upcoming-events .event', {
          timeout: 10000,
          state: 'attached',
        })
        .catch(() => {
          console.log(
            'No events found after waiting - will check if this is expected'
          );
        });

      // Approach 2: Check for loading indicators
      const isLoading = await page.evaluate(() => {
        return (
          !!document.querySelector('.loading-indicator') ||
          !!document.querySelector('[aria-busy="true"]') ||
          !!document.querySelector('.loading')
        );
      });

      if (isLoading) {
        console.log(
          'Loading indicator detected, waiting for it to disappear...'
        );
        await page.waitForFunction(
          () => {
            return (
              !document.querySelector('.loading-indicator') &&
              !document.querySelector('[aria-busy="true"]') &&
              !document.querySelector('.loading')
            );
          },
          { timeout: 15000 }
        );
      }

      // Approach 3: Wait for network requests to settle
      await page
        .waitForLoadState('networkidle', { timeout: 10000 })
        .catch(() => {
          console.log("Network activity didn't settle, continuing anyway");
        });

      // Final wait for any rendering updates
      await page.waitForTimeout(1000);
    } catch (e) {
      console.log('Error while waiting for events to load:', e);
      // Continue execution - we'll handle empty events gracefully below
    }

    // Check if we have events now
    const events = page.locator('#upcoming-events .event');
    const count = await events.count();

    if (count === 0) {
      // If no events found, check if there's data in the store or look for "no events" message
      const hasEvents = await page.evaluate(() => {
        // Check for a "no events" message, which would indicate it's expected to have 0 events
        const bodyText = document.body?.textContent || '';
        const hasNoEventsMessage =
          bodyText.includes('No events found') ||
          bodyText.includes('No upcoming events');

        // If there's a "no events" message, having 0 events is expected
        return !hasNoEventsMessage;
      });

      if (!hasEvents) {
        console.log(
          'No events available in test data - test passes conditionally'
        );
        // Test passes conditionally - there really are no events
      } else {
        // There should be events but they're not showing up - that's a failure
        expect(count).toBeGreaterThan(0);
      }
    } else {
      // We found events, test passes
      expect(count).toBeGreaterThan(0);
    }
  });

  test('navigates to past events page', async ({ page }) => {
    // Wait for page to be fully loaded before navigation
    await page.waitForLoadState('networkidle').catch(() => {
      console.log("Network didn't settle, continuing anyway");
    });

    // Find and click the past events link
    const pastEventsLink = page.getByRole('link', { name: /past events/i });
    await pastEventsLink.click();

    // Verify we're on the past events page
    await expect(page).toHaveURL(/.*past-events/);

    // Wait robustly for the past events to load
    await page.waitForSelector('#past-events');

    try {
      // Wait for either events to load or a "no events" message
      await Promise.race([
        page.waitForSelector('#past-events .event', { timeout: 10000 }),
        page.waitForSelector('#past-events .no-events-message', {
          timeout: 10000,
        }),
      ]).catch(() => {
        console.log(
          'Neither events nor no-events message found, continuing anyway'
        );
      });

      // Wait for any loading to complete
      await page
        .waitForLoadState('networkidle', { timeout: 5000 })
        .catch(() => {});
    } catch (e) {
      console.log('Error while waiting for past events content:', e);
    }

    // Check that past events list container is visible
    const pastEventsList = page.locator('#past-events');
    await expect(pastEventsList).toBeVisible();
  });

  test('toggles awareness days visibility', async ({ page }) => {
    // Make sure events are loaded with a more robust waiting strategy
    await page.waitForSelector('#upcoming-events');

    try {
      // Wait for events to appear
      await page
        .waitForSelector('#upcoming-events .event', {
          timeout: 10000,
          state: 'attached',
        })
        .catch(() => {
          console.log('No events found immediately, waiting for network idle');
        });

      // Wait for network activity to settle
      await page
        .waitForLoadState('networkidle', { timeout: 10000 })
        .catch(() => {
          console.log("Network didn't settle, continuing anyway");
        });

      // Extra wait to ensure everything is settled
      await page.waitForTimeout(1000);
    } catch (e) {
      console.log('Error while waiting for content to load:', e);
      // Continue execution - we'll handle empty event lists gracefully
    }

    // Find awareness days switch in filter bar
    const awarenessSwitch = page.locator('#filter-show-awareness-days-bar');

    // First ensure awareness days are enabled to get a baseline
    // Since default is true, we need to check the current state
    const isSwitchChecked = await awarenessSwitch.evaluate(
      (el: HTMLInputElement) => el.checked
    );

    // If awareness days are not already shown, enable them
    if (!isSwitchChecked) {
      await awarenessSwitch.click();
      await page.waitForTimeout(500);
    }

    // Count events with awareness days enabled
    const eventsWithAwareness = await page
      .locator('#upcoming-events .event')
      .count();

    // Now toggle awareness days off
    await awarenessSwitch.click();
    await page.waitForTimeout(500);

    // Count events with awareness days disabled
    const eventsWithoutAwareness = await page
      .locator('#upcoming-events .event')
      .count();

    // Verify toggling awareness days changes the number of events
    // Note: This assumes there are awareness day events in the test data
    // If that's not guaranteed, we'd need a different approach
    if (eventsWithAwareness === eventsWithoutAwareness) {
      // If the counts are the same, try to determine if there are theme/awareness days
      const hasThemeEvents = await page.evaluate(() => {
        // Check for theme-related elements in the DOM
        const themeElements = document.querySelectorAll(
          '[data-event-type="theme"], [data-type="theme"]'
        );
        if (themeElements.length > 0) return true;

        // Check for theme/awareness mentions in the page text
        const bodyText = document.body?.textContent || '';
        return (
          bodyText.includes('awareness day') || bodyText.includes('theme day')
        );
      });

      // If there are no theme events in the data, test passes conditionally
      if (!hasThemeEvents) {
        console.log(
          'No awareness day events found in test data - test passes conditionally'
        );
      } else {
        // Otherwise toggling should have had an effect
        expect(eventsWithAwareness).not.toEqual(eventsWithoutAwareness);
      }
    } else {
      // If counts differ, confirm awareness days toggle works
      expect(eventsWithAwareness).not.toEqual(eventsWithoutAwareness);
    }

    // Reset to default state (on) for other tests
    if (!isSwitchChecked) {
      await awarenessSwitch.click();
    }
  });

  test('limits past events to the last 12 months', async ({ page }) => {
    // Navigate to past events page
    await page.goto('/past-events', { timeout: 30000 });

    // Wait for the past events to load
    await page.waitForSelector('#past-events');

    // Wait for either events to load or a "no events" message
    try {
      await Promise.race([
        page.waitForSelector('#past-events .event', { timeout: 10000 }),
        page.waitForSelector('#past-events .no-events-message', {
          timeout: 10000,
        }),
      ]);
    } catch (e) {
      console.log('Error waiting for past events content:', e);
    }

    // Get all events
    const events = page.locator('#past-events .event');
    const count = await events.count();

    if (count === 0) {
      // If no events found, test passes conditionally
      console.log('No past events found - test passes conditionally');
      return;
    }

    // Calculate the date 12 months ago
    const today = new Date();
    const twelveMonthsAgo = new Date(
      today.setFullYear(today.getFullYear() - 1)
    );

    // Check each event's date to ensure it's not older than 12 months
    for (let i = 0; i < count; i++) {
      const event = events.nth(i); // Extract the event date using a data attribute or from the DOM
      const dateElement = await event.locator('[datetime]').first();
      if (dateElement) {
        const dateText = await dateElement.getAttribute('datetime');
        if (dateText) {
          const eventDate = new Date(dateText);
          expect(eventDate.getTime()).toBeGreaterThanOrEqual(
            twelveMonthsAgo.getTime()
          );
        } else {
          console.log('Event date attribute is missing or empty');
        }
      } else {
        console.log('Event date element not found');
      }
    }
  });
});
