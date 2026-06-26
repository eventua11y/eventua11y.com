import dayjs from 'dayjs';
import type { PortableTextBlock } from '@portabletext/types';
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

// ── Meta description helpers ───────────────────────────────────────────

/**
 * Extracts plain text from an array of Portable Text blocks.
 *
 * Concatenates the text spans of every text block, joining separate
 * blocks with a space and collapsing runs of whitespace. Non-block
 * content (images, embeds, etc.) is ignored.
 *
 * @param blocks - Portable Text blocks (e.g. an event's richDescription)
 * @returns A single normalised plain-text string (empty if no text)
 */
export function portableTextToPlainText(blocks?: PortableTextBlock[]): string {
  if (!Array.isArray(blocks)) return '';

  return blocks
    .filter(
      (block): block is PortableTextBlock =>
        block?._type === 'block' && Array.isArray(block.children)
    )
    .map((block) =>
      (block.children as Array<{ text?: unknown }>)
        .map((child) => (typeof child.text === 'string' ? child.text : ''))
        .join('')
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Truncates text to a maximum length suitable for a meta description,
 * breaking on a word boundary where possible and appending an ellipsis.
 *
 * @param text - The source text to truncate
 * @param max - Maximum length before truncation (default 160)
 * @returns The truncated, whitespace-normalised string
 */
export function truncateForMeta(text: string, max = 160): string {
  const normalised = text.replace(/\s+/g, ' ').trim();
  if (normalised.length <= max) return normalised;

  const slice = normalised.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  // Prefer a word boundary, but only if it doesn't truncate too aggressively.
  const trimmed = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return trimmed.replace(/[\s.,;:!?–-]+$/, '') + '…';
}

/**
 * Builds the meta description for an event detail page.
 *
 * Prefers the event's own short `description`, falling back to plain
 * text extracted from its `richDescription`, and finally to a generic
 * title-based sentence. The result is truncated for SERP display so
 * each event gets a distinct, content-specific description rather than
 * the site-wide default.
 *
 * @param event - The event to describe
 * @returns A meta description string
 */
export function getEventMetaDescription(
  event: Pick<Event, 'title' | 'description' | 'richDescription'>
): string {
  const source =
    event.description?.trim() || portableTextToPlainText(event.richDescription);

  if (source) return truncateForMeta(source);

  return `${event.title} — a digital accessibility event on Eventua11y.`;
}

// ── Format display helpers ─────────────────────────────────────────────

/**
 * Maps event format codes to human-readable display labels.
 * Used by child event components and the event detail page.
 */
export const FORMAT_LABELS: Record<string, string> = {
  talk: 'talk',
  tutorial: 'tutorial',
  workshop: 'workshop',
  webinar: 'webinar',
  panel: 'panel',
  meetup: 'meetup',
  interview: 'interview',
  qna: 'Q&A',
  keynote: 'keynote',
  roundtable: 'roundtable',
  hackathon: 'hackathon',
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
  hackathon: 'with',
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
 * Capitalizes the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Returns the preposition for an event format code.
 * Defaults to "by" if no mapping exists.
 */
export function getFormatPreposition(format: string | undefined): string {
  if (!format) return 'by';
  return FORMAT_PREPOSITIONS[format] || 'by';
}
