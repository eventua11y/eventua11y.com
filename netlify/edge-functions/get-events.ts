/**
 * Edge function to fetch and process events from Sanity CMS
 * - Handles timezone conversion for international/local events
 * - Manages event classification (today/future/past)
 * - Implements caching to reduce API calls
 */

import type { SanityClient } from 'https://esm.sh/@sanity/client';
import dayjs from 'https://esm.sh/dayjs';
import utc from 'https://esm.sh/dayjs/plugin/utc';
import timezone from 'https://esm.sh/dayjs/plugin/timezone';
import { PARENT_EVENTS_QUERY, CHILD_EVENTS_QUERY } from './lib/queries.ts';
import { assembleEvents, type AssemblableEvent } from './lib/assembleEvents.ts';
import { createSanityClient } from './lib/sanity-client.ts';
import { compareByDateAsc } from '../../src/utils/eventUtils.ts';

dayjs.extend(utc);
dayjs.extend(timezone);

interface Event {
  _id: string;
  _type: string;
  title: string;
  dateStart: string;
  dateEnd?: string;
  parent?: { _ref: string };
  children?: Event[];
  callForSpeakersClosingDate?: string;
  timezone?: string;
  website?: string;
  attendanceMode?: string;
  callForSpeakers?: boolean;
  type?: string;
  speakers?: Array<{
    _id: string;
    name: string;
  }>;
}

/**
 * Response structure for the events API
 */
interface EventsResponse {
  future: Event[];
  past: Event[];
  today: Event[];
}

/**
 * Cache configuration to reduce Sanity API calls
 * - Stores raw event data (before timezone processing) for 5 minutes
 * - Timezone processing happens per-request to ensure correct user timezone
 * - Includes timestamp for TTL calculation
 */
interface RawEventsCache {
  events: Event[];
  timestamp: number;
  ttl: number;
}

const cache: RawEventsCache = {
  events: [],
  timestamp: 0,
  ttl: 300000, // 5 minutes in milliseconds
};

/**
 * Processes raw events for a specific user timezone
 * - Converts dates to user's timezone
 * - Categorizes events as today/future/past
 * @param {Event[]} events - Raw events from cache or Sanity
 * @param {string} userTimezone - User's timezone
 * @returns {EventsResponse} Processed events categorized by time
 */
function processEventsForTimezone(
  events: Event[],
  userTimezone: string
): EventsResponse {
  try {
    // Use user's timezone for base calculations
    const now = dayjs().tz(userTimezone);
    const todayStart = now.startOf('day');
    const todayEnd = now.endOf('day');

    // The user's current calendar day, used to classify local (timezoned)
    // events by the day they are displayed on rather than by absolute-instant
    // overlap. This prevents an event that has already ended in its own
    // timezone from leaking into an adjacent day in the user's timezone.
    const userTodayDay = now.format('YYYY-MM-DD');

    /**
     * Returns the calendar day (YYYY-MM-DD) an event date falls on in the
     * timezone it is displayed in. Local events (with a timezone) are shown
     * in their own timezone by default, so their day is computed there.
     */
    const eventDay = (dateStr: string, eventTz: string) =>
      dayjs(dateStr).tz(eventTz).format('YYYY-MM-DD');

    /**
     * Converts an international event date to the user's timezone while
     * preserving its calendar date.
     */
    const getEventTimeInUserTz = (dateStr: string) =>
      dayjs.utc(dateStr).tz(userTimezone, true);

    /**
     * Determines if event is happening today
     * Deadlines follow the same rules, so they land in exactly one of
     * today / future / past:
     * 1. International events (no timezone):
     *    - Single day: Must match user's today
     *    - Multi-day: Must overlap with user's today
     * 2. Local events (with timezone):
     *    - Must overlap with user's today considering timezone
     */
    const isEventToday = (event: Event): boolean => {
      const userToday = dayjs().tz(userTimezone).startOf('day');

      if (!event.timezone) {
        // For international events, use user's timezone but only compare dates
        const eventStart = dayjs
          .tz(event.dateStart, userTimezone)
          .startOf('day');
        const isSingleDayEvent = !event.dateEnd;
        const eventEnd = isSingleDayEvent
          ? eventStart
          : dayjs.tz(event.dateEnd, userTimezone).startOf('day');

        // Simplified logic for single day events
        const isToday = isSingleDayEvent
          ? eventStart.isSame(userToday, 'day')
          : eventStart.isSame(userToday, 'day') ||
            eventEnd.isSame(userToday, 'day') ||
            (eventStart.isBefore(userToday, 'day') &&
              eventEnd.isAfter(userToday, 'day'));

        return isToday;
      }

      // For local events (with a timezone), compare calendar days in the
      // event's own timezone — which is how the dates are displayed by default
      // (useLocalTimezone is off) — against the user's current calendar day.
      //
      // Using absolute-instant overlap here misclassifies events that have
      // already ended in their own timezone but spill a few minutes past
      // midnight in the user's timezone. For example, an event ending
      // 2026-06-25T23:59Z (16:59 PT on June 25) lands at 00:59 BST on June 26,
      // wrongly appearing in a London user's "Today" the day after it ended.
      const eventStartDay = eventDay(event.dateStart, event.timezone);
      const eventEndDay = event.dateEnd
        ? eventDay(event.dateEnd, event.timezone)
        : eventStartDay; // Single-day event when no end date

      const isToday =
        userTodayDay >= eventStartDay && userTodayDay <= eventEndDay;

      return isToday;
    };

    const today = events
      .filter((event) => !event.parent && isEventToday(event))
      .sort(compareByDateAsc);

    const future = events
      .filter((event) => {
        if (!event.parent) {
          // Local events: classify by their displayed calendar day so the
          // future/today/past buckets stay consistent with the today logic.
          if (event.timezone) {
            return eventDay(event.dateStart, event.timezone) > userTodayDay;
          }
          const eventStart = getEventTimeInUserTz(event.dateStart);
          return eventStart.isAfter(todayEnd);
        }
        return false;
      })
      .sort(compareByDateAsc);

    // Calculate the date 12 months ago from today
    const twelveMonthsAgo = todayStart.subtract(12, 'month');
    const twelveMonthsAgoDay = twelveMonthsAgo.format('YYYY-MM-DD');

    const past = events.filter((event) => {
      if (!event.parent && event.dateStart) {
        // Local events: classify by their displayed calendar day (see above).
        if (event.timezone) {
          const endDay = eventDay(
            event.dateEnd || event.dateStart,
            event.timezone
          );
          return endDay < userTodayDay && endDay >= twelveMonthsAgoDay;
        }
        const eventEnd = getEventTimeInUserTz(event.dateEnd || event.dateStart);
        // Only include events from the last 12 months
        return (
          eventEnd.isBefore(todayStart) && eventEnd.isAfter(twelveMonthsAgo)
        );
      }
      return false;
    });

    return {
      future,
      past,
      today,
    };
  } catch (error) {
    console.error(
      '[processEventsForTimezone] Failed:',
      (error as unknown as { message?: string })?.message || error
    );
    throw new Error('Failed to process events for timezone', { cause: error });
  }
}

