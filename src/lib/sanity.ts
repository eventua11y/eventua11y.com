/**
 * Server-side Sanity client for fetching event data during Astro SSR.
 *
 * This module provides the same data that the Netlify edge functions serve
 * via /api/get-events and /api/get-books, but runs in the Astro SSR context
 * (Node.js on Netlify). It uses UTC as the fallback timezone since geo data
 * is not available during SSR.
 *
 * The primary consumer is the <noscript> server-rendered event list, which
 * gives search engines indexable event content.
 */

import { createClient } from '@sanity/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);

import type { Event, Book } from '../types/event';

// ── Sanity client ──────────────────────────────────────────────────────

function getSanityClient() {
  return createClient({
    projectId: import.meta.env.SANITY_PROJECT,
    dataset: import.meta.env.SANITY_DATASET,
    apiVersion: import.meta.env.SANITY_API_VERSION || '2021-03-25',
    useCdn: import.meta.env.SANITY_CDN === 'true',
  });
}

// ── Event queries (mirrors the edge function GROQ) ─────────────────────

interface RawEvent {
  _id: string;
  _type: string;
  type: string;
  title: string;
  description?: string;
  dateStart: string;
  dateEnd?: string;
  timezone?: string;
  day?: boolean;
  callForSpeakers?: boolean;
  callForSpeakersClosingDate?: string;
  attendanceMode?: string;
  location?: string;
  isFree?: boolean;
  website?: string;
  parent?: { _ref: string };
  children?: RawEvent[];
  isParent?: boolean;
  speakers?: Array<{ _id: string; name: string }>;
}

/**
 * Fetches all events from Sanity and processes them into
 * future / past lists using UTC as the reference timezone.
 */
export async function getEvents(): Promise<{
  future: Event[];
  past: Event[];
}> {
  const client = getSanityClient();

  const [parentEvents, childEvents]: [RawEvent[], RawEvent[]] =
    await Promise.all([
      client.fetch(`
        *[_type == "event" && !(_id in path("drafts.**")) && !defined(parent)] {
          ...,
          "speakers": speakers[]->{ _id, name }
        }
      `),
      client.fetch(`
        *[_type == "event" && !(_id in path("drafts.**")) && defined(parent)] {
          ...,
          "speakers": speakers[]->{ _id, name }
        } | order(dateStart asc)
      `),
    ]);

  // Group children by parent
  const childrenByParent: Record<string, RawEvent[]> = {};
  for (const child of childEvents) {
    const parentId = child.parent?._ref;
    if (parentId) {
      if (!childrenByParent[parentId]) childrenByParent[parentId] = [];
      childrenByParent[parentId].push(child);
    }
  }

  // Attach children + create CFS deadline events
  const allEvents: Event[] = [];
  for (const event of parentEvents) {
    const children = childrenByParent[event._id];
    allEvents.push({
      ...event,
      children: children && children.length > 0 ? children : undefined,
    } as Event);

    if (event.callForSpeakersClosingDate) {
      allEvents.push({
        _id: `${event._id}-cfs-deadline`,
        _type: 'event',
        type: 'deadline',
        title: event.title,
        dateStart: event.callForSpeakersClosingDate,
        timezone: event.timezone,
        website: event.website,
        attendanceMode: event.attendanceMode,
        callForSpeakers: event.callForSpeakers,
      } as Event);
    }
  }

  // Classify using UTC
  // The edge function splits events into today / future / past, then the
  // client merges today + future into "upcoming". We replicate that here by
  // including any event whose end-date (or start-date when no end-date)
  // has NOT yet passed — i.e. it is today or in the future.
  const now = dayjs.utc();
  const todayStart = now.startOf('day');
  const twelveMonthsAgo = todayStart.subtract(12, 'month');

  /**
   * Convert an event date to UTC for comparison.
   * - Events with a timezone: parse in the event's timezone, convert to UTC.
   * - International events (no timezone): treat the stored date as UTC.
   */
  const toUtc = (dateStr: string, eventTz?: string) => {
    if (!eventTz) return dayjs.utc(dateStr);
    return dayjs.tz(dateStr, eventTz).utc();
  };

  const future = allEvents
    .filter((event) => {
      if (event.parent) return false;
      if (!event.dateStart) return false;
      // An event is "upcoming" if it hasn't ended yet.
      // Use dateEnd when available (multi-day events), otherwise dateStart.
      const end = toUtc(event.dateEnd || event.dateStart, event.timezone);
      return end.isSameOrAfter(todayStart);
    })
    .sort(
      (a, b) =>
        new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime()
    );

  const past = allEvents
    .filter((event) => {
      if (event.parent) return false;
      if (!event.dateStart) return false;
      // Exclude deadline events from past events
      if (event.type === 'deadline') return false;
      const end = toUtc(event.dateEnd || event.dateStart, event.timezone);
      return end.isBefore(todayStart) && end.isAfter(twelveMonthsAgo);
    })
    .sort(
      (a, b) =>
        new Date(b.dateStart).getTime() - new Date(a.dateStart).getTime()
    );

  return { future, past };
}

