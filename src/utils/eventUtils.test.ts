import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isCallForSpeakersOpen,
  getEventUrl,
  groupByMonth,
  filterPastMonths,
  formatMonthHeading,
  compareByDateAsc,
  compareByDateDesc,
  getFormatLabel,
  getFormatPreposition,
} from './eventUtils';
import type { Event, Book } from '../types/event';

describe('isCallForSpeakersOpen', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false when callForSpeakers is false', () => {
    expect(
      isCallForSpeakersOpen({
        callForSpeakers: false,
        callForSpeakersClosingDate: '2099-12-31T00:00:00Z',
      })
    ).toBe(false);
  });

  it('returns false when callForSpeakers is undefined', () => {
    expect(isCallForSpeakersOpen({})).toBe(false);
  });

  it('returns true when callForSpeakers is true and no closing date', () => {
    expect(
      isCallForSpeakersOpen({
        callForSpeakers: true,
      })
    ).toBe(true);
  });

  it('returns true when closing date is in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));

    expect(
      isCallForSpeakersOpen({
        callForSpeakers: true,
        callForSpeakersClosingDate: '2026-02-01T00:00:00Z',
      })
    ).toBe(true);
  });

  it('returns false when closing date is in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));

    expect(
      isCallForSpeakersOpen({
        callForSpeakers: true,
        callForSpeakersClosingDate: '2026-02-01T00:00:00Z',
      })
    ).toBe(false);
  });

  it('returns false when closing date is exactly now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-01T00:00:00Z'));

    expect(
      isCallForSpeakersOpen({
        callForSpeakers: true,
        callForSpeakersClosingDate: '2026-02-01T00:00:00Z',
      })
    ).toBe(false);
  });
});

describe('getEventUrl', () => {
  it('returns URL path when slug is present', () => {
    expect(getEventUrl({ slug: { current: 'my-event' } })).toBe(
      '/events/my-event'
    );
  });

  it('returns undefined when slug is undefined', () => {
    expect(getEventUrl({ slug: undefined })).toBeUndefined();
  });

  it('returns undefined when slug is null', () => {
    expect(getEventUrl({ slug: null } as any)).toBeUndefined();
  });

  it('returns undefined when slug.current is undefined', () => {
    expect(getEventUrl({ slug: {} } as any)).toBeUndefined();
  });

  it('handles slugs with special characters', () => {
    expect(getEventUrl({ slug: { current: 'a11y-conf-2026' } })).toBe(
      '/events/a11y-conf-2026'
    );
  });
});

// ── Test helpers ───────────────────────────────────────────────────────

function makeEvent(overrides: Partial<Event> & { dateStart: string }): Event {
  return {
    _id: 'evt-' + overrides.dateStart,
    _type: 'event',
    type: 'conference',
    title: 'Test Event',
    ...overrides,
  };
}

function makeBook(dateStart: string): Book {
  return {
    _id: 'book-' + dateStart,
    _type: 'book',
    title: 'Test Book',
    dateStart,
  };
}

/** Simple UTC key extractor for tests */
const utcKey = (item: Event | Book) => {
  const d = new Date(item.dateStart);
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
};

// ── compareByDateAsc / compareByDateDesc ───────────────────────────────

describe('compareByDateAsc', () => {
  it('returns a negative number when a comes before b', () => {
    const a = { dateStart: '2026-01-01T00:00:00Z' };
    const b = { dateStart: '2026-06-01T00:00:00Z' };
    expect(compareByDateAsc(a, b)).toBeLessThan(0);
  });

  it('returns a positive number when a comes after b', () => {
    const a = { dateStart: '2026-06-01T00:00:00Z' };
    const b = { dateStart: '2026-01-01T00:00:00Z' };
    expect(compareByDateAsc(a, b)).toBeGreaterThan(0);
  });

  it('returns 0 for equal dates', () => {
    const a = { dateStart: '2026-03-15T10:00:00Z' };
    const b = { dateStart: '2026-03-15T10:00:00Z' };
    expect(compareByDateAsc(a, b)).toBe(0);
  });

  it('sorts an array into ascending chronological order', () => {
    const items = [
      { dateStart: '2026-05-01T00:00:00Z' },
      { dateStart: '2026-01-01T00:00:00Z' },
      { dateStart: '2026-03-01T00:00:00Z' },
    ];
    const sorted = [...items].sort(compareByDateAsc);
    expect(sorted.map((i) => i.dateStart)).toEqual([
      '2026-01-01T00:00:00Z',
      '2026-03-01T00:00:00Z',
      '2026-05-01T00:00:00Z',
    ]);
  });
});

