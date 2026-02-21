import { describe, it, expect } from 'vitest';
import {
  getStartDateFormat,
  getEndDateFormat,
  isSameDay,
  formatEventDate,
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
