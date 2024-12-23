/**
 * Edge function to fetch events from Sanity CMS
 * Handles caching, data transformation and API response
 */

import { createClient, SanityClient } from 'https://esm.sh/@sanity/client';
import dayjs from 'https://esm.sh/dayjs';
import utc from 'https://esm.sh/dayjs/plugin/utc';
import timezone from 'https://esm.sh/dayjs/plugin/timezone';
import isBetween from 'https://esm.sh/dayjs/plugin/isBetween';
import isSameOrBefore from 'https://esm.sh/dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'https://esm.sh/dayjs/plugin/isSameOrAfter';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

interface Event {
  _id: string;
  _type: string;
  dateStart: string;
  dateEnd: string;
  parent?: { _ref: string };
  children?: Event[];
}

interface EventsResponse {
  events: Event[];
  future: Event[];
  past: Event[];
  today: Event[];
  debug?: Array<{
    eventId: string;
    eventTitle: string;
    eventStart: string;
    eventEnd: string;
    userToday: string;
    isToday: boolean;
    isInternational: boolean;
  }>;
}

/**
 * In-memory cache configuration
 * Caches events data for 5 minutes to reduce API calls
 */
let cache = {
  data: null as EventsResponse | null,
  timestamp: 0,
  ttl: 300000, // 5 minutes in milliseconds
};

/**
 * Gets Sanity configuration from environment variables
 * @returns {Object} Sanity client configuration
 */
function getConfig() {
  const projectId = Deno.env.get('SANITY_PROJECT');
  const dataset = Deno.env.get('SANITY_DATASET');
  const apiVersion = Deno.env.get('SANITY_API_VERSION');
  const useCdn = Deno.env.get('SANITY_CDN') === 'true';

  return {
    projectId: projectId || '',
    dataset: dataset || '',
    apiVersion: apiVersion || '2021-03-25',
    useCdn,
  };
}

/**
 * Creates and configures Sanity client
 * @returns {SanityClient} Configured Sanity client
 * @throws {Error} If client initialization fails
 */
function createSanityClient(): SanityClient {
  try {
    const config = getConfig();
    return createClient(config);
  } catch (error) {
    console.error('Failed to create Sanity client:', error);
    throw new Error('Sanity client initialization failed');
  }
}

/**
 * Sorts events array by start date
 * @param {Event[]} events - Array of event objects
 * @returns {Event[]} Sorted events array
 */