// ── Book queries ───────────────────────────────────────────────────────

interface RawBook {
  _id: string;
  title: string;
  link?: string;
  date?: string;
}

/**
 * Fetches books from Sanity and normalises them into the Book type
 * expected by the event list components.
 */
export async function getBooks(): Promise<Book[]> {
  const client = getSanityClient();

  const rawBooks: RawBook[] = await client.fetch(`
    *[_type == "book"] | order(date desc) {
      _id,
      title,
      link,
      date
    }
  `);

  return rawBooks.map((book) => ({
    _id: book._id,
    _type: 'book' as const,
    title: book.title,
    link: book.link,
    date: book.date,
    dateStart: book.date || '',
  }));
}

// ── Grouping helpers ───────────────────────────────────────────────────

type ListItem = Event | Book;
type GroupedItems = Record<string, ListItem[]>;

/**
 * Groups events and books by year-month using UTC.
 * Returns entries sorted chronologically (ascending for upcoming,
 * descending for past).
 */
export function groupByMonth(
  events: Event[],
  books: Book[],
  type: 'upcoming' | 'past'
): GroupedItems {
  const items: ListItem[] =
    type === 'past' ? [...events] : [...events, ...books];

  // Sort chronologically first
  items.sort((a, b) => {
    const comparison =
      new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime();
    return type === 'past' ? -comparison : comparison;
  });

  // Group by YYYY-M
  const groups: GroupedItems = {};
  for (const item of items) {
    const d = dayjs.utc(item.dateStart);
    const key = `${d.year()}-${d.month() + 1}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  // Sort within each group: books first, then by date
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => {
      if ((a._type === 'book') === (b._type === 'book')) {
        const comparison =
          new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime();
        return type === 'past' ? -comparison : comparison;
      }
      return a._type === 'book' ? -1 : 1;
    });
  }

  // For upcoming: drop month groups that are in the past.
  // This mirrors the client-side EventList.vue behaviour (lines 140-155)
  // and prevents old books from appearing in the upcoming list.
  if (type !== 'past') {
    const now = dayjs.utc();
    const currentYear = now.year();
    const currentMonth = now.month() + 1; // dayjs months are 0-indexed
    for (const key of Object.keys(groups)) {
      const [year, month] = key.split('-').map(Number);
      if (
        year < currentYear ||
        (year === currentYear && month < currentMonth)
      ) {
        delete groups[key];
      }
    }
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
 * Formats a year-month key into a human-readable heading.
 * Uses UTC for consistency with the SSR context.
 */
export function formatMonthHeading(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // 0-indexed for Date constructor
  const date = new Date(year, month);

  const now = new Date();
  if (month === now.getMonth() && year === now.getFullYear()) {
    return 'This month';
  }

  const formatter = new Intl.DateTimeFormat('en', {
    month: 'long',
    year: year !== now.getFullYear() ? 'numeric' : undefined,
  });

  return formatter.format(date);
}
