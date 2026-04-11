import { describe, it, expect } from 'vitest';
import dayjs from '../lib/dayjs';

/** Non-breaking space used between time digits and AM/PM */
const nbsp = '\u00A0';

import {
  getStartDateFormat,
  getEndDateFormat,
  isSameDay,
  isToday,
  isTomorrow,
  formatEventDate,
  formatDateRange,
  getYearMonth,
  isFullMonth,
  resolveTimezone,
} from './dateUtils';

describe('getStartDateFormat', () => {
  it('returns dddd, LL for awareness days (theme)', () => {
    expect(getStartDateFormat({ type: 'theme' })).toBe('dddd, LL');
  });

  it('returns dddd, LL for deadlines', () => {
    expect(getStartDateFormat({ isDeadline: true })).toBe('dddd, LL');
  });

  it('returns dddd, LL for all-day events', () => {
    expect(getStartDateFormat({ day: true })).toBe('dddd, LL');
  });

  it('returns LLLL for regular timed events', () => {
    expect(getStartDateFormat({})).toBe('LLLL');
    expect(getStartDateFormat({ type: 'event' })).toBe('LLLL');
  });

  it('theme takes precedence over day', () => {
    expect(getStartDateFormat({ type: 'theme', day: true })).toBe('dddd, LL');
  });

  it('deadline takes precedence over day', () => {
    expect(getStartDateFormat({ isDeadline: true, day: true })).toBe(
      'dddd, LL'
    );
  });

  it('uses no comma after day name for French locale', () => {
    expect(getStartDateFormat({ day: true, locale: 'fr' })).toBe('dddd LL');
    expect(getStartDateFormat({ type: 'theme', locale: 'fr' })).toBe('dddd LL');
  });

  it('uses comma after day name for German and Spanish', () => {
    expect(getStartDateFormat({ day: true, locale: 'de' })).toBe('dddd, LL');
    expect(getStartDateFormat({ day: true, locale: 'es' })).toBe('dddd, LL');
  });
});

describe('getEndDateFormat', () => {
  it('returns dddd, LL for all-day events', () => {
    expect(
      getEndDateFormat({
        day: true,
        dateStart: '2026-01-15T09:00:00Z',
        dateEnd: '2026-01-17T17:00:00Z',
      })
    ).toBe('dddd, LL');
  });

  it('returns LT for same-day events', () => {
    expect(
      getEndDateFormat({
        dateStart: '2026-01-15T09:00:00Z',
        dateEnd: '2026-01-15T17:00:00Z',
        timezone: 'UTC',
      })
    ).toBe('LT');
  });

  it('returns LLLL for multi-day timed events', () => {
    expect(
      getEndDateFormat({
        dateStart: '2026-01-15T09:00:00Z',
        dateEnd: '2026-01-17T17:00:00Z',
        timezone: 'UTC',
      })
    ).toBe('LLLL');
  });

  it('day=true takes precedence over same-day check', () => {
    expect(
      getEndDateFormat({
        day: true,
        dateStart: '2026-01-15T09:00:00Z',
        dateEnd: '2026-01-15T17:00:00Z',
        timezone: 'UTC',
      })
    ).toBe('dddd, LL');
  });

  it('accounts for timezone when determining same day', () => {
    // 2026-01-15T23:00:00Z is Jan 15 in UTC but Jan 16 in UTC+2
    expect(
      getEndDateFormat({
        dateStart: '2026-01-15T23:00:00Z',
        dateEnd: '2026-01-16T01:00:00Z',
        timezone: 'UTC',
      })
    ).toBe('LLLL'); // Different days in UTC

    expect(
      getEndDateFormat({
        dateStart: '2026-01-15T23:00:00Z',
        dateEnd: '2026-01-16T01:00:00Z',
        timezone: 'Europe/Helsinki', // UTC+2
      })
    ).toBe('LT'); // Same day (Jan 16) in Helsinki
  });

  it('uses no comma after day name for French locale', () => {
    expect(
      getEndDateFormat({
        day: true,
        dateStart: '2026-01-15T09:00:00Z',
        dateEnd: '2026-01-17T17:00:00Z',
        locale: 'fr',
      })
    ).toBe('dddd LL');
  });
});

describe('isSameDay', () => {
  it('returns true for dates on the same UTC day', () => {
    expect(
      isSameDay('2026-01-15T09:00:00Z', '2026-01-15T17:00:00Z', {
        timezone: 'UTC',
      })
    ).toBe(true);
  });

  it('returns false for dates on different UTC days', () => {
    expect(
      isSameDay('2026-01-15T09:00:00Z', '2026-01-16T09:00:00Z', {
        timezone: 'UTC',
      })
    ).toBe(false);
  });

  it('returns false when date2 is undefined', () => {
    expect(
      isSameDay('2026-01-15T09:00:00Z', undefined, { timezone: 'UTC' })
    ).toBe(false);
  });

  it('considers timezone when comparing days', () => {
    // 23:00 UTC on Jan 15 is 00:00 Jan 16 in UTC+1
    const date1 = '2026-01-15T23:00:00Z';
    const date2 = '2026-01-16T00:30:00Z';

    expect(isSameDay(date1, date2, { timezone: 'UTC' })).toBe(false);
    expect(isSameDay(date1, date2, { timezone: 'Europe/Paris' })).toBe(true);
  });

  it('uses user timezone when useLocalTimezone is true', () => {
    const date1 = '2026-01-15T23:00:00Z';
    const date2 = '2026-01-16T00:30:00Z';

    expect(
      isSameDay(date1, date2, {
        timezone: 'UTC',
        useLocalTimezone: true,
        userTimezone: 'Europe/Paris',
      })
    ).toBe(true);
  });
});