/**
 * Fetches raw events from Sanity with caching
 * Returns cached raw events if valid, otherwise fetches fresh data
 * Raw events are not yet processed for timezone
 */
async function getRawEvents(client: SanityClient): Promise<Event[]> {
  // Check cache
  if (cache.events.length > 0 && Date.now() - cache.timestamp < cache.ttl) {
    console.log('[getRawEvents] Returning cached raw events');
    console.log(
      '[getRawEvents] Cache timestamp:',
      new Date(cache.timestamp).toISOString()
    );
    return cache.events;
  }

  console.log('[getRawEvents] Fetching fresh data from Sanity');

  // Fetch parent events and child events in two queries instead of N+1
  const [parentEvents, childEvents]: [AssemblableEvent[], AssemblableEvent[]] =
    await Promise.all([
      client.fetch(PARENT_EVENTS_QUERY),
      client.fetch(CHILD_EVENTS_QUERY),
    ]);

  const flattenedEvents = assembleEvents(parentEvents, childEvents) as Event[];

  // Update cache with raw events
  cache.events = flattenedEvents;
  cache.timestamp = Date.now();
  console.log(
    '[getRawEvents] Cache updated at:',
    new Date(cache.timestamp).toISOString()
  );

  return flattenedEvents;
}

/**
 * Gets events with caching and processes them for the user's timezone
 * Raw events are cached, but timezone processing happens per-request
 * @param {string} userTimezone - User's timezone
 * @returns {EventsResponse} Events object
 */
async function getEvents(userTimezone: string): Promise<EventsResponse> {
  const client = createSanityClient();

  // Get raw events (cached or fresh)
  const rawEvents = await getRawEvents(client);

  // Process events for user's timezone (always done per-request)
  console.log('[getEvents] Processing events for timezone:', userTimezone);
  return processEventsForTimezone(rawEvents, userTimezone);
}

/**
 * Edge function handler
 * - Gets user timezone from Netlify geo context
 * - Fetches and processes events
 * - Sets caching headers
 * @param {Request} _request - HTTP request object (unused)
 * @returns {Response} JSON response with today, future, and past events
 */
export default async function handler(
  _request: Request,
  context: Context
): Promise<Response> {
  try {
    // Use the context directly instead of making another request
    const userTimezone = context.geo?.timezone || 'UTC';

    console.log('[handler] Fetching events...');
    const events = await getEvents(userTimezone);
    console.log('[handler] Events fetched successfully');

    return new Response(JSON.stringify(events), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=60',
        Vary: 'Accept-Encoding',
      },
    });
  } catch (error) {
    console.error('[handler] Failed:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Edge function configuration
 * Defines API endpoint path
 */
export const config = { path: '/api/get-events' };
