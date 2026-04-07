import dayjs from 'dayjs';
import type { Event, ChildEvent, Book } from '../types/event';

// ── Date comparators ───────────────────────────────────────────────────

/**
 * Comparator: sorts items with a `dateStart` field in ascending
 * chronological order (earliest first).
 */
export function compareByDateAsc(
  a: { dateStart: string },
  b: { dateStart: string }
): number {
  return new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime();
}

/**
 * Comparator: sorts items with a `dateStart` field in descending
 * chronological order (latest first).
 */
export function compareByDateDesc(
  a: { dateStart: string },
  b: { dateStart: string }
): number {
  return new Date(b.dateStart).getTime() - new Date(a.dateStart).getTime();
}

// ── Grouping helpers ───────────────────────────────────────────────────

type ListItem = Event | Book;
type GroupedItems = Record<string, ListItem[]>;

/**
 * Groups events and books by month.
 *
 * @param items - Combined array of events and books to group
 * @param type - 'upcoming' or 'past' (controls sort direction)
 * @param getKey - Function to extract year-month key (e.g. "2026-3") from an item.
 *                 Allows callers to use UTC or timezone-aware logic.
 */
export function groupByMonth(
  items: ListItem[],
  type: 'upcoming' | 'past',
  getKey: (item: ListItem) => string
): GroupedItems {
  // Sort chronologically first
  const comparator = type === 'past' ? compareByDateDesc : compareByDateAsc;
  const sorted = [...items].sort(comparator);

  // Group by year-month key
  const groups: GroupedItems = {};
  for (const item of sorted) {
    const key = getKey(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  // Sort within each group: books first, then by date
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => {
      if ((a._type === 'book') === (b._type === 'book')) {
        return comparator(a, b);
      }
      return a._type === 'book' ? -1 : 1;
    });
  }

  // Sort month keys
  const sortedEntries = Object.entries(groups).sort((a, b) => {
    const [yearA, monthA] = a[0].split('-').map(Number);
    const [yearB, monthB] = b[0].split('-').map(Number);
    const comparison = yearA - yearB || monthA - monthB;
    return type === 'past' ? -comparison : comparison;
  });

  return Object.fromEntries(sortedEntries);
}

/**
 * Removes month groups that are before the current month.
 * Used by upcoming event lists to hide past months.
 */
export function filterPastMonths(
  groups: GroupedItems,
  currentYear: number,
  currentMonth: number
): GroupedItems {
  const filtered: GroupedItems = {};
  for (const [key, items] of Object.entries(groups)) {
    const [year, month] = key.split('-').map(Number);
    if (year > currentYear || (year === currentYear && month >= currentMonth)) {
      filtered[key] = items;
    }
  }
  return filtered;
}

/**
 * Formats a year-month key (e.g. "2026-3") into a human-readable heading.
 * Returns "This month" for the current month, otherwise "March" or "March 2026".
 *
 * @param yearMonth - Key in "YYYY-M" format
 * @param now - Current date for comparison. Accepts Date or dayjs instance with
 *              month() and year() methods.
 * @param locale - BCP 47 locale string (default: 'default')
 */
export function formatMonthHeading(
  yearMonth: string,
  now: { month: () => number; year: () => number } | Date = new Date(),
  locale: string = 'default'
): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // 0-indexed for Date constructor
  const date = new Date(year, month);

  const currentMonth = now instanceof Date ? now.getMonth() : now.month();
  const currentYear = now instanceof Date ? now.getFullYear() : now.year();

  if (month === currentMonth && year === currentYear) {
    return 'This month';
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: year !== currentYear ? 'numeric' : undefined,
  });

  return formatter.format(date);
}

/**
 * Checks if the call for speakers is open for a given event.
 * Returns true if:
 * - Event has call for speakers enabled AND
 * - Either no closing date is set OR current date is before closing date
 *
 * @param event - The event to check
 * @returns True if the call for speakers is open, false otherwise
 */
export const isCallForSpeakersOpen = (
  event: Pick<Event, 'callForSpeakers' | 'callForSpeakersClosingDate'>
): boolean => {
  if (!event.callForSpeakers) return false;
  if (!event.callForSpeakersClosingDate) return true;
  return dayjs().isBefore(dayjs(event.callForSpeakersClosingDate));
};

/**
 * Returns the internal URL for an event's detail page, or undefined
 * if the event has no slug (e.g. synthetic CFS deadline events).
 *
 * @param event - The event or child event to get the URL for
 * @returns The internal URL path (e.g. "/events/my-event") or undefined
 */
export const getEventUrl = (
  event: Pick<Event | ChildEvent, 'slug'>
): string | undefined => {
  if (!event.slug?.current) return undefined;
  return `/events/${event.slug.current}`;
};

// ── Format display helpers ─────────────────────────────────────────────

/**
 * Maps event format codes to human-readable display labels.
 * Used by child event components and the event detail page.
 */
export const FORMAT_LABELS: Record<string, string> = {
  talk: 'Talk',
  tutorial: 'Tutorial',
  workshop: 'Workshop',
  webinar: 'Webinar',
  panel: 'Panel',
  meetup: 'Meetup',
  interview: 'Interview',
  qna: 'Q&A',
  keynote: 'Keynote',
  roundtable: 'Roundtable',
};

/**
 * Maps event format codes to the preposition used before speaker names.
 * "by" for presentation formats, "with" for collaborative formats.
 */
const FORMAT_PREPOSITIONS: Record<string, string> = {
  talk: 'by',
  tutorial: 'by',
  workshop: 'with',
  webinar: 'with',
  panel: 'with',
  meetup: 'with',
  interview: 'with',
  qna: 'with',
  keynote: 'by',
  roundtable: 'with',
};

/**
 * Returns the display label for an event format code.
 * Falls back to the raw format string if no mapping exists.
 */
export function getFormatLabel(format: string | undefined): string | undefined {
  if (!format) return undefined;
  return FORMAT_LABELS[format] || format;
}

/**
 * Returns the preposition for an event format code.
 * Defaults to "by" if no mapping exists.
 */
export function getFormatPreposition(format: string | undefined): string {
  if (!format) return 'by';
  return FORMAT_PREPOSITIONS[format] || 'by';
}