describe('isToday', () => {
  it('returns true when the date is today in UTC', () => {
    const now = dayjs.utc('2026-03-09T12:00:00Z');
    expect(
      isToday('2026-03-09T14:00:00Z', { timezone: 'UTC' }, now.tz('UTC'))
    ).toBe(true);
  });

  it('returns false when the date is not today in UTC', () => {
    const now = dayjs.utc('2026-03-09T12:00:00Z');
    expect(
      isToday('2026-03-10T14:00:00Z', { timezone: 'UTC' }, now.tz('UTC'))
    ).toBe(false);
  });

  it('respects timezone when determining today', () => {
    // 2026-03-09T23:00:00Z is Mar 10 in UTC+2 (Helsinki)
    const now = dayjs.utc('2026-03-10T01:00:00Z').tz('Europe/Helsinki');
    expect(
      isToday('2026-03-09T23:00:00Z', { timezone: 'Europe/Helsinki' }, now)
    ).toBe(true); // Both are Mar 10 in Helsinki
  });

  it('uses user timezone when useLocalTimezone is true', () => {
    // 2026-03-09T23:00:00Z is still Mar 9 in UTC, but Mar 10 in Helsinki
    const now = dayjs.utc('2026-03-10T01:00:00Z').tz('Europe/Helsinki');
    expect(
      isToday(
        '2026-03-09T23:00:00Z',
        {
          timezone: 'UTC',
          useLocalTimezone: true,
          userTimezone: 'Europe/Helsinki',
        },
        now
      )
    ).toBe(true);
  });
});

describe('isTomorrow', () => {
  it('returns true when the date is tomorrow in UTC', () => {
    const now = dayjs.utc('2026-03-09T12:00:00Z');
    expect(
      isTomorrow('2026-03-10T14:00:00Z', { timezone: 'UTC' }, now.tz('UTC'))
    ).toBe(true);
  });

  it('returns false when the date is today in UTC', () => {
    const now = dayjs.utc('2026-03-09T12:00:00Z');
    expect(
      isTomorrow('2026-03-09T14:00:00Z', { timezone: 'UTC' }, now.tz('UTC'))
    ).toBe(false);
  });

  it('returns false when the date is two days away', () => {
    const now = dayjs.utc('2026-03-09T12:00:00Z');
    expect(
      isTomorrow('2026-03-11T14:00:00Z', { timezone: 'UTC' }, now.tz('UTC'))
    ).toBe(false);
  });

  it('respects timezone when determining tomorrow', () => {
    // 2026-03-10T23:00:00Z is Mar 11 in Helsinki (UTC+2)
    // "now" is Mar 10 in Helsinki, so Mar 11 Helsinki = tomorrow
    const now = dayjs.utc('2026-03-10T12:00:00Z').tz('Europe/Helsinki');
    expect(
      isTomorrow('2026-03-10T23:00:00Z', { timezone: 'Europe/Helsinki' }, now)
    ).toBe(true);
  });

  it('uses user timezone when useLocalTimezone is true', () => {
    const now = dayjs.utc('2026-03-09T12:00:00Z').tz('America/Los_Angeles');
    expect(
      isTomorrow(
        '2026-03-10T14:00:00Z',
        {
          timezone: 'UTC',
          useLocalTimezone: true,
          userTimezone: 'America/Los_Angeles',
        },
        now
      )
    ).toBe(true);
  });
});

describe('formatEventDate', () => {
  it('formats a UTC date with LL format', () => {
    const result = formatEventDate('2026-03-15T09:00:00Z', 'LL', {
      timezone: 'UTC',
      locale: 'en',
    });
    expect(result).toBe('March 15, 2026');
  });

  it('formats international events in UTC without conversion', () => {
    // No timezone = international event
    const result = formatEventDate('2026-03-15T09:00:00Z', 'LLL', {
      locale: 'en',
    });
    // Should show 9:00 AM (the UTC time, no conversion)
    expect(result).toContain('March 15, 2026');
    expect(result).toContain(`9:00${nbsp}AM`);
  });

  it('converts local events to event timezone', () => {
    // UTC 14:00 = EST 09:00
    const result = formatEventDate('2026-03-15T14:00:00Z', 'LLL', {
      timezone: 'America/New_York',
      locale: 'en',
    });
    expect(result).toContain('March 15, 2026');
    expect(result).toContain(`10:00${nbsp}AM`); // EDT in March
  });

  it('converts to user timezone when useLocalTimezone is true', () => {
    // UTC 14:00, event in New York, user in London
    const result = formatEventDate('2026-03-15T14:00:00Z', 'LLL', {
      timezone: 'America/New_York',
      useLocalTimezone: true,
      userTimezone: 'Europe/London',
      locale: 'en',
    });
    expect(result).toContain('March 15, 2026');
    expect(result).toContain(`2:00${nbsp}PM`); // UTC+0 (GMT in March)
  });

  it('falls back to UTC when timezone is missing', () => {
    const result = formatEventDate('2026-03-15T14:00:00Z', 'LT', {
      timezone: 'UTC',
      locale: 'en',
    });
    expect(result).toBe(`2:00${nbsp}PM`);
  });
});

