/**
 * Deterministic fixtures shared by the benchmark suites.
 *
 * Benchmarks must measure the same amount of work on every run, so the
 * data here is generated from a seeded pseudo-random sequence and from
 * fixed dates rather than the real clock.
 */

import type { Event, Book } from '../src/types/event';
import type { AssemblableEvent } from '../netlify/edge-functions/lib/assembleEvents';

/** Fixed reference point used instead of "now" so results are stable. */
export const NOW_ISO = '2026-03-08T12:00:00Z';

const TIMEZONES = [
  undefined,
  'Europe/London',
  'America/New_York',
  'Australia/Sydney',
  'Europe/Berlin',
];

const TYPES = ['conference', 'meetup', 'theme', 'deadline', 'workshop'];

const FORMATS = ['talk', 'workshop', 'panel', 'keynote', 'qna'];

/**
 * Small linear congruential generator: deterministic across runs and
 * platforms, unlike Math.random().
 */
function createRandom(seed = 1337): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

function pick<T>(random: () => number, values: T[]): T {
  return values[Math.floor(random() * values.length)];
}

/** ISO string for `days` days (and `hours` hours) after the fixed epoch. */
function isoOffset(days: number, hours = 0): string {
  const base = Date.UTC(2026, 0, 1, 9, 0, 0);
  return new Date(base + days * 86_400_000 + hours * 3_600_000).toISOString();
}

/**
 * Portable Text blocks that look like a real event description:
 * a few paragraphs plus a non-text block that must be skipped.
 */
export function makeRichDescription(paragraphs = 4): unknown[] {
  const blocks: unknown[] = [];
  for (let i = 0; i < paragraphs; i++) {
    blocks.push({
      _type: 'block',
      style: 'normal',
      children: [
        { _type: 'span', text: `Paragraph ${i} about accessibility. ` },
        { _type: 'span', text: 'It covers   screen readers, keyboard ' },
        { _type: 'span', text: 'navigation and colour contrast in depth.\n' },
      ],
    });
  }
  blocks.push({ _type: 'image', asset: { _ref: 'image-abc' } });
  return blocks;
}

/** Start and end dates for a generated event, some of them open-ended. */
function makeEventDates(
  random: () => number,
  isAllDay: boolean
): { dayOffset: number; dateStart: string; dateEnd?: string } {
  const dayOffset = Math.floor(random() * 365);
  const hasEnd = random() < 0.8;
  const extraDays = isAllDay ? Math.floor(random() * 4) : 0;

  return {
    dayOffset,
    dateStart: isoOffset(dayOffset, Math.floor(random() * 12)),
    dateEnd: hasEnd ? isoOffset(dayOffset + extraDays, 3) : undefined,
  };
}

/** Descriptions for a generated event: short, rich, both or neither. */
function makeEventText(
  random: () => number,
  index: number,
  type: string
): { description?: string; richDescription?: Event['richDescription'] } {
  const hasDescription = random() < 0.5;
  const hasRichDescription = random() < 0.5;

  return {
    description: hasDescription
      ? `A ${type} about digital accessibility, session ${index}.`
      : undefined,
    richDescription: hasRichDescription
      ? (makeRichDescription() as Event['richDescription'])
      : undefined,
  };
}

/** A single generated event in the shape the event list renders. */
function makeEvent(random: () => number, index: number): Event {
  const isAllDay = random() < 0.3;
  const type = pick(random, TYPES);
  const { dayOffset, dateStart, dateEnd } = makeEventDates(random, isAllDay);

  return {
    _id: `event-${index}`,
    _type: 'event',
    type,
    title: `Accessibility event number ${index}`,
    slug: { current: `accessibility-event-${index}` },
    ...makeEventText(random, index, type),
    dateStart,
    dateEnd,
    timezone: pick(random, TIMEZONES),
    day: isAllDay,
    callForSpeakers: random() < 0.4,
    callForSpeakersClosingDate: isoOffset(dayOffset - 30),
    attendanceMode: pick(random, ['online', 'offline']),
    isFree: random() < 0.5,
    format: pick(random, FORMATS),
  };
}

/**
 * Builds a list of events spread across a year, mixing timezones,
 * all-day events, themes, deadlines and calls for speakers. This mirrors
 * the payload the event list renders on the home page.
 */
export function makeEvents(count = 250): Event[] {
  const random = createRandom();
  return Array.from({ length: count }, (_, i) => makeEvent(random, i));
}

/** Book club entries, which are grouped alongside events in the lists. */
export function makeBooks(count = 20): Book[] {
  const random = createRandom(99);
  return Array.from({ length: count }, (_, i) => ({
    _id: `book-${i}`,
    _type: 'book' as const,
    title: `Book club pick ${i}`,
    dateStart: isoOffset(Math.floor(random() * 365)),
  }));
}

/**
 * Parent/child event pairs in the shape the edge function receives them
 * from Sanity, before assembly.
 */
export function makeAssemblableEvents(
  parentCount = 120,
  childrenPerParent = 6
): { parents: AssemblableEvent[]; children: AssemblableEvent[] } {
  const random = createRandom(4242);
  const parents: AssemblableEvent[] = [];
  const children: AssemblableEvent[] = [];

  for (let i = 0; i < parentCount; i++) {
    const day = Math.floor(random() * 365);
    parents.push({
      _id: `parent-${i}`,
      _type: 'event',
      type: 'conference',
      title: `Conference ${i}`,
      dateStart: isoOffset(day),
      timezone: 'Europe/London',
      website: `https://example.com/conference-${i}`,
      attendanceMode: 'online',
      callForSpeakers: random() < 0.5,
      // Half of the closing dates are in the past relative to the real
      // clock, which exercises both branches of the CFS deadline logic.
      callForSpeakersClosingDate: isoOffset(day - 45),
    });

    for (let j = 0; j < childrenPerParent; j++) {
      children.push({
        _id: `child-${i}-${j}`,
        _type: 'event',
        type: 'talk',
        title: `Talk ${j} at conference ${i}`,
        dateStart: isoOffset(day, j),
        parent: { _ref: `parent-${i}` },
      });
    }
  }

  return { parents, children };
}
