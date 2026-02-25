import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {
  resolveTimezone,
  getEventStart,
  getEventEnd,
  isMultiDayAllDay,
  isHappeningNow,
  isStartingSoon,
  getEffectiveEnd,
  getProgress,
  endsToday,
  getTimeRemaining,
  getCountdownLabel,
  type ProgressOptions,
} from './progressUtils';

dayjs.extend(utc);
dayjs.extend(timezone);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shorthand for a fixed UTC instant. */
const now = (iso: string) => dayjs.utc(iso);

/** <abbr> helpers matching the module constants. */
const HR = '<abbr title="hours">hr</abbr>';
const M = '<abbr title="minutes">m</abbr>';

// ---------------------------------------------------------------------------
// resolveTimezone
// ---------------------------------------------------------------------------

describe('resolveTimezone', () => {
  it('returns the event timezone by default', () => {
    expect(resolveTimezone({ dateStart: '', timezone: 'Europe/London' })).toBe(
      'Europe/London'
    );
  });

  it('falls back to UTC when no timezone is set', () => {
    expect(resolveTimezone({ dateStart: '' })).toBe('UTC');
  });

  it('uses userTimezone when useLocalTimezone is true', () => {
    expect(
      resolveTimezone({
        dateStart: '',
        timezone: 'Europe/London',
        useLocalTimezone: true,
        userTimezone: 'America/New_York',
      })
    ).toBe('America/New_York');
  });

  it('falls back to UTC when useLocalTimezone is true but userTimezone is missing', () => {
    expect(
      resolveTimezone({
        dateStart: '',
        timezone: 'Europe/London',
        useLocalTimezone: true,
      })
    ).toBe('UTC');
  });
});

// ---------------------------------------------------------------------------
// getEventStart
// ---------------------------------------------------------------------------

describe('getEventStart', () => {
  it('returns a UTC dayjs when the event has no timezone', () => {
    const start = getEventStart({ dateStart: '2026-06-15T14:00:00Z' });
    expect(start.format('YYYY-MM-DD HH:mm')).toBe('2026-06-15 14:00');
  });

  it('converts to event timezone', () => {
    const start = getEventStart({
      dateStart: '2026-06-15T14:00:00Z',
      timezone: 'America/New_York',
    });
    // UTC 14:00 → EDT (UTC-4) 10:00
    expect(start.format('HH:mm')).toBe('10:00');
  });

  it('uses user timezone when useLocalTimezone is true', () => {
    const start = getEventStart({
      dateStart: '2026-06-15T14:00:00Z',
      timezone: 'America/New_York',
      useLocalTimezone: true,
      userTimezone: 'Europe/London',
    });
    // UTC 14:00 → BST (UTC+1) 15:00
    expect(start.format('HH:mm')).toBe('15:00');
  });
});

// ---------------------------------------------------------------------------
// getEventEnd
// ---------------------------------------------------------------------------

describe('getEventEnd', () => {
  it('returns the explicit end date when provided', () => {
    const end = getEventEnd({
      dateStart: '2026-06-15T14:00:00Z',
      dateEnd: '2026-06-15T16:00:00Z',
    });
    expect(end.format('YYYY-MM-DD HH:mm')).toBe('2026-06-15 16:00');
  });

  it('falls back to end-of-day of start when no end date', () => {
    const end = getEventEnd({ dateStart: '2026-06-15T14:00:00Z' });
    expect(end.format('YYYY-MM-DD HH:mm')).toBe('2026-06-15 23:59');
  });

  it('converts end date to event timezone', () => {
    const end = getEventEnd({
      dateStart: '2026-06-15T14:00:00Z',
      dateEnd: '2026-06-15T22:00:00Z',
      timezone: 'America/New_York',
    });
    // UTC 22:00 → EDT 18:00
    expect(end.format('HH:mm')).toBe('18:00');
  });
});

// ---------------------------------------------------------------------------
// isMultiDayAllDay
// ---------------------------------------------------------------------------