describe('getYearMonth', () => {
  it('groups a book by UTC month', () => {
    expect(getYearMonth('2026-03-15T00:00:00Z', { isBook: true })).toBe(
      '2026-3'
    );
  });

  it('groups an international event by UTC month', () => {
    // No timezone = international
    expect(getYearMonth('2026-03-15T09:00:00Z', {})).toBe('2026-3');
  });

  it('groups a local event by its event timezone month', () => {
    // 2026-03-01T01:00:00Z is still Feb 28 in US Pacific (UTC-8)
    expect(
      getYearMonth('2026-03-01T01:00:00Z', {
        timezone: 'America/Los_Angeles',
      })
    ).toBe('2026-2');
  });

  it('uses user timezone when useLocalTimezone is true', () => {
    // 2026-03-01T01:00:00Z is March 1 in UTC, but Feb 28 in Pacific
    expect(
      getYearMonth('2026-03-01T01:00:00Z', {
        timezone: 'UTC',
        useLocalTimezone: true,
        userTimezone: 'America/Los_Angeles',
      })
    ).toBe('2026-2');
  });

  it('uses event timezone when useLocalTimezone is false', () => {
    expect(
      getYearMonth('2026-03-01T01:00:00Z', {
        timezone: 'America/Los_Angeles',
        useLocalTimezone: false,
        userTimezone: 'UTC',
      })
    ).toBe('2026-2'); // Pacific time: still Feb
  });

  it('falls back to UTC for international events even with useLocalTimezone', () => {
    // International events always use UTC regardless of user preference
    expect(
      getYearMonth('2026-03-01T01:00:00Z', {
        useLocalTimezone: true,
        userTimezone: 'America/Los_Angeles',
      })
    ).toBe('2026-3'); // UTC: March 1
  });

  it('handles year boundaries correctly', () => {
    // 2026-01-01T00:30:00Z is still Dec 31 in US Eastern (UTC-5)
    expect(
      getYearMonth('2026-01-01T00:30:00Z', {
        timezone: 'America/New_York',
      })
    ).toBe('2025-12');
  });
});

