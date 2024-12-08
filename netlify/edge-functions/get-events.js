import { createClient } from 'https://esm.sh/@sanity/client';
import dayjs from 'https://esm.sh/dayjs';

// In-memory cache
let cache = {
  data: null,
  timestamp: 0,
  ttl: 300000 // 5 minutes in milliseconds
};

// Get Sanity config from environment variables
function getConfig() {

  const projectId = Deno.env.get('SANITY_PROJECT');
  const dataset = Deno.env.get('SANITY_DATASET');
  const apiVersion = Deno.env.get('SANITY_API_VERSION');
  const useCdn = Deno.env.get('SANITY_CDN');

  console.log('Environment Variables:', {
    SANITY_PROJECT: projectId,
    SANITY_DATASET: dataset,
    SANITY_API_VERSION: apiVersion,
    SANITY_CDN: useCdn,
  });

  return {
    projectId,
    dataset,
    apiVersion,
    useCdn: true
  };
}

// Initialize Sanity client
function createSanityClient() {
  try {
    const config = getConfig();
    return createClient(config);
  } catch (error) {
    console.error('Failed to create Sanity client:', error);
    throw new Error('Sanity client initialization failed');
  }
}

// Utility functions
function sortEventsByDate(events) {
  return events.sort((a, b) => 
    new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime()
  );
}

async function fetchEventsFromSanity(client) {
  try {
    const events = await client.fetch(`
      *[_type == "event" && !(_id in path("drafts.**"))]
    `);

    // Fetch children for each event
    const eventsWithChildren = await Promise.all(events.map(async (event) => {
      const children = await client.fetch(`
        *[_type == "event" && parent._ref == $eventId] | order(dateStart asc)
      `, { eventId: event._id });

      return {
        ...event,
        children: children.length > 0 ? children : undefined
      };
    }));

    const now = new Date();
    const todayStart = dayjs().startOf('day').toDate();
    const todayEnd = dayjs().endOf('day').toDate();
    
    return {
      events: eventsWithChildren,
      future: sortEventsByDate(
        eventsWithChildren.filter(event => 
          new Date(event.dateStart) > now && !event.parent
        )
      ),
      past: eventsWithChildren.filter(event => 
        new Date(event.dateEnd) < now && !event.parent
      ),
      today: sortEventsByDate(
        eventsWithChildren.filter(event => 
          new Date(event.dateStart) >= todayStart && new Date(event.dateStart) <= todayEnd && !event.parent
        )
      ),
    };
  } catch (error) {
    console.error('[fetchEventsFromSanity] Failed:', error?.message || error);
    throw new Error('Failed to fetch events from Sanity');
  }
}

async function getEvents() {
  const client = createSanityClient();

  // Check cache
  if (cache.data && (Date.now() - cache.timestamp < cache.ttl)) {
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

export default async function handler(request) {
  try {
    const events = await getEvents();
    
    return new Response(JSON.stringify(events), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
        'Vary': 'Accept-Encoding',
      },
    });
  } catch (error) {
    console.error('[handler] Failed:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export const config = { path: '/get-events' };