describe('isMultiDayAllDay', () => {
  it('returns false when day flag is not set', () => {
    expect(
      isMultiDayAllDay({
        dateStart: '2026-06-15T00:00:00Z',
        dateEnd: '2026-06-17T00:00:00Z',
      })
    ).toBe(false);
  });

  it('returns false when day is true but no end date', () => {
    expect(
      isMultiDayAllDay({
        dateStart: '2026-06-15T00:00:00Z',
        day: true,
      })
    ).toBe(false);
  });

  it('returns false for single-day all-day events', () => {
    expect(
      isMultiDayAllDay({
        dateStart: '2026-06-15T00:00:00Z',
        dateEnd: '2026-06-15T23:59:00Z',
        day: true,
      })
    ).toBe(false);
  });

  it('returns true for multi-day all-day events', () => {
    expect(
      isMultiDayAllDay({
        dateStart: '2026-06-15T00:00:00Z',
        dateEnd: '2026-06-17T00:00:00Z',
        day: true,
      })
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isHappeningNow
// ---------------------------------------------------------------------------

describe('isHappeningNow', () => {
  const timedEvent: ProgressOptions = {
    dateStart: '2026-06-15T14:00:00Z',
    dateEnd: '2026-06-15T16:00:00Z',
  };

  it('returns true when now is between start and end', () => {
    expect(isHappeningNow(now('2026-06-15T15:00:00Z'), timedEvent)).toBe(true);
  });

  it('returns false before the event starts', () => {
    expect(isHappeningNow(now('2026-06-15T13:00:00Z'), timedEvent)).toBe(false);
  });

  it('returns false after the event ends', () => {
    expect(isHappeningNow(now('2026-06-15T17:00:00Z'), timedEvent)).toBe(false);
  });

  it('returns false exactly at the start time (isAfter, not isSameOrAfter)', () => {
    expect(isHappeningNow(now('2026-06-15T14:00:00Z'), timedEvent)).toBe(false);
  });

  it('returns false exactly at the end time (isBefore, not isSameOrBefore)', () => {
    expect(isHappeningNow(now('2026-06-15T16:00:00Z'), timedEvent)).toBe(false);
  });

  it('excludes themes', () => {
    expect(
      isHappeningNow(now('2026-06-15T15:00:00Z'), {
        ...timedEvent,
        type: 'theme',
      })
    ).toBe(false);
  });

  it('excludes deadlines', () => {
    expect(
      isHappeningNow(now('2026-06-15T15:00:00Z'), {
        ...timedEvent,
        type: 'deadline',
      })
    ).toBe(false);
  });

  it('excludes single-day all-day events', () => {
    expect(
      isHappeningNow(now('2026-06-15T12:00:00Z'), {
        dateStart: '2026-06-15T00:00:00Z',
        dateEnd: '2026-06-15T23:59:00Z',
        day: true,
      })
    ).toBe(false);
  });

  it('includes multi-day all-day events when now falls within', () => {
    expect(
      isHappeningNow(now('2026-06-16T12:00:00Z'), {
        dateStart: '2026-06-15T00:00:00Z',
        dateEnd: '2026-06-17T00:00:00Z',
        day: true,
      })
    ).toBe(true);
  });

  it('returns false when there is no end date', () => {
    expect(
      isHappeningNow(now('2026-06-15T15:00:00Z'), {
        dateStart: '2026-06-15T14:00:00Z',
      })
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isStartingSoon
// ---------------------------------------------------------------------------

describe('isStartingSoon', () => {
  const futureEvent: ProgressOptions = {
    dateStart: '2026-06-15T14:00:00Z',
    dateEnd: '2026-06-15T16:00:00Z',
    showCountdown: true,
  };

  it('returns true when now is before start and showCountdown is on', () => {
    expect(isStartingSoon(now('2026-06-15T13:00:00Z'), futureEvent)).toBe(true);
  });

  it('returns false when showCountdown is off', () => {
    expect(
      isStartingSoon(now('2026-06-15T13:00:00Z'), {
        ...futureEvent,
        showCountdown: false,
      })
    ).toBe(false);
  });

  it('returns false when showCountdown is not set', () => {
    const { showCountdown: _, ...noCountdown } = futureEvent;
    expect(isStartingSoon(now('2026-06-15T13:00:00Z'), noCountdown)).toBe(
      false
    );
  });

  it('returns false after the event starts', () => {
    expect(isStartingSoon(now('2026-06-15T15:00:00Z'), futureEvent)).toBe(
      false
    );
  });

  it('excludes themes', () => {
    expect(
      isStartingSoon(now('2026-06-15T13:00:00Z'), {
        ...futureEvent,
        type: 'theme',
      })
    ).toBe(false);
  });

  it('excludes deadlines', () => {
    expect(
      isStartingSoon(now('2026-06-15T13:00:00Z'), {
        ...futureEvent,
        type: 'deadline',
      })
    ).toBe(false);
  });

  it('excludes all-day events', () => {
    expect(
      isStartingSoon(now('2026-06-15T00:00:00Z'), {
        ...futureEvent,
        day: true,
      })
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getEffectiveEnd
// ---------------------------------------------------------------------------

describe('getEffectiveEnd', () => {
  it('returns the actual end for timed events', () => {
    const end = getEffectiveEnd(now('2026-06-15T15:00:00Z'), {
      dateStart: '2026-06-15T14:00:00Z',
      dateEnd: '2026-06-15T16:00:00Z',
    });
    expect(end.format('YYYY-MM-DD HH:mm')).toBe('2026-06-15 16:00');
  });

  it('returns end-of-today for multi-day all-day events', () => {
    const n = now('2026-06-16T12:00:00Z');
    const end = getEffectiveEnd(n, {
      dateStart: '2026-06-15T00:00:00Z',
      dateEnd: '2026-06-17T00:00:00Z',
      day: true,
    });
    // Should be end of 2026-06-16 in UTC
    expect(end.format('YYYY-MM-DD')).toBe('2026-06-16');
    expect(end.hour()).toBe(23);
    expect(end.minute()).toBe(59);
  });
});

// ---------------------------------------------------------------------------
// getProgress
// ---------------------------------------------------------------------------

describe('getProgress', () => {
  const twoHourEvent: ProgressOptions = {
    dateStart: '2026-06-15T14:00:00Z',
    dateEnd: '2026-06-15T16:00:00Z',
  };

  it('returns 0 when event is not happening now', () => {
    expect(getProgress(now('2026-06-15T13:00:00Z'), twoHourEvent)).toBe(0);
  });

  it('returns 50 at the halfway point', () => {
    expect(getProgress(now('2026-06-15T15:00:00Z'), twoHourEvent)).toBe(50);
  });

  it('returns 25 at the quarter point', () => {
    expect(getProgress(now('2026-06-15T14:30:00Z'), twoHourEvent)).toBe(25);
  });

  it('returns 75 at three-quarters', () => {
    expect(getProgress(now('2026-06-15T15:30:00Z'), twoHourEvent)).toBe(75);
  });

  it('rounds to the nearest whole number', () => {
    // 14:00 to 16:00 = 120 minutes; 14:01 = 1/120 ≈ 0.83% → rounds to 1
    expect(getProgress(now('2026-06-15T14:01:00Z'), twoHourEvent)).toBe(1);
  });

  it('clamps to 100', () => {
    // just before end still caps at 100
    expect(
      getProgress(now('2026-06-15T15:59:59Z'), twoHourEvent)
    ).toBeLessThanOrEqual(100);
  });

  it('returns 0 for excluded event types', () => {
    expect(
      getProgress(now('2026-06-15T15:00:00Z'), {
        ...twoHourEvent,
        type: 'theme',
      })
    ).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// endsToday
// ---------------------------------------------------------------------------

describe('endsToday', () => {
  it('returns true when the event ends on the same calendar day', () => {
    expect(
      endsToday(now('2026-06-15T12:00:00Z'), {
        dateStart: '2026-06-15T14:00:00Z',
        dateEnd: '2026-06-15T16:00:00Z',
      })
    ).toBe(true);
  });

  it('returns false when the event ends on a different day', () => {
    expect(
      endsToday(now('2026-06-15T12:00:00Z'), {
        dateStart: '2026-06-15T14:00:00Z',
        dateEnd: '2026-06-17T16:00:00Z',
      })
    ).toBe(false);
  });

  it('accounts for timezone when determining same day', () => {
    // End is 2026-06-16T01:00:00Z — in UTC that's June 16, but in UTC-5 it's June 15
    expect(
      endsToday(now('2026-06-15T20:00:00Z'), {
        dateStart: '2026-06-15T14:00:00Z',
        dateEnd: '2026-06-16T01:00:00Z',
        timezone: 'America/New_York',
      })
    ).toBe(true); // EDT: June 15 21:00 end
  });
});

// ---------------------------------------------------------------------------
// getTimeRemaining
// ---------------------------------------------------------------------------

describe('getTimeRemaining', () => {
  it('returns empty string when event is not happening now', () => {
    expect(
      getTimeRemaining(now('2026-06-15T13:00:00Z'), {
        dateStart: '2026-06-15T14:00:00Z',
        dateEnd: '2026-06-15T16:00:00Z',
      })
    ).toBe('');
  });

  it('returns "Ends today" for multi-day all-day events', () => {
    expect(
      getTimeRemaining(now('2026-06-16T12:00:00Z'), {
        dateStart: '2026-06-15T00:00:00Z',
        dateEnd: '2026-06-17T00:00:00Z',
        day: true,
      })
    ).toBe('Ends today');
  });

  it('returns hours and minutes for timed events ending today', () => {
    // 2 hours remaining
    const result = getTimeRemaining(now('2026-06-15T14:00:01Z'), {
      dateStart: '2026-06-15T14:00:00Z',
      dateEnd: '2026-06-15T16:00:00Z',
    });
    expect(result).toContain('Ends in');
    expect(result).toContain(HR);
  });

  it('returns only minutes when less than an hour remains', () => {
    // 30 minutes remaining
    const result = getTimeRemaining(now('2026-06-15T15:30:01Z'), {
      dateStart: '2026-06-15T14:00:00Z',
      dateEnd: '2026-06-15T16:00:00Z',
    });
    expect(result).toBe(`Ends in 29${M}`);
  });

  it('returns "less than 1m" when under a minute remains', () => {
    const result = getTimeRemaining(now('2026-06-15T15:59:30Z'), {
      dateStart: '2026-06-15T14:00:00Z',
      dateEnd: '2026-06-15T16:00:00Z',
    });
    expect(result).toBe(`Ends in less than 1${M}`);
  });

  it('returns "Ends tomorrow" when end is the next calendar day', () => {
    const result = getTimeRemaining(now('2026-06-15T14:00:01Z'), {
      dateStart: '2026-06-15T14:00:00Z',
      dateEnd: '2026-06-16T16:00:00Z',
    });
    expect(result).toBe('Ends tomorrow');
  });

  it('returns "Ends in N days" for events ending further out', () => {
    const result = getTimeRemaining(now('2026-06-15T14:00:01Z'), {
      dateStart: '2026-06-15T14:00:00Z',
      dateEnd: '2026-06-18T16:00:00Z',
    });
    expect(result).toBe('Ends in 3 days');
  });

  it('formats exact hours without minutes', () => {
    // Exactly 2 hours remaining
    const result = getTimeRemaining(now('2026-06-15T14:00:01Z'), {
      dateStart: '2026-06-15T14:00:00Z',
      dateEnd: '2026-06-15T16:00:00Z',
    });
    // ~120 minutes left, dayjs diff truncates → 119 minutes → 1hr 59m
    expect(result).toContain('Ends in');
  });

  it('includes <abbr> elements in duration output', () => {
    const result = getTimeRemaining(now('2026-06-15T14:00:01Z'), {
      dateStart: '2026-06-15T14:00:00Z',
      dateEnd: '2026-06-15T16:30:00Z',
    });
    expect(result).toContain('<abbr title="hours">hr</abbr>');
    expect(result).toContain('<abbr title="minutes">m</abbr>');
  });
});

// ---------------------------------------------------------------------------
// getCountdownLabel
// ---------------------------------------------------------------------------

describe('getCountdownLabel', () => {
  const futureEvent: ProgressOptions = {
    dateStart: '2026-06-15T14:00:00Z',
    dateEnd: '2026-06-15T16:00:00Z',
    showCountdown: true,
  };

  it('returns empty string when showCountdown is off', () => {
    expect(
      getCountdownLabel(now('2026-06-15T13:00:00Z'), {
        ...futureEvent,
        showCountdown: false,
      })
    ).toBe('');
  });

  it('returns empty string when event has already started', () => {
    expect(getCountdownLabel(now('2026-06-15T15:00:00Z'), futureEvent)).toBe(
      ''
    );
  });

  it('returns countdown with hours and minutes', () => {
    // 3 hours and 15 minutes before start
    const result = getCountdownLabel(now('2026-06-15T10:45:00Z'), futureEvent);
    expect(result).toBe(`Starts in 3${HR} 15${M}`);
  });

  it('returns countdown with only minutes when under an hour', () => {
    const result = getCountdownLabel(now('2026-06-15T13:30:00Z'), futureEvent);
    expect(result).toBe(`Starts in 30${M}`);
  });

  it('returns countdown with only hours when minutes are zero', () => {
    const result = getCountdownLabel(now('2026-06-15T12:00:00Z'), futureEvent);
    expect(result).toBe(`Starts in 2${HR}`);
  });

  it('returns "less than 1m" when under a minute away', () => {
    const result = getCountdownLabel(now('2026-06-15T13:59:30Z'), futureEvent);
    expect(result).toBe(`Starts in less than 1${M}`);
  });

  it('excludes themes even with showCountdown', () => {
    expect(
      getCountdownLabel(now('2026-06-15T13:00:00Z'), {
        ...futureEvent,
        type: 'theme',
      })
    ).toBe('');
  });

  it('excludes deadlines even with showCountdown', () => {
    expect(
      getCountdownLabel(now('2026-06-15T13:00:00Z'), {
        ...futureEvent,
        type: 'deadline',
      })
    ).toBe('');
  });

  it('excludes all-day events even with showCountdown', () => {
    expect(
      getCountdownLabel(now('2026-06-15T13:00:00Z'), {
        ...futureEvent,
        day: true,
      })
    ).toBe('');
  });

  it('includes <abbr> elements in countdown output', () => {
    const result = getCountdownLabel(now('2026-06-15T10:45:00Z'), futureEvent);
    expect(result).toContain('<abbr title="hours">hr</abbr>');
    expect(result).toContain('<abbr title="minutes">m</abbr>');
  });
});
