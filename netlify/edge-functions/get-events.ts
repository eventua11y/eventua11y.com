/**
 * Edge function to fetch events from Sanity CMS
 * Handles caching, data transformation and API response
 */

import { createClient, SanityClient } from 'https://esm.sh/@sanity/client';
import dayjs from 'https://esm.sh/dayjs';

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

  console.log('Environment Variables:', {
    SANITY_PROJECT: projectId,
    SANITY_DATASET: dataset,
    SANITY_API_VERSION: apiVersion,
    SANITY_CDN: useCdn,
  });

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
 * @returns {EventsResponse} Processed events object
 */
async function fetchEventsFromSanity(
  client: SanityClient
): Promise<EventsResponse> {
  try {
    const events: Event[] = await client.fetch(`
      *[_type == "event" && !(_id in path("drafts.**"))]
    `);

    // Fetch children for each event
    const eventsWithChildren = await Promise.all(
      events.map(async (event) => {
        const children: Event[] = await client.fetch(
          `
        *[_type == "event" && parent._ref == $eventId] | order(dateStart asc)
      `,
          { eventId: event._id }
        );

        return {
          ...event,
          children: children.length > 0 ? children : undefined,
        };
      })
    );

    const now = new Date();
    const todayStart = dayjs().startOf('day').toDate();
    const todayEnd = dayjs().endOf('day').toDate();

    return {
      events: eventsWithChildren,
      future: sortEventsByDate(
        eventsWithChildren.filter(
          (event) => new Date(event.dateStart) > now && !event.parent
        )
      ),
      past: eventsWithChildren.filter(
        (event) => new Date(event.dateEnd) < now && !event.parent
      ),
      today: sortEventsByDate(
        eventsWithChildren.filter(
          (event) =>
            new Date(event.dateStart) >= todayStart &&
            new Date(event.dateStart) <= todayEnd &&
            !event.parent
        )
      ),
    };
  } catch (error) {
    console.error('[fetchEventsFromSanity] Failed:', error?.message || error);
    throw new Error('Failed to fetch events from Sanity');
  }
}

/**
 * Gets events with caching
 * Returns cached data if valid, otherwise fetches fresh data
 * @returns {EventsResponse} Events object
 */
async function getEvents(): Promise<EventsResponse> {
  const client = createSanityClient();

  // Check cache
  if (cache.data && Date.now() - cache.timestamp < cache.ttl) {
    console.log('Returning cached data');
    return cache.data;
  }

  // Fetch from Sanity
  const events = await fetchEventsFromSanity(client);

  // Update cache
  cache.data = events;
  cache.timestamp = Date.now();

  return events;
}

/**
 * Edge function handler
 * Serves events API endpoint with caching headers
 * @param {Request} request - HTTP request object
 * @returns {Response} JSON response with events data
 */
export default async function handler(request: Request): Promise<Response> {
  try {
    const events = await getEvents();

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