describe('formatDateRange', () => {
  describe('single date (no end date)', () => {
    it('returns a single-element tuple for timed events', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T14:00:00Z',
        timezone: 'UTC',
        locale: 'en',
      });
      expect(result).toEqual([`Sunday, March 8, 2026 2:00${nbsp}PM`]);
    });

    it('returns a single-element tuple for all-day events', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T00:00:00Z',
        timezone: 'UTC',
        locale: 'en',
        day: true,
      });
      expect(result).toEqual(['Sunday, March 8, 2026']);
    });

    it('returns a single-element tuple for themes', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T00:00:00Z',
        timezone: 'UTC',
        locale: 'en',
        type: 'theme',
      });
      expect(result).toEqual(['Sunday, March 8, 2026']);
    });
  });

  describe('same-day timed events', () => {
    it('deduplicates AM/PM when both times are in the same period', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T14:00:00Z',
        dateEnd: '2026-03-08T17:00:00Z',
        timezone: 'UTC',
        locale: 'en',
      });
      // Both PM — AM/PM shown only on end time
      expect(result).toEqual(['Sunday, March 8, 2026 2:00', `5:00${nbsp}PM`]);
    });

    it('shows AM/PM on both times when they differ', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T10:00:00Z',
        dateEnd: '2026-03-08T17:00:00Z',
        timezone: 'UTC',
        locale: 'en',
      });
      // AM → PM — both shown
      expect(result).toEqual([
        `Sunday, March 8, 2026 10:00${nbsp}AM`,
        `5:00${nbsp}PM`,
      ]);
    });

    it('deduplicates AM/PM for morning events', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T08:00:00Z',
        dateEnd: '2026-03-08T11:00:00Z',
        timezone: 'UTC',
        locale: 'en',
      });
      // Both AM — AM/PM shown only on end time
      expect(result).toEqual(['Sunday, March 8, 2026 8:00', `11:00${nbsp}AM`]);
    });

    it('skips AM/PM dedup for 24-hour locales', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T14:00:00Z',
        dateEnd: '2026-03-08T17:00:00Z',
        timezone: 'UTC',
        locale: 'de',
      });
      // 24-hour locale — no AM/PM to deduplicate
      expect(result).toEqual(['Sonntag, 8. März 2026 14:00', '17:00']);
    });

    it('returns single-element tuple for same-day date-only events', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T00:00:00Z',
        dateEnd: '2026-03-08T23:59:00Z',
        timezone: 'UTC',
        locale: 'en',
        day: true,
      });
      expect(result).toEqual(['Sunday, March 8, 2026']);
    });
  });

  describe('same-month date ranges (the key optimisation)', () => {
    it('deduplicates month and year for date-only ranges (en)', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T00:00:00Z',
        dateEnd: '2026-03-13T00:00:00Z',
        timezone: 'UTC',
        locale: 'en',
        day: true,
      });
      expect(result).toEqual(['Sunday, March 8', 'Friday, March 13, 2026']);
    });
  });

  describe('different-month, same-year ranges', () => {
    it('deduplicates the year for date-only ranges (en)', () => {
      const result = formatDateRange({
        dateStart: '2026-03-28T00:00:00Z',
        dateEnd: '2026-04-02T00:00:00Z',
        timezone: 'UTC',
        locale: 'en',
        day: true,
      });
      expect(result).toEqual(['Saturday, March 28', 'Thursday, April 2, 2026']);
    });
  });

  describe('different-year ranges', () => {
    it('shows both years with day names for date-only ranges', () => {
      const result = formatDateRange({
        dateStart: '2026-12-28T00:00:00Z',
        dateEnd: '2027-01-02T00:00:00Z',
        timezone: 'UTC',
        locale: 'en',
        day: true,
      });
      expect(result).toEqual([
        'Monday, December 28, 2026',
        'Saturday, January 2, 2027',
      ]);
    });
  });

  describe('multi-day timed events', () => {
    it('deduplicates year for same-year timed ranges', () => {
      const result = formatDateRange({
        dateStart: '2026-02-24T14:00:00Z',
        dateEnd: '2026-02-25T21:00:00Z',
        timezone: 'UTC',
        locale: 'en',
      });
      // Start omits year, end keeps it (both have day names)
      expect(result).toEqual([
        `Tuesday, February 24 2:00${nbsp}PM`,
        `Wednesday, February 25, 2026 9:00${nbsp}PM`,
      ]);
    });

    it('deduplicates year across different months', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T14:00:00Z',
        dateEnd: '2026-04-10T17:00:00Z',
        timezone: 'UTC',
        locale: 'en',
      });
      expect(result).toEqual([
        `Sunday, March 8 2:00${nbsp}PM`,
        `Friday, April 10, 2026 5:00${nbsp}PM`,
      ]);
    });

    it('shows full date+time with day names for different years', () => {
      const result = formatDateRange({
        dateStart: '2026-12-30T14:00:00Z',
        dateEnd: '2027-01-02T17:00:00Z',
        timezone: 'UTC',
        locale: 'en',
      });
      expect(result).toEqual([
        `Wednesday, December 30, 2026 2:00${nbsp}PM`,
        `Saturday, January 2, 2027 5:00${nbsp}PM`,
      ]);
    });
  });

  describe('timezone handling', () => {
    it('converts to event timezone', () => {
      // UTC 23:00 Mar 8 = EDT 19:00 Mar 8; UTC 03:00 Mar 10 = EDT 23:00 Mar 9
      // Inject a "now" on a different day so the "Today" label doesn't trigger
      const notToday = dayjs.utc('2026-01-01T12:00:00Z').tz('America/New_York');
      const result = formatDateRange({
        dateStart: '2026-03-08T23:00:00Z',
        dateEnd: '2026-03-10T03:00:00Z',
        timezone: 'America/New_York',
        locale: 'en',
        day: true,
        now: notToday,
      });
      // In EDT (UTC-4 in March), these are Mar 8 (Sun) and Mar 9 (Mon)
      expect(result).toEqual(['Sunday, March 8', 'Monday, March 9, 2026']);
    });

    it('uses user timezone when useLocalTimezone is true', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T14:00:00Z',
        dateEnd: '2026-03-08T17:00:00Z',
        timezone: 'America/New_York',
        useLocalTimezone: true,
        userTimezone: 'Europe/London',
        locale: 'en',
      });
      // In London (GMT), these are 14:00–17:00 on Mar 8 (both PM)
      expect(result).toEqual(['Sunday, March 8, 2026 2:00', `5:00${nbsp}PM`]);
    });

    it('uses UTC for international events (no timezone)', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T14:00:00Z',
        dateEnd: '2026-03-08T17:00:00Z',
        locale: 'en',
      });
      // No timezone = international, should use UTC values (both PM)
      expect(result).toEqual(['Sunday, March 8, 2026 2:00', `5:00${nbsp}PM`]);
    });
  });

  describe('locale support', () => {
    it('formats same-month range in German', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T00:00:00Z',
        dateEnd: '2026-03-13T00:00:00Z',
        timezone: 'UTC',
        locale: 'de',
        day: true,
      });
      // "Sonntag, 8." / "Freitag, 13. März 2026"
      expect(result).toEqual(['Sonntag, 8.', 'Freitag, 13. März 2026']);
    });

    it('formats different-month range in German', () => {
      const result = formatDateRange({
        dateStart: '2026-03-28T00:00:00Z',
        dateEnd: '2026-04-02T00:00:00Z',
        timezone: 'UTC',
        locale: 'de',
        day: true,
      });
      // "Samstag, 28. März" / "Donnerstag, 2. April 2026"
      expect(result).toEqual([
        'Samstag, 28. März',
        'Donnerstag, 2. April 2026',
      ]);
    });

    it('formats same-month range in French', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T00:00:00Z',
        dateEnd: '2026-03-13T00:00:00Z',
        timezone: 'UTC',
        locale: 'fr',
        day: true,
      });
      // "dimanche 8" / "vendredi 13 mars 2026"
      expect(result).toEqual(['dimanche 8', 'vendredi 13 mars 2026']);
    });

    it('formats different-month range in French', () => {
      const result = formatDateRange({
        dateStart: '2026-03-28T00:00:00Z',
        dateEnd: '2026-04-02T00:00:00Z',
        timezone: 'UTC',
        locale: 'fr',
        day: true,
      });
      // "samedi 28 mars" / "jeudi 2 avril 2026"
      expect(result).toEqual(['samedi 28 mars', 'jeudi 2 avril 2026']);
    });

    it('formats same-month range in Spanish', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T00:00:00Z',
        dateEnd: '2026-03-13T00:00:00Z',
        timezone: 'UTC',
        locale: 'es',
        day: true,
      });
      // "domingo, 8" / "viernes, 13 de marzo de 2026"
      expect(result).toEqual(['domingo, 8', 'viernes, 13 de marzo de 2026']);
    });

    it('formats different-month range in Spanish', () => {
      const result = formatDateRange({
        dateStart: '2026-03-28T00:00:00Z',
        dateEnd: '2026-04-02T00:00:00Z',
        timezone: 'UTC',
        locale: 'es',
        day: true,
      });
      // "sábado, 28 de marzo" / "jueves, 2 de abril de 2026"
      expect(result).toEqual([
        'sábado, 28 de marzo',
        'jueves, 2 de abril de 2026',
      ]);
    });
  });

  describe('full-month events', () => {
    it('displays "October 2026" for a full October (en)', () => {
      const result = formatDateRange({
        dateStart: '2026-10-01T00:00:00Z',
        dateEnd: '2026-10-31T00:00:00Z',
        timezone: 'UTC',
        locale: 'en',
        type: 'theme',
      });
      expect(result).toEqual(['October 2026']);
    });

    it('displays "February 2026" for a full February (en)', () => {
      // February 2026 has 28 days
      const result = formatDateRange({
        dateStart: '2026-02-01T00:00:00Z',
        dateEnd: '2026-02-28T00:00:00Z',
        timezone: 'UTC',
        locale: 'en',
        type: 'theme',
      });
      expect(result).toEqual(['February 2026']);
    });

    it('displays "February 2028" for a full leap-year February (en)', () => {
      // February 2028 has 29 days (leap year)
      const result = formatDateRange({
        dateStart: '2028-02-01T00:00:00Z',
        dateEnd: '2028-02-29T00:00:00Z',
        timezone: 'UTC',
        locale: 'en',
        type: 'theme',
      });
      expect(result).toEqual(['February 2028']);
    });

    it('works for all-day events (day: true)', () => {
      const result = formatDateRange({
        dateStart: '2026-06-01T00:00:00Z',
        dateEnd: '2026-06-30T00:00:00Z',
        timezone: 'UTC',
        locale: 'en',
        day: true,
      });
      expect(result).toEqual(['June 2026']);
    });

    it('does not apply to partial-month ranges', () => {
      const result = formatDateRange({
        dateStart: '2026-10-01T00:00:00Z',
        dateEnd: '2026-10-30T00:00:00Z',
        timezone: 'UTC',
        locale: 'en',
        type: 'theme',
      });
      // Oct 1–30 is not the full month (31 days), should show normal range
      expect(result).toEqual([
        'Thursday, October 1',
        'Friday, October 30, 2026',
      ]);
    });

    it('does not apply to ranges starting after the 1st', () => {
      const result = formatDateRange({
        dateStart: '2026-10-02T00:00:00Z',
        dateEnd: '2026-10-31T00:00:00Z',
        timezone: 'UTC',
        locale: 'en',
        type: 'theme',
      });
      expect(result).toEqual([
        'Friday, October 2',
        'Saturday, October 31, 2026',
      ]);
    });

    it('does not apply to cross-month ranges', () => {
      const result = formatDateRange({
        dateStart: '2026-10-01T00:00:00Z',
        dateEnd: '2026-11-30T00:00:00Z',
        timezone: 'UTC',
        locale: 'en',
        type: 'theme',
      });
      // Oct 1 – Nov 30 spans two months
      expect(result).toEqual([
        'Thursday, October 1',
        'Monday, November 30, 2026',
      ]);
    });

    it('does not apply to timed events (not date-only)', () => {
      // Full month dates but with times — this is a timed event, not date-only
      const result = formatDateRange({
        dateStart: '2026-10-01T09:00:00Z',
        dateEnd: '2026-10-31T17:00:00Z',
        timezone: 'UTC',
        locale: 'en',
      });
      // Should show as a timed range, not "October 2026"
      expect(result).toEqual([
        `Thursday, October 1 9:00${nbsp}AM`,
        `Saturday, October 31, 2026 5:00${nbsp}PM`,
      ]);
    });

    it('formats full month in German', () => {
      const result = formatDateRange({
        dateStart: '2026-10-01T00:00:00Z',
        dateEnd: '2026-10-31T00:00:00Z',
        timezone: 'UTC',
        locale: 'de',
        type: 'theme',
      });
      expect(result).toEqual(['Oktober 2026']);
    });

    it('formats full month in French', () => {
      const result = formatDateRange({
        dateStart: '2026-10-01T00:00:00Z',
        dateEnd: '2026-10-31T00:00:00Z',
        timezone: 'UTC',
        locale: 'fr',
        type: 'theme',
      });
      expect(result).toEqual(['octobre 2026']);
    });

    it('formats full month in Spanish', () => {
      const result = formatDateRange({
        dateStart: '2026-10-01T00:00:00Z',
        dateEnd: '2026-10-31T00:00:00Z',
        timezone: 'UTC',
        locale: 'es',
        type: 'theme',
      });
      expect(result).toEqual(['octubre de 2026']);
    });

    it('works for international events (no timezone)', () => {
      const result = formatDateRange({
        dateStart: '2026-10-01T00:00:00Z',
        dateEnd: '2026-10-31T00:00:00Z',
        locale: 'en',
        type: 'theme',
      });
      expect(result).toEqual(['October 2026']);
    });
  });

  describe('event type handling', () => {
    it('omits time for themes even with time in the data', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T14:00:00Z',
        dateEnd: '2026-03-13T17:00:00Z',
        timezone: 'UTC',
        locale: 'en',
        type: 'theme',
      });
      // Should be date-only with day names
      expect(result).toEqual(['Sunday, March 8', 'Friday, March 13, 2026']);
    });

    it('omits time for deadlines', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T14:00:00Z',
        dateEnd: '2026-03-13T17:00:00Z',
        timezone: 'UTC',
        locale: 'en',
        isDeadline: true,
      });
      expect(result).toEqual(['Sunday, March 8', 'Friday, March 13, 2026']);
    });

    it('omits time for all-day events', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T00:00:00Z',
        dateEnd: '2026-03-13T00:00:00Z',
        timezone: 'UTC',
        locale: 'en',
        day: true,
      });
      expect(result).toEqual(['Sunday, March 8', 'Friday, March 13, 2026']);
    });
  });

  describe('"Today" and "Tomorrow" labels', () => {
    // Fixed reference point — all test dates are derived from this
    const now = dayjs.utc('2026-03-09T12:00:00Z').tz('UTC');
    const todayAt = (time: string) => now.format('YYYY-MM-DD') + `T${time}Z`;
    const tomorrowAt = (time: string) =>
      now.add(1, 'day').format('YYYY-MM-DD') + `T${time}Z`;
    const daysFromNow = (n: number, time: string) =>
      now.add(n, 'day').format('YYYY-MM-DD') + `T${time}Z`;
    const daysAgo = (n: number, time: string) =>
      now.subtract(n, 'day').format('YYYY-MM-DD') + `T${time}Z`;

    describe('single date (no end date)', () => {
      it('shows "Today" for a timed event starting today', () => {
        const result = formatDateRange({
          dateStart: todayAt('14:00:00'),
          timezone: 'UTC',
          locale: 'en',
          now,
        });
        expect(result).toEqual([`Today 2:00${nbsp}PM`]);
      });

      it('shows "Today" for an all-day event today', () => {
        const result = formatDateRange({
          dateStart: todayAt('00:00:00'),
          timezone: 'UTC',
          locale: 'en',
          day: true,
          now,
        });
        expect(result).toEqual(['Today']);
      });

      it('shows "Tomorrow" for a timed event starting tomorrow', () => {
        const result = formatDateRange({
          dateStart: tomorrowAt('14:00:00'),
          timezone: 'UTC',
          locale: 'en',
          now,
        });
        expect(result).toEqual([`Tomorrow 2:00${nbsp}PM`]);
      });

      it('shows "Tomorrow" for an all-day event tomorrow', () => {
        const result = formatDateRange({
          dateStart: tomorrowAt('00:00:00'),
          timezone: 'UTC',
          locale: 'en',
          day: true,
          now,
        });
        expect(result).toEqual(['Tomorrow']);
      });

      it('does not show "Today" or "Tomorrow" when date is further away', () => {
        const result = formatDateRange({
          dateStart: daysFromNow(2, '14:00:00'),
          timezone: 'UTC',
          locale: 'en',
          now,
        });
        expect(result[0]).not.toMatch(/^Today/);
        expect(result[0]).not.toMatch(/^Tomorrow/);
      });
    });

    describe('same-day timed events', () => {
      it('replaces day name with "Today" for a same-day timed range', () => {
        const result = formatDateRange({
          dateStart: todayAt('14:00:00'),
          dateEnd: todayAt('17:00:00'),
          timezone: 'UTC',
          locale: 'en',
          now,
        });
        expect(result).toEqual(['Today 2:00', `5:00${nbsp}PM`]);
      });

      it('shows "Today" for same-day all-day event', () => {
        const result = formatDateRange({
          dateStart: todayAt('00:00:00'),
          dateEnd: todayAt('23:59:00'),
          timezone: 'UTC',
          locale: 'en',
          day: true,
          now,
        });
        expect(result).toEqual(['Today']);
      });

      it('replaces day name with "Tomorrow" for a same-day timed range', () => {
        const result = formatDateRange({
          dateStart: tomorrowAt('14:00:00'),
          dateEnd: tomorrowAt('17:00:00'),
          timezone: 'UTC',
          locale: 'en',
          now,
        });
        expect(result).toEqual(['Tomorrow 2:00', `5:00${nbsp}PM`]);
      });
    });

    describe('multi-day ranges', () => {
      it('shows "Today" on start of a date-only multi-day range', () => {
        const result = formatDateRange({
          dateStart: todayAt('00:00:00'),
          dateEnd: daysFromNow(4, '00:00:00'),
          timezone: 'UTC',
          locale: 'en',
          day: true,
          now,
        });
        expect(result[0]).toBe('Today');
        expect(result[1]).not.toMatch(/^Today/);
      });

      it('shows "Today" on start of a timed multi-day range', () => {
        const result = formatDateRange({
          dateStart: todayAt('07:00:00'),
          dateEnd: daysFromNow(4, '17:00:00'),
          timezone: 'UTC',
          locale: 'en',
          now,
        });
        expect(result[0]).toBe(`Today 7:00${nbsp}AM`);
        expect(result[1]).not.toMatch(/^Today/);
      });

      it('shows "Today" on end of a date-only multi-day range', () => {
        const result = formatDateRange({
          dateStart: daysAgo(2, '00:00:00'),
          dateEnd: todayAt('00:00:00'),
          timezone: 'UTC',
          locale: 'en',
          day: true,
          now,
        });
        expect(result[0]).not.toMatch(/^Today/);
        expect(result[1]).toBe('Today');
      });

      it('shows "Today" on end of a timed multi-day range', () => {
        const result = formatDateRange({
          dateStart: daysAgo(2, '10:00:00'),
          dateEnd: todayAt('17:00:00'),
          timezone: 'UTC',
          locale: 'en',
          now,
        });
        expect(result[0]).not.toMatch(/^Today/);
        expect(result[1]).toMatch(/^Today/);
      });

      it('shows "Tomorrow" on start of a date-only multi-day range', () => {
        const result = formatDateRange({
          dateStart: tomorrowAt('00:00:00'),
          dateEnd: daysFromNow(5, '00:00:00'),
          timezone: 'UTC',
          locale: 'en',
          day: true,
          now,
        });
        expect(result[0]).toBe('Tomorrow');
        expect(result[1]).not.toMatch(/^Tomorrow/);
      });

      it('shows "Today" on start and "Tomorrow" on end', () => {
        const result = formatDateRange({
          dateStart: todayAt('00:00:00'),
          dateEnd: tomorrowAt('00:00:00'),
          timezone: 'UTC',
          locale: 'en',
          day: true,
          now,
        });
        expect(result).toEqual(['Today', 'Tomorrow']);
      });

      it('shows "Today" and "Tomorrow" in a timed range', () => {
        const result = formatDateRange({
          dateStart: todayAt('10:00:00'),
          dateEnd: tomorrowAt('17:00:00'),
          timezone: 'UTC',
          locale: 'en',
          now,
        });
        expect(result[0]).toMatch(/^Today/);
        expect(result[1]).toMatch(/^Tomorrow/);
      });
    });

    describe('timezone awareness', () => {
      it('uses event timezone to determine "Today"', () => {
        // An event at 23:00 UTC — still "today" in UTC, but in Helsinki
        // (UTC+2) it is the next day. Set "now" to be in Helsinki too
        // so both the event and "now" are on the same Helsinki day.
        const utcTime = todayAt('23:00:00');
        const nowHel = dayjs
          .utc(utcTime)
          .add(30, 'minute')
          .tz('Europe/Helsinki');
        const result = formatDateRange({
          dateStart: utcTime,
          timezone: 'Europe/Helsinki',
          locale: 'en',
          now: nowHel,
        });
        expect(result[0]).toMatch(/^Today/);
      });

      it('uses user timezone when useLocalTimezone is true', () => {
        // Event at 03:00 UTC today is still yesterday in US Pacific (UTC-7)
        const utcTime = todayAt('03:00:00');
        const nowPac = dayjs.utc(todayAt('09:00:00')).tz('America/Los_Angeles');
        const result = formatDateRange({
          dateStart: utcTime,
          timezone: 'UTC',
          useLocalTimezone: true,
          userTimezone: 'America/Los_Angeles',
          locale: 'en',
          now: nowPac,
        });
        // In Pacific the event is yesterday, so no relative label
        expect(result[0]).not.toMatch(/^Today/);
        expect(result[0]).not.toMatch(/^Tomorrow/);
      });

      it('shows "Today" when event is today in user timezone', () => {
        const utcTime = todayAt('20:00:00');
        const nowPac = dayjs.utc(utcTime).tz('America/Los_Angeles');
        const result = formatDateRange({
          dateStart: utcTime,
          timezone: 'Europe/London',
          useLocalTimezone: true,
          userTimezone: 'America/Los_Angeles',
          locale: 'en',
          now: nowPac,
        });
        expect(result[0]).toMatch(/^Today/);
      });

      it('uses event timezone to determine "Tomorrow"', () => {
        // An event at 23:00 UTC tomorrow — in Helsinki (UTC+2) it is
        // the day after tomorrow. Set "now" so that Helsinki date is
        // one day before the Helsinki event date.
        const utcTime = tomorrowAt('23:00:00');
        const nowHel = dayjs.utc(tomorrowAt('12:00:00')).tz('Europe/Helsinki');
        const result = formatDateRange({
          dateStart: utcTime,
          timezone: 'Europe/Helsinki',
          locale: 'en',
          now: nowHel,
        });
        expect(result[0]).toMatch(/^Tomorrow/);
      });
    });

    describe('locale support', () => {
      it('shows "Heute" in German', () => {
        const result = formatDateRange({
          dateStart: todayAt('14:00:00'),
          dateEnd: todayAt('17:00:00'),
          timezone: 'UTC',
          locale: 'de',
          now,
        });
        expect(result[0]).toMatch(/^Heute/);
      });

      it('shows "Aujourd\'hui" in French', () => {
        const result = formatDateRange({
          dateStart: todayAt('14:00:00'),
          dateEnd: todayAt('17:00:00'),
          timezone: 'UTC',
          locale: 'fr',
          now,
        });
        expect(result[0]).toMatch(/^Aujourd'hui/);
      });

      it('shows "Hoy" in Spanish', () => {
        const result = formatDateRange({
          dateStart: todayAt('14:00:00'),
          dateEnd: todayAt('17:00:00'),
          timezone: 'UTC',
          locale: 'es',
          now,
        });
        expect(result[0]).toMatch(/^Hoy/);
      });

      it('shows "Heute" for multi-day date-only start in German', () => {
        const result = formatDateRange({
          dateStart: todayAt('00:00:00'),
          dateEnd: daysFromNow(4, '00:00:00'),
          timezone: 'UTC',
          locale: 'de',
          day: true,
          now,
        });
        expect(result[0]).toBe('Heute');
        expect(result[1]).not.toMatch(/^Heute/);
      });

      it('shows "Morgen" in German', () => {
        const result = formatDateRange({
          dateStart: tomorrowAt('14:00:00'),
          dateEnd: tomorrowAt('17:00:00'),
          timezone: 'UTC',
          locale: 'de',
          now,
        });
        expect(result[0]).toMatch(/^Morgen/);
      });

      it('shows "Demain" in French', () => {
        const result = formatDateRange({
          dateStart: tomorrowAt('14:00:00'),
          dateEnd: tomorrowAt('17:00:00'),
          timezone: 'UTC',
          locale: 'fr',
          now,
        });
        expect(result[0]).toMatch(/^Demain/);
      });

      it('shows "Mañana" in Spanish', () => {
        const result = formatDateRange({
          dateStart: tomorrowAt('14:00:00'),
          dateEnd: tomorrowAt('17:00:00'),
          timezone: 'UTC',
          locale: 'es',
          now,
        });
        expect(result[0]).toMatch(/^Mañana/);
      });
    });
  });
});

