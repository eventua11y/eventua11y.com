import { createClient } from 'https://esm.sh/@sanity/client';
import getEnvar from './envar.js';

const envar = getEnvar();

const sanityClient = createClient({
  projectId: envar.SANITY_PROJECT_ID,
  token: envar.SANITY_TOKEN,
  dataset: envar.SANITY_DATASET,
  apiVersion: envar.SANITY_API_VERSION,
});

async function getEvents() {
  try {
    // Fetch all events from Sanity
    const events = await sanityClient.fetch(
      '*[_type == "event" && !(_id in path("drafts.**"))]'
    );
    // Add children to those events, if they exist
    const eventsWithChildren = events.map(async (event) => {
      // Find children of this event, sorted by dateStart in ascending order
      const children = await sanityClient.fetch(
        '*[_type == "event" && parent._ref == $eventId] | order(dateStart asc)',
        { eventId: event._id }
      );
      // Return the event with its children, if it has any
      return {
        ...event,
        ...(children.length > 0 && { children }),
      };
    });
    // Wait for all events to be processed and return the events with their children
    return Promise.all(eventsWithChildren);
    // Throw an error if we fail to fetch events
  } catch (error) {
    console.error(error);
    throw new Error('Failed to fetch events');
  }
}

export default function () {
  return getEvents();
}
