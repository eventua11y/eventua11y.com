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
import dayjs from './dayjs';

import type { PortableTextBlock } from '@portabletext/types';
import type { Event, Book, Topic } from '../types/event';
import { compareByDateAsc, compareByDateDesc } from '../utils/eventUtils';
import {
  PARENT_EVENTS_QUERY,
  CHILD_EVENTS_QUERY,
  BOOKS_QUERY,
} from '../../netlify/edge-functions/lib/queries';
import {
  assembleEvents,
  type AssemblableEvent,
} from '../../netlify/edge-functions/lib/assembleEvents';

// ── Sanity client ──────────────────────────────────────────────────────

const sanityClient = createClient({
  projectId: import.meta.env.SANITY_PROJECT,
  dataset: import.meta.env.SANITY_DATASET,
  apiVersion: import.meta.env.SANITY_API_VERSION || '2021-03-25',
  useCdn: import.meta.env.SANITY_CDN === 'true',
});

/**
 * Returns the shared Sanity client instance.
 */
export function getSanityClient() {
  return sanityClient;
}

// ── Event queries (mirrors the edge function GROQ) ─────────────────────

interface RawEvent {
  _id: string;
  _type: string;
  type: string;
  title: string;
  slug?: { current: string };
  description?: string;
  richDescription?: PortableTextBlock[];
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
  organizer?: { _id: string; name: string; website?: string };
  topics?: Array<{
    _id: string;
    name: string;
    slug: { current: string };
    description?: string;
  }>;
}

/**
 * Fetches all events from Sanity and processes them into
 * future / past lists using UTC as the reference timezone.
 */
export async function getEvents(): Promise<{
  future: Event[];
  past: Event[];
}> {
  const client = sanityClient;

  const [parentEvents, childEvents]: [AssemblableEvent[], AssemblableEvent[]] =
    await Promise.all([
      client.fetch(PARENT_EVENTS_QUERY),
      client.fetch(CHILD_EVENTS_QUERY),
    ]);

  const allEvents = assembleEvents(parentEvents, childEvents) as Event[];

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
    .sort(compareByDateAsc);

  const past = allEvents
    .filter((event) => {
      if (event.parent) return false;
      if (!event.dateStart) return false;
      // Exclude deadline events from past events
      if (event.type === 'deadline') return false;
      const end = toUtc(event.dateEnd || event.dateStart, event.timezone);
      return end.isBefore(todayStart) && end.isAfter(twelveMonthsAgo);
    })
    .sort(compareByDateDesc);

  return { future, past };
}

// ── Single event query ─────────────────────────────────────────────────

/**
 * In-memory cache for single event lookups, keyed by slug.
 * Mirrors the 5-minute TTL caching strategy used by the
 * get-events and get-books edge functions to reduce Sanity API calls.
 */
const eventCache: Record<string, { data: Event | null; timestamp: number }> =
  {};
const EVENT_CACHE_TTL = 300000; // 5 minutes in milliseconds

/**
 * Fetches a single event by its slug, including resolved speakers
 * and child events. Returns null if no matching event is found.
 *
 * Results are cached in memory for 5 minutes per slug to reduce
 * Sanity API calls across requests within the same function instance.
 *
 * Child events (those with a parent reference) inherit attendanceMode
 * and location from their parent when their own values are not set.
 */