describe('compareByDateDesc', () => {
  it('returns a positive number when a comes before b', () => {
    const a = { dateStart: '2026-01-01T00:00:00Z' };
    const b = { dateStart: '2026-06-01T00:00:00Z' };
    expect(compareByDateDesc(a, b)).toBeGreaterThan(0);
  });

  it('returns a negative number when a comes after b', () => {
    const a = { dateStart: '2026-06-01T00:00:00Z' };
    const b = { dateStart: '2026-01-01T00:00:00Z' };
    expect(compareByDateDesc(a, b)).toBeLessThan(0);
  });

  it('returns 0 for equal dates', () => {
    const a = { dateStart: '2026-03-15T10:00:00Z' };
    const b = { dateStart: '2026-03-15T10:00:00Z' };
    expect(compareByDateDesc(a, b)).toBe(0);
  });

  it('sorts an array into descending chronological order', () => {
    const items = [
      { dateStart: '2026-01-01T00:00:00Z' },
      { dateStart: '2026-05-01T00:00:00Z' },
      { dateStart: '2026-03-01T00:00:00Z' },
    ];
    const sorted = [...items].sort(compareByDateDesc);
    expect(sorted.map((i) => i.dateStart)).toEqual([
      '2026-05-01T00:00:00Z',
      '2026-03-01T00:00:00Z',
      '2026-01-01T00:00:00Z',
    ]);
  });
});

// ── groupByMonth ───────────────────────────────────────────────────────

