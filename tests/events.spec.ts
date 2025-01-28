import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto(baseURL);
  const filterDrawer = page.locator('#filter-drawer');
  const isVisible = await filterDrawer.isVisible();
  if (isVisible) {
    await page.keyboard.press('Escape');
    await expect(filterDrawer).not.toBeVisible();
  }
  await page.waitForSelector('#upcoming-events');
});

test('has title', async ({ page }) => {
  await expect(page).toHaveTitle(/Eventua11y/);
});

test('header is visible', async ({ page }) => {
  await expect(page.locator('#global-header')).toBeVisible();
});

test('Today heading is visible', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
});

test('footer is visible', async ({ page }) => {
  await expect(page.locator('#global-footer')).toBeVisible();
});

test('has no accessibility violations', async ({ page }) => {
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});

test('has at least one upcoming event', async ({ page }) => {
  const upcomingEvents = page.locator('.event');
  const countOfEvents = await upcomingEvents.count();
  await expect(countOfEvents).toBeGreaterThan(0);
});

test('displays event details correctly', async ({ page }) => {
  const eventTitle = page.locator('.event__title');
  await expect(eventTitle).toBeVisible();
  await expect(eventTitle).toHaveText(/Event Title/);
});

test('handles event with no website gracefully', async ({ page }) => {
  const eventWithoutWebsite = page.locator('.event--no-website');
  await expect(eventWithoutWebsite).toBeVisible();
  await expect(eventWithoutWebsite.locator('a')).toHaveCount(0);
});

test('displays call for speakers badge if open', async ({ page }) => {
  const cfsBadge = page.locator('.event__badges sl-badge[variant="success"]');
  await expect(cfsBadge).toBeVisible();
  await expect(cfsBadge).toHaveText(/Call for speakers/);
});

test('handles event with children correctly', async ({ page }) => {
  const eventWithChildren = page.locator('.event--with-children');
  await expect(eventWithChildren).toBeVisible();
  const childEvents = eventWithChildren.locator('.event__children .child-event');
  await expect(childEvents).toHaveCountGreaterThan(0);
});

test('displays event duration correctly', async ({ page }) => {
  const eventDuration = page.locator('.event__duration');
  await expect(eventDuration).toBeVisible();
  await expect(eventDuration).toHaveText(/hours|minutes/);
});

test('handles international events correctly', async ({ page }) => {
  const internationalEvent = page.locator('.event--international');
  await expect(internationalEvent).toBeVisible();
  const timezoneAbbr = internationalEvent.locator('abbr');
  await expect(timezoneAbbr).toHaveText(/UTC|GMT/);
});

test('displays event description correctly', async ({ page }) => {
  const eventDescription = page.locator('.event__description');
  await expect(eventDescription).toBeVisible();
  await expect(eventDescription).toHaveText(/Event description/);
});

test('handles events with no description gracefully', async ({ page }) => {
  const eventWithoutDescription = page.locator('.event--no-description');
  await expect(eventWithoutDescription).toBeVisible();
  await expect(eventWithoutDescription.locator('.event__description')).toHaveCount(0);
});

test('displays event location correctly', async ({ page }) => {
  const eventLocation = page.locator('.event__location');
  await expect(eventLocation).toBeVisible();
  await expect(eventLocation).toHaveText(/Location/);
});

test('handles events with no location gracefully', async ({ page }) => {
  const eventWithoutLocation = page.locator('.event--no-location');
  await expect(eventWithoutLocation).toBeVisible();
  await expect(eventWithoutLocation.locator('.event__location')).toHaveCount(0);
});

test('displays event attendance mode correctly', async ({ page }) => {
  const eventAttendanceMode = page.locator('.event__attendance-mode');
  await expect(eventAttendanceMode).toBeVisible();
  await expect(eventAttendanceMode).toHaveText(/Online|Offline|Mixed/);
});

test('handles events with no attendance mode gracefully', async ({ page }) => {
  const eventWithoutAttendanceMode = page.locator('.event--no-attendance-mode');
  await expect(eventWithoutAttendanceMode).toBeVisible();
  await expect(eventWithoutAttendanceMode.locator('.event__attendance-mode')).toHaveCount(0);
});