function sortEventsByDate(events: Event[]): Event[] {
  return events.sort(
    (a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime()
  );
}

/**
 * Fetches events from Sanity and processes them
 * - Fetches all non-draft events
 * - Fetches child events for each parent
 * - Separates into future, past, and today's events
 * @param {SanityClient} client - Sanity client
 * @param {string} userTimezone - User's timezone
 * @returns {EventsResponse} Processed events object
 */
async function fetchEventsFromSanity(
  client: SanityClient,
  userTimezone: string
): Promise<EventsResponse> {
  const debugLogs = [];

  try {
    // Fetch all non-draft events
    const events: Event[] = await client.fetch(`
      *[_type == "event" && !(_id in path("drafts.**"))]
    `);

    // Fetch children for each event and add CFS deadline events
    const eventsWithChildrenAndDeadlines = await Promise.all(
      events.map(async (event) => {
        // Fetch child events for each parent event
        const children: Event[] = await client.fetch(
          `
        *[_type == "event" && parent._ref == $eventId] | order(dateStart asc)
      `,
          { eventId: event._id }
        );

        // Add children to the event if any
        const eventWithChildren = {
          ...event,
          children: children.length > 0 ? children : undefined,
        };

        // Add CFS (Call for Speakers) deadline event if applicable
        const cfsDeadlineEvents: Event[] = [];
        if (event.callForSpeakersClosingDate) {
          cfsDeadlineEvents.push({
            _id: `${event._id}-cfs-deadline`,
            _type: 'event',
            type: 'deadline',
            title: `${event.title}`,
            dateStart: event.callForSpeakersClosingDate,
            timezone: event.timezone,
            website: event.website,
            attendanceMode: event.attendanceMode,
            callForSpeakers: event.callForSpeakers,
          });
        }

        // Return the event with children and CFS deadline events
        return [eventWithChildren, ...cfsDeadlineEvents];
      })
    );

    // Flatten the array of events
    const flattenedEvents = eventsWithChildrenAndDeadlines.flat();

    // Use user's timezone for base calculations
    const now = dayjs().tz(userTimezone);
    const todayStart = now.startOf('day');
    const todayEnd = now.endOf('day');

    // Helper function to convert event time to user's timezone
    const getEventTimeInUserTz = (dateStr: string, eventTz?: string) => {
      if (!eventTz) {
        // For international events, preserve the date but use user's timezone
        return dayjs.utc(dateStr).tz(userTimezone, true);
      }
      // For location-specific events, properly convert the time
      return dayjs(dateStr).tz(eventTz).tz(userTimezone);
    };

    // Helper function to check if event is happening today
    const isEventToday = (event: Event): boolean => {
      const userToday = dayjs().tz(userTimezone).startOf('day');

      if (!event.timezone) {
        const eventStart = dayjs(event.dateStart).startOf('day');
        const isSingleDayEvent = !event.dateEnd;
        const eventEnd = isSingleDayEvent
          ? eventStart
          : dayjs(event.dateEnd).startOf('day');

        // Simplified logic for single day events
        const isToday = isSingleDayEvent
          ? eventStart.isSame(userToday, 'day')
          : eventStart.isSame(userToday, 'day') ||
            eventEnd.isSame(userToday, 'day') ||
            (eventStart.isBefore(userToday, 'day') &&
              eventEnd.isAfter(userToday, 'day'));

        if (!eventEnd.isBefore(userToday)) {
          debugLogs.push({
            eventId: event._id,
            eventTitle: event.title,
            rawStartDate: event.dateStart,
            rawEndDate: event.dateEnd || 'No end date (single day event)',
            isSingleDayEvent,
            eventStart: eventStart.format('YYYY-MM-DD'),
            eventEnd: eventEnd.format('YYYY-MM-DD'),
            userToday: userToday.format('YYYY-MM-DD'),
            isToday,
            isInternational: true,
          });
        }

        return isToday;
      }

      // For location-specific events, check if any part overlaps with today
      const eventStart = dayjs(event.dateStart).tz(event.timezone);
      const eventEnd = dayjs(event.dateEnd || event.dateStart).tz(
        event.timezone
      );

      return eventStart.isBefore(todayEnd) && eventEnd.isAfter(todayStart);
    };

    const today = sortEventsByDate(
      flattenedEvents.filter((event) => !event.parent && isEventToday(event))
    );

    const future = sortEventsByDate(
      flattenedEvents.filter((event) => {
        if (!event.parent) {
          const eventStart = getEventTimeInUserTz(
            event.dateStart,
            event.timezone
          );
          return eventStart.isAfter(todayEnd);
        }
        return false;
      })
    );

    const past = flattenedEvents.filter((event) => {
      if (!event.parent) {
        const eventEnd = getEventTimeInUserTz(
          event.dateEnd || event.dateStart,
          event.timezone
        );
        return eventEnd.isBefore(todayStart);
      }
      return false;
    });

    return {
      events: flattenedEvents,
      future,
      past,
      today,
      debug: debugLogs,
    };
  } catch (error) {
    console.error('[fetchEventsFromSanity] Failed:', error?.message || error);
    throw new Error('Failed to fetch events from Sanity');
  }
}

/**
 * Gets events with caching
 * Returns cached data if valid, otherwise fetches fresh data
 * @param {string} userTimezone - User's timezone
 * @returns {EventsResponse} Events object
 */
async function getEvents(userTimezone: string): Promise<EventsResponse> {
  const client = createSanityClient();

  // Check cache
  if (cache.data && Date.now() - cache.timestamp < cache.ttl) {
    console.log('[getEvents] Returning cached data');
    console.log(
      '[getEvents] Cache timestamp:',
      new Date(cache.timestamp).toISOString()
    );
    console.log('[getEvents] Cache TTL (ms):', cache.ttl);
    return cache.data;
  }

  // Fetch from Sanity
  console.log('[getEvents] Fetching fresh data from Sanity');
  const events = await fetchEventsFromSanity(client, userTimezone);

  // Update cache
  cache.data = events;
  cache.timestamp = Date.now();
  console.log(
    '[getEvents] Cache updated at:',
    new Date(cache.timestamp).toISOString()
  );

  return events;
}

/**
 * Edge function handler
 * Serves events API endpoint with caching headers
 * @param {Request} request - HTTP request object
 * @returns {Response} JSON response with events data
 */
export default async function handler(
  request: Request,
  context: Context
): Promise<Response> {
  console.log('[handler] Received request:', request);
  try {
    // Get the base URL from the current request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    console.log('[handler] Fetching user info...');
    // Use absolute URL for the user info request
    const userInfoResponse = await fetch(`${baseUrl}/api/get-user-info`);
    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info');
    }
    const userInfo = await userInfoResponse.json();
    const userTimezone = userInfo.timezone || 'UTC';

    console.log('[handler] Fetching events...');
    const events = await getEvents(userTimezone);
    console.log('[handler] Events fetched successfully:', events.events.length);

    return new Response(JSON.stringify(events), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
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