describe('groupByMonth', () => {
  it('groups items into correct month keys', () => {
    const items = [
      makeEvent({ dateStart: '2026-03-10T10:00:00Z' }),
      makeEvent({ dateStart: '2026-03-25T10:00:00Z' }),
      makeEvent({ dateStart: '2026-04-05T10:00:00Z' }),
    ];

    const result = groupByMonth(items, 'upcoming', utcKey);

    expect(Object.keys(result)).toEqual(['2026-3', '2026-4']);
    expect(result['2026-3']).toHaveLength(2);
    expect(result['2026-4']).toHaveLength(1);
  });

  it('sorts upcoming events chronologically (oldest month first)', () => {
    const items = [
      makeEvent({ dateStart: '2026-05-01T10:00:00Z' }),
      makeEvent({ dateStart: '2026-03-01T10:00:00Z' }),
      makeEvent({ dateStart: '2026-04-01T10:00:00Z' }),
    ];

    const result = groupByMonth(items, 'upcoming', utcKey);

    expect(Object.keys(result)).toEqual(['2026-3', '2026-4', '2026-5']);
  });

  it('sorts past events reverse-chronologically (newest month first)', () => {
    const items = [
      makeEvent({ dateStart: '2026-03-01T10:00:00Z' }),
      makeEvent({ dateStart: '2026-05-01T10:00:00Z' }),
      makeEvent({ dateStart: '2026-04-01T10:00:00Z' }),
    ];

    const result = groupByMonth(items, 'past', utcKey);

    expect(Object.keys(result)).toEqual(['2026-5', '2026-4', '2026-3']);
  });

  it('places books before events within the same month (upcoming)', () => {
    const book = makeBook('2026-03-01T00:00:00Z');
    const event1 = makeEvent({ dateStart: '2026-03-05T10:00:00Z' });
    const event2 = makeEvent({ dateStart: '2026-03-02T10:00:00Z' });

    const result = groupByMonth([event1, event2, book], 'upcoming', utcKey);
    const marchItems = result['2026-3'];

    expect(marchItems[0]._type).toBe('book');
    expect(marchItems[1]._type).not.toBe('book');
    expect(marchItems[2]._type).not.toBe('book');
  });

  it('places books before events within the same month (past)', () => {
    const book = makeBook('2026-03-15T00:00:00Z');
    const event = makeEvent({ dateStart: '2026-03-20T10:00:00Z' });

    const result = groupByMonth([event, book], 'past', utcKey);
    const marchItems = result['2026-3'];

    expect(marchItems[0]._type).toBe('book');
  });

  it('uses the provided getKey callback for grouping', () => {
    const items = [
      makeEvent({ dateStart: '2026-03-31T23:00:00Z' }), // UTC: March, but custom key maps to April
      makeEvent({ dateStart: '2026-04-01T09:00:00Z' }), // UTC: April
    ];

    // Custom key that always returns the same bucket
    const alwaysSameKey = () => '2026-1';
    const result = groupByMonth(items, 'upcoming', alwaysSameKey);

    expect(Object.keys(result)).toEqual(['2026-1']);
    expect(result['2026-1']).toHaveLength(2);
  });

  it('sorts events within a month chronologically for upcoming', () => {
    const items = [
      makeEvent({ dateStart: '2026-03-20T10:00:00Z' }),
      makeEvent({ dateStart: '2026-03-05T10:00:00Z' }),
      makeEvent({ dateStart: '2026-03-15T10:00:00Z' }),
    ];

    const result = groupByMonth(items, 'upcoming', utcKey);
    const dates = result['2026-3'].map((i) => i.dateStart);

    expect(dates).toEqual([
      '2026-03-05T10:00:00Z',
      '2026-03-15T10:00:00Z',
      '2026-03-20T10:00:00Z',
    ]);
  });

  it('sorts events within a month reverse-chronologically for past', () => {
    const items = [
      makeEvent({ dateStart: '2026-03-05T10:00:00Z' }),
      makeEvent({ dateStart: '2026-03-20T10:00:00Z' }),
      makeEvent({ dateStart: '2026-03-15T10:00:00Z' }),
    ];

    const result = groupByMonth(items, 'past', utcKey);
    const dates = result['2026-3'].map((i) => i.dateStart);

    expect(dates).toEqual([
      '2026-03-20T10:00:00Z',
      '2026-03-15T10:00:00Z',
      '2026-03-05T10:00:00Z',
    ]);
  });

  it('handles an empty items array', () => {
    const result = groupByMonth([], 'upcoming', utcKey);
    expect(result).toEqual({});
  });
});

// ── filterPastMonths ───────────────────────────────────────────────────

describe('filterPastMonths', () => {
  it('removes months strictly before the current month', () => {
    const groups = {
      '2026-1': [makeEvent({ dateStart: '2026-01-15T10:00:00Z' })],
      '2026-2': [makeEvent({ dateStart: '2026-02-15T10:00:00Z' })],
      '2026-3': [makeEvent({ dateStart: '2026-03-15T10:00:00Z' })],
      '2026-4': [makeEvent({ dateStart: '2026-04-15T10:00:00Z' })],
    };

    const result = filterPastMonths(groups, 2026, 3);

    expect(Object.keys(result)).toEqual(['2026-3', '2026-4']);
  });

  it('keeps the current month', () => {
    const groups = {
      '2026-3': [makeEvent({ dateStart: '2026-03-15T10:00:00Z' })],
    };

    const result = filterPastMonths(groups, 2026, 3);

    expect(Object.keys(result)).toContain('2026-3');
  });

  it('keeps future months from a later year', () => {
    const groups = {
      '2025-12': [makeEvent({ dateStart: '2025-12-01T10:00:00Z' })],
      '2026-1': [makeEvent({ dateStart: '2026-01-01T10:00:00Z' })],
    };

    // Current: December 2025
    const result = filterPastMonths(groups, 2025, 12);

    expect(Object.keys(result)).toEqual(['2025-12', '2026-1']);
  });

  it('removes months from a previous year', () => {
    const groups = {
      '2025-11': [makeEvent({ dateStart: '2025-11-01T10:00:00Z' })],
      '2026-3': [makeEvent({ dateStart: '2026-03-01T10:00:00Z' })],
    };

    const result = filterPastMonths(groups, 2026, 3);

    expect(Object.keys(result)).toEqual(['2026-3']);
  });

  it('returns empty object when all months are in the past', () => {
    const groups = {
      '2026-1': [makeEvent({ dateStart: '2026-01-01T10:00:00Z' })],
      '2026-2': [makeEvent({ dateStart: '2026-02-01T10:00:00Z' })],
    };

    const result = filterPastMonths(groups, 2026, 3);

    expect(result).toEqual({});
  });
});

