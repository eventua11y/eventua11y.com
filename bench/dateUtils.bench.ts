/**
 * Date formatting is the hottest pure code on the site: every event card
 * formats a date range, and the whole list is re-rendered whenever the
 * timezone or filters change.
 */

import { bench, describe } from 'vitest';
import dayjs from '../src/lib/dayjs';
import {
  formatDateRange,
  formatEventDate,
  getEndDateFormat,
  getStartDateFormat,
  getYearMonth,
  isSameDay,
  isToday,
  isTomorrow,
} from '../src/utils/dateUtils';
import { makeEvents, NOW_ISO } from './fixtures';

const events = makeEvents(250);
const now = dayjs.utc(NOW_ISO);

describe('dateUtils - single date', () => {
  const event = events[0];

  bench('getStartDateFormat', () => {
    getStartDateFormat({ type: event.type, day: event.day, locale: 'en' });
  });

  bench('getEndDateFormat', () => {
    getEndDateFormat({
      day: event.day,
      dateStart: event.dateStart,
      dateEnd: event.dateEnd,
      timezone: event.timezone,
      locale: 'en',
    });
  });

  bench('formatEventDate (event timezone)', () => {
    formatEventDate(event.dateStart, 'LLLL', {
      timezone: 'America/New_York',
      locale: 'en',
    });
  });

  bench('isSameDay', () => {
    isSameDay(event.dateStart, event.dateEnd, { timezone: event.timezone });
  });

  bench('isToday / isTomorrow', () => {
    isToday(event.dateStart, { timezone: event.timezone }, now);
    isTomorrow(event.dateStart, { timezone: event.timezone }, now);
  });
});

describe('dateUtils - full event list', () => {
  bench('formatDateRange over 250 events (en)', () => {
    for (const event of events) {
      formatDateRange({
        dateStart: event.dateStart,
        dateEnd: event.dateEnd,
        timezone: event.timezone,
        day: event.day,
        type: event.type,
        locale: 'en',
        now,
      });
    }
  });

  bench('formatDateRange over 250 events (fr, user timezone)', () => {
    for (const event of events) {
      formatDateRange({
        dateStart: event.dateStart,
        dateEnd: event.dateEnd,
        timezone: event.timezone,
        useLocalTimezone: true,
        userTimezone: 'Europe/Paris',
        day: event.day,
        type: event.type,
        locale: 'fr',
        isPast: true,
        now,
      });
    }
  });

  bench('getYearMonth over 250 events', () => {
    for (const event of events) {
      getYearMonth(event.dateStart, {
        timezone: event.timezone,
        useLocalTimezone: true,
        userTimezone: 'Europe/London',
      });
    }
  });
});
