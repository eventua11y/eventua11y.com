/**
 * Progress and countdown labels are recomputed on a timer for every
 * event currently on screen, so they run repeatedly while the page is open.
 */

import { test } from 'vitest';
import dayjs from '../src/lib/dayjs';
import {
  getCountdownLabel,
  getProgress,
  getTimeRemaining,
  getTimeSinceEnded,
  isHappeningNow,
  type ProgressOptions,
} from '../src/utils/progressUtils';
import { makeEvents, NOW_ISO } from './fixtures';

const now = dayjs.utc(NOW_ISO);

const options: ProgressOptions[] = makeEvents(250).map((event) => ({
  dateStart: event.dateStart,
  dateEnd: event.dateEnd,
  timezone: event.timezone,
  day: event.day,
  type: event.type,
  showCountdown: true,
  showEnded: true,
}));

// A timed event that is in progress at the fixed "now", so the
// progress and time-remaining paths are fully exercised.
const inProgress: ProgressOptions = {
  dateStart: '2026-03-08T09:00:00Z',
  dateEnd: '2026-03-08T17:00:00Z',
  timezone: 'Europe/London',
  showCountdown: true,
  showEnded: true,
};

const multiDay: ProgressOptions = {
  dateStart: '2026-03-06T00:00:00Z',
  dateEnd: '2026-03-12T23:59:00Z',
  timezone: 'America/New_York',
  day: true,
  showCountdown: true,
  showEnded: true,
};

test('progressUtils - single event', async ({ bench }) => {
  await bench('isHappeningNow', () => {
    isHappeningNow(now, inProgress);
  }).run();

  await bench('getProgress (timed event in progress)', () => {
    getProgress(now, inProgress);
  }).run();

  await bench('getTimeRemaining (timed event in progress)', () => {
    getTimeRemaining(now, inProgress);
  }).run();

  await bench('getTimeRemaining (multi-day all-day event)', () => {
    getTimeRemaining(now, multiDay);
  }).run();

  await bench('getCountdownLabel (upcoming event)', () => {
    getCountdownLabel(now, {
      dateStart: '2026-09-01T09:00:00Z',
      dateEnd: '2026-09-02T17:00:00Z',
      timezone: 'Europe/London',
      showCountdown: true,
    });
  }).run();
});

test('progressUtils - full event list', async ({ bench }) => {
  await bench('progress + labels over 250 events', () => {
    for (const option of options) {
      getProgress(now, option);
      getTimeRemaining(now, option);
      getCountdownLabel(now, option);
      getTimeSinceEnded(now, option);
    }
  }).run();
});