export async function getEventBySlug(slug: string): Promise<Event | null> {
  const cached = eventCache[slug];
  if (cached && Date.now() - cached.timestamp < EVENT_CACHE_TTL) {
    return cached.data;
  }

  const client = sanityClient;

  const event: RawEvent | null = await client.fetch(
    `
    *[_type == "event" && slug.current == $slug && !(_id in path("drafts.**"))][0] {
      ...,
      "website": coalesce(website, parent->website),
      "attendanceMode": coalesce(attendanceMode, parent->attendanceMode),
      "location": coalesce(location, parent->location),
      "parentEvent": parent->{ title, slug },
      "speakers": speakers[]->{ _id, name },
      "organizer": coalesce(organizer, parent->organizer)->{ _id, name, website },
      "topics": topics[]->{ _id, name, slug, description },
      "children": *[_type == "event" && parent._ref == ^._id && !(_id in path("drafts.**"))] {
        _id,
        title,
        slug,
        type,
        dateStart,
        dateEnd,
        timezone,
        day,
        website,
        format,
        scheduled,
        "speakers": speakers[]->{ _id, name }
      } | order(dateStart asc)
    }
  `,
    { slug }
  );

  if (!event) {
    eventCache[slug] = { data: null, timestamp: Date.now() };
    return null;
  }

  const result = {
    ...event,
    children:
      event.children && event.children.length > 0 ? event.children : undefined,
  } as Event;

  eventCache[slug] = { data: result, timestamp: Date.now() };
  return result;
}

// ── Topic queries ──────────────────────────────────────────────────────

/**
 * A topic as returned by `getTopics()`.
 * `eventCount` reflects upcoming events only — events where `dateEnd >= now()`
 * (when set) or `dateStart >= now()` (when `dateEnd` is absent). In-progress
 * multi-day events are included.
 */
interface TopicListItem {
  _id: string;
  name: string;
  slug: { current: string };
  description?: string;
  /** Number of upcoming (not yet ended) events referencing this topic. */
  eventCount: number;
}

/**
 * Fetches all published topics sorted alphabetically by name.
 * `eventCount` on each topic reflects upcoming events only — events where
 * `dateEnd >= now()` (when set) or `dateStart >= now()` (when `dateEnd` is
 * absent). In-progress multi-day events are included.
 */
export async function getTopics(): Promise<TopicListItem[]> {
  const client = getSanityClient();

  return client.fetch(`
    *[_type == "topic" && !(_id in path("drafts.**"))] {
      _id,
      name,
      slug,
      description,
      "eventCount": count(*[
        _type == "event" &&
        !(_id in path("drafts.**")) &&
        references(^._id) &&
        (
          (defined(dateEnd) && dateEnd >= now()) ||
          (!defined(dateEnd) && dateStart >= now())
        )
      ])
    } | order(name asc)
  `);
}

interface RawTopic {
  _id: string;
  name: string;
  slug: { current: string };
  description?: string;
  body: any[];
  events: Array<{
    _id: string;
    title: string;
    slug: { current: string };
    type: string;
    dateStart: string;
    dateEnd?: string;
    timezone?: string;
    day?: boolean;
    attendanceMode?: string;
    location?: string;
    isFree?: boolean;
  }>;
}

/**
 * Fetches a single topic by slug with its full body content and a list
 * of related events. Returns null if no matching topic is found.
 */
export async function getTopicBySlug(slug: string): Promise<
  | (Topic & {
      events: Event[];
    })
  | null
> {
  const client = getSanityClient();

  const topic: RawTopic | null = await client.fetch(
    `
    *[_type == "topic" && slug.current == $slug && !(_id in path("drafts.**"))][0] {
      _id,
      name,
      slug,
      description,
      body,
      "events": *[_type == "event" && !(_id in path("drafts.**")) && references(^._id)] {
        _id,
        title,
        slug,
        type,
        dateStart,
        dateEnd,
        timezone,
        day,
        attendanceMode,
        location,
        isFree
      } | order(dateStart desc)
    }
  `,
    { slug }
  );

  if (!topic) return null;

  return {
    ...topic,
    events: topic.events as Event[],
  };
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
  const client = sanityClient;

  const rawBooks: RawBook[] = await client.fetch(BOOKS_QUERY);

  return rawBooks.map((book) => ({
    _id: book._id,
    _type: 'book' as const,
    title: book.title,
    link: book.link,
    date: book.date,
    dateStart: book.date || '',
  }));
}
