/**
 * Edge function to fetch and process events from Sanity CMS
 * - Handles timezone conversion for international/local events
 * - Manages event classification (today/future/past)
 * - Implements caching to reduce API calls
 */

import type { Config, Context } from 'https://edge.netlify.com/v1/index.ts';
import { PARENT_EVENTS_QUERY, CHILD_EVENTS_QUERY } from './lib/queries.ts';
import { assembleEvents, type AssemblableEvent } from './lib/assembleEvents.ts';
import { classifyEvents } from './lib/classifyEvents.ts';
import { createSanityClient } from './lib/sanity-client.ts';

type SanityClient = ReturnType<typeof createSanityClient>;

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
  day?: boolean;
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
  return classifyEvents(rawEvents, userTimezone);
}

function getViewerTimezone(request: Request, fallback: string): string {
  const timezone = request.headers.get('X-Event-Timezone');
  if (!timezone || timezone.length > 100) return fallback;

  try {
    return new Intl.DateTimeFormat('en', {
      timeZone: timezone,
    }).resolvedOptions().timeZone;
  } catch {
    // Ignore invalid client input and use the geolocation fallback.
    return fallback;
  }
}

/**
 * Edge function handler
 * - Uses the browser timezone, falling back to Netlify geolocation or UTC
 * - Fetches and processes events
 * - Sets caching headers
 * @param {Request} request - HTTP request object
 * @returns {Response} JSON response with today, future, and past events
 */
export default async function handler(
  request: Request,
  context: Context
): Promise<Response> {
  try {
    const userTimezone = getViewerTimezone(
      request,
      context.geo?.timezone || 'UTC'
    );

    console.log('[handler] Fetching events...');
    const events = await getEvents(userTimezone);
    console.log('[handler] Events fetched successfully');

    return new Response(JSON.stringify(events), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=60',
        Vary: 'Accept-Encoding, X-Event-Timezone',
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
export const config: Config = { path: '/api/get-events' };