// ── formatMonthHeading ─────────────────────────────────────────────────

describe('formatMonthHeading', () => {
  it('returns "This month" for the current month (Date)', () => {
    // March 2026 (0-indexed month = 2)
    const now = new Date(2026, 2, 15);
    expect(formatMonthHeading('2026-3', now)).toBe('This month');
  });

  it('returns "This month" for the current month (dayjs-like object)', () => {
    // Simulate a dayjs instance via a plain object with month() and year()
    const now = { month: () => 2, year: () => 2026 }; // March 2026
    expect(formatMonthHeading('2026-3', now)).toBe('This month');
  });

  it('returns month name only for a different month in the same year', () => {
    const now = new Date(2026, 2, 15); // March 2026
    const result = formatMonthHeading('2026-1', now); // January 2026
    // Should be just the month name, no year
    expect(result).toMatch(/^january$/i);
  });

  it('returns month name and year for a different year', () => {
    const now = new Date(2026, 2, 15); // March 2026
    const result = formatMonthHeading('2025-12', now); // December 2025
    expect(result).toMatch(/december/i);
    expect(result).toContain('2025');
  });

  it('uses the provided locale', () => {
    const now = new Date(2026, 2, 15); // March 2026
    const result = formatMonthHeading('2026-1', now, 'en-US'); // January 2026
    expect(result).toMatch(/^january$/i);
  });

  it('defaults to current date when no "now" argument is supplied', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15)); // March 2026
    try {
      expect(formatMonthHeading('2026-3')).toBe('This month');
    } finally {
      vi.useRealTimers();
    }
  });
});

// ── getFormatLabel ─────────────────────────────────────────────────────

describe('getFormatLabel', () => {
  it('returns the display label for known formats', () => {
    expect(getFormatLabel('talk')).toBe('Talk');
    expect(getFormatLabel('workshop')).toBe('Workshop');
    expect(getFormatLabel('qna')).toBe('Q&A');
    expect(getFormatLabel('keynote')).toBe('Keynote');
  });

  it('falls back to the raw format string for unknown formats', () => {
    expect(getFormatLabel('hackathon')).toBe('hackathon');
  });

  it('returns undefined for undefined input', () => {
    expect(getFormatLabel(undefined)).toBeUndefined();
  });
});

// ── getFormatPreposition ───────────────────────────────────────────────

describe('getFormatPreposition', () => {
  it('returns "by" for presentation formats', () => {
    expect(getFormatPreposition('talk')).toBe('by');
    expect(getFormatPreposition('keynote')).toBe('by');
    expect(getFormatPreposition('tutorial')).toBe('by');
  });

  it('returns "with" for collaborative formats', () => {
    expect(getFormatPreposition('workshop')).toBe('with');
    expect(getFormatPreposition('panel')).toBe('with');
  });

  it('defaults to "by" for unknown formats', () => {
    expect(getFormatPreposition('hackathon')).toBe('by');
  });

  it('defaults to "by" for undefined input', () => {
    expect(getFormatPreposition(undefined)).toBe('by');
  });
});