describe('isFullMonth', () => {
  it('returns true for Oct 1 – Oct 31', () => {
    const start = dayjs.utc('2026-10-01');
    const end = dayjs.utc('2026-10-31');
    expect(isFullMonth(start, end)).toBe(true);
  });

  it('returns true for Feb 1 – Feb 28 (non-leap year)', () => {
    const start = dayjs.utc('2026-02-01');
    const end = dayjs.utc('2026-02-28');
    expect(isFullMonth(start, end)).toBe(true);
  });

  it('returns true for Feb 1 – Feb 29 (leap year)', () => {
    const start = dayjs.utc('2028-02-01');
    const end = dayjs.utc('2028-02-29');
    expect(isFullMonth(start, end)).toBe(true);
  });

  it('returns false for Oct 1 – Oct 30 (not last day)', () => {
    const start = dayjs.utc('2026-10-01');
    const end = dayjs.utc('2026-10-30');
    expect(isFullMonth(start, end)).toBe(false);
  });

  it('returns false for Oct 2 – Oct 31 (not first day)', () => {
    const start = dayjs.utc('2026-10-02');
    const end = dayjs.utc('2026-10-31');
    expect(isFullMonth(start, end)).toBe(false);
  });

  it('returns false for cross-month ranges', () => {
    const start = dayjs.utc('2026-10-01');
    const end = dayjs.utc('2026-11-30');
    expect(isFullMonth(start, end)).toBe(false);
  });

  it('returns false for same-day ranges', () => {
    const start = dayjs.utc('2026-10-01');
    const end = dayjs.utc('2026-10-01');
    expect(isFullMonth(start, end)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveTimezone
// ---------------------------------------------------------------------------

describe('resolveTimezone', () => {
  it('returns the event timezone by default', () => {
    expect(resolveTimezone({ timezone: 'Europe/London' })).toBe(
      'Europe/London'
    );
  });

  it('falls back to UTC when no timezone is set', () => {
    expect(resolveTimezone({})).toBe('UTC');
  });

  it('uses userTimezone when useLocalTimezone is true', () => {
    expect(
      resolveTimezone({
        timezone: 'Europe/London',
        useLocalTimezone: true,
        userTimezone: 'America/New_York',
      })
    ).toBe('America/New_York');
  });

  it('falls back to UTC when useLocalTimezone is true but userTimezone is missing', () => {
    expect(
      resolveTimezone({
        timezone: 'Europe/London',
        useLocalTimezone: true,
      })
    ).toBe('UTC');
  });
});
