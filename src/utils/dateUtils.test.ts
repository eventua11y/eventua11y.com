import { describe, it, expect } from 'vitest';
import {
  getStartDateFormat,
  getEndDateFormat,
  isSameDay,
  formatEventDate,
  formatDateRange,
  getYearMonth,
} from './dateUtils';

describe('getStartDateFormat', () => {
  it('returns LL for awareness days (theme)', () => {
    expect(getStartDateFormat({ type: 'theme' })).toBe('LL');
  });

  it('returns LL for deadlines', () => {
    expect(getStartDateFormat({ isDeadline: true })).toBe('LL');
  });

  it('returns LL for all-day events', () => {
    expect(getStartDateFormat({ day: true })).toBe('LL');
  });

  it('returns LLL for regular timed events', () => {
    expect(getStartDateFormat({})).toBe('LLL');
    expect(getStartDateFormat({ type: 'event' })).toBe('LLL');
  });

  it('theme takes precedence over day', () => {
    expect(getStartDateFormat({ type: 'theme', day: true })).toBe('LL');
  });

  it('deadline takes precedence over day', () => {
    expect(getStartDateFormat({ isDeadline: true, day: true })).toBe('LL');
  });
});

describe('getEndDateFormat', () => {
  it('returns LL for all-day events', () => {
    expect(
      getEndDateFormat({
        day: true,
        dateStart: '2026-01-15T09:00:00Z',
        dateEnd: '2026-01-17T17:00:00Z',
      })
    ).toBe('LL');
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

  it('returns LLL for multi-day timed events', () => {
    expect(
      getEndDateFormat({
        dateStart: '2026-01-15T09:00:00Z',
        dateEnd: '2026-01-17T17:00:00Z',
        timezone: 'UTC',
      })
    ).toBe('LLL');
  });

  it('day=true takes precedence over same-day check', () => {
    expect(
      getEndDateFormat({
        day: true,
        dateStart: '2026-01-15T09:00:00Z',
        dateEnd: '2026-01-15T17:00:00Z',
        timezone: 'UTC',
      })
    ).toBe('LL');
  });

  it('accounts for timezone when determining same day', () => {
    // 2026-01-15T23:00:00Z is Jan 15 in UTC but Jan 16 in UTC+2
    expect(
      getEndDateFormat({
        dateStart: '2026-01-15T23:00:00Z',
        dateEnd: '2026-01-16T01:00:00Z',
        timezone: 'UTC',
      })
    ).toBe('LLL'); // Different days in UTC

    expect(
      getEndDateFormat({
        dateStart: '2026-01-15T23:00:00Z',
        dateEnd: '2026-01-16T01:00:00Z',
        timezone: 'Europe/Helsinki', // UTC+2
      })
    ).toBe('LT'); // Same day (Jan 16) in Helsinki
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
    expect(result).toContain('9:00 AM');
  });

  it('converts local events to event timezone', () => {
    // UTC 14:00 = EST 09:00
    const result = formatEventDate('2026-03-15T14:00:00Z', 'LLL', {
      timezone: 'America/New_York',
      locale: 'en',
    });
    expect(result).toContain('March 15, 2026');
    expect(result).toContain('10:00 AM'); // EDT in March
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
    expect(result).toContain('2:00 PM'); // UTC+0 (GMT in March)
  });

  it('falls back to UTC when timezone is missing', () => {
    const result = formatEventDate('2026-03-15T14:00:00Z', 'LT', {
      timezone: 'UTC',
      locale: 'en',
    });
    expect(result).toBe('2:00 PM');
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
    it('returns a single formatted date for timed events', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T14:00:00Z',
        timezone: 'UTC',
        locale: 'en',
      });
      expect(result).toBe('March 8, 2026 2:00 PM');
    });

    it('returns date-only for all-day events', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T00:00:00Z',
        timezone: 'UTC',
        locale: 'en',
        day: true,
      });
      expect(result).toBe('March 8, 2026');
    });

    it('returns date-only for themes', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T00:00:00Z',
        timezone: 'UTC',
        locale: 'en',
        type: 'theme',
      });
      expect(result).toBe('March 8, 2026');
    });
  });

  describe('same-day timed events', () => {
    it('deduplicates the date, showing time range only', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T14:00:00Z',
        dateEnd: '2026-03-08T17:00:00Z',
        timezone: 'UTC',
        locale: 'en',
      });
      // "March 8, 2026 2:00 PM – 5:00 PM"
      expect(result).toBe('March 8, 2026 2:00 PM \u2013 5:00 PM');
    });

    it('shows AM/PM on both times when they differ', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T10:00:00Z',
        dateEnd: '2026-03-08T17:00:00Z',
        timezone: 'UTC',
        locale: 'en',
      });
      // "March 8, 2026 10:00 AM – 5:00 PM"
      expect(result).toBe('March 8, 2026 10:00 AM \u2013 5:00 PM');
    });

    it('returns single date for same-day date-only events', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T00:00:00Z',
        dateEnd: '2026-03-08T23:59:00Z',
        timezone: 'UTC',
        locale: 'en',
        day: true,
      });
      expect(result).toBe('March 8, 2026');
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
      expect(result).toBe('March 8 \u2013 13, 2026');
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
      expect(result).toBe('March 28 \u2013 April 2, 2026');
    });
  });

  describe('different-year ranges', () => {
    it('shows both years for date-only ranges', () => {
      const result = formatDateRange({
        dateStart: '2026-12-28T00:00:00Z',
        dateEnd: '2027-01-02T00:00:00Z',
        timezone: 'UTC',
        locale: 'en',
        day: true,
      });
      expect(result).toBe('December 28, 2026 \u2013 January 2, 2027');
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
      // Start omits year, end keeps it
      expect(result).toBe(
        'February 24 2:00 PM \u2013 February 25, 2026 9:00 PM'
      );
    });

    it('deduplicates year across different months', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T14:00:00Z',
        dateEnd: '2026-04-10T17:00:00Z',
        timezone: 'UTC',
        locale: 'en',
      });
      expect(result).toBe('March 8 2:00 PM \u2013 April 10, 2026 5:00 PM');
    });

    it('shows full date+time on both sides for different years', () => {
      const result = formatDateRange({
        dateStart: '2026-12-30T14:00:00Z',
        dateEnd: '2027-01-02T17:00:00Z',
        timezone: 'UTC',
        locale: 'en',
      });
      expect(result).toBe(
        'December 30, 2026 2:00 PM \u2013 January 2, 2027 5:00 PM'
      );
    });
  });

  describe('timezone handling', () => {
    it('converts to event timezone', () => {
      // UTC 23:00 Mar 8 = EDT 19:00 Mar 8; UTC 03:00 Mar 10 = EDT 23:00 Mar 9
      const result = formatDateRange({
        dateStart: '2026-03-08T23:00:00Z',
        dateEnd: '2026-03-10T03:00:00Z',
        timezone: 'America/New_York',
        locale: 'en',
        day: true,
      });
      // In EDT (UTC-4 in March), these are Mar 8 and Mar 9
      expect(result).toBe('March 8 \u2013 9, 2026');
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
      // In London (GMT), these are 14:00–17:00 on Mar 8
      expect(result).toBe('March 8, 2026 2:00 PM \u2013 5:00 PM');
    });

    it('uses UTC for international events (no timezone)', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T14:00:00Z',
        dateEnd: '2026-03-08T17:00:00Z',
        locale: 'en',
      });
      // No timezone = international, should use UTC values
      expect(result).toBe('March 8, 2026 2:00 PM \u2013 5:00 PM');
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
      // "8. – 13. März 2026"
      expect(result).toBe('8. \u2013 13. März 2026');
    });

    it('formats different-month range in German', () => {
      const result = formatDateRange({
        dateStart: '2026-03-28T00:00:00Z',
        dateEnd: '2026-04-02T00:00:00Z',
        timezone: 'UTC',
        locale: 'de',
        day: true,
      });
      // "28. März – 2. April 2026"
      expect(result).toBe('28. März \u2013 2. April 2026');
    });

    it('formats same-month range in French', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T00:00:00Z',
        dateEnd: '2026-03-13T00:00:00Z',
        timezone: 'UTC',
        locale: 'fr',
        day: true,
      });
      // "8 – 13 mars 2026"
      expect(result).toBe('8 \u2013 13 mars 2026');
    });

    it('formats different-month range in French', () => {
      const result = formatDateRange({
        dateStart: '2026-03-28T00:00:00Z',
        dateEnd: '2026-04-02T00:00:00Z',
        timezone: 'UTC',
        locale: 'fr',
        day: true,
      });
      // "28 mars – 2 avril 2026"
      expect(result).toBe('28 mars \u2013 2 avril 2026');
    });

    it('formats same-month range in Spanish', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T00:00:00Z',
        dateEnd: '2026-03-13T00:00:00Z',
        timezone: 'UTC',
        locale: 'es',
        day: true,
      });
      // "8 – 13 de marzo de 2026"
      expect(result).toBe('8 \u2013 13 de marzo de 2026');
    });

    it('formats different-month range in Spanish', () => {
      const result = formatDateRange({
        dateStart: '2026-03-28T00:00:00Z',
        dateEnd: '2026-04-02T00:00:00Z',
        timezone: 'UTC',
        locale: 'es',
        day: true,
      });
      // "28 de marzo – 2 de abril de 2026"
      expect(result).toBe('28 de marzo \u2013 2 de abril de 2026');
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
      // Should be date-only: "March 8 – 13, 2026"
      expect(result).toBe('March 8 \u2013 13, 2026');
    });

    it('omits time for deadlines', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T14:00:00Z',
        dateEnd: '2026-03-13T17:00:00Z',
        timezone: 'UTC',
        locale: 'en',
        isDeadline: true,
      });
      expect(result).toBe('March 8 \u2013 13, 2026');
    });

    it('omits time for all-day events', () => {
      const result = formatDateRange({
        dateStart: '2026-03-08T00:00:00Z',
        dateEnd: '2026-03-13T00:00:00Z',
        timezone: 'UTC',
        locale: 'en',
        day: true,
      });
      expect(result).toBe('March 8 \u2013 13, 2026');
    });
  });
});
