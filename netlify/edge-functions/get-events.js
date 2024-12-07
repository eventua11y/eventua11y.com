import { createClient } from 'https://esm.sh/@sanity/client';

console.log("Envars:", Netlify.env.toObject());

const client = createClient({
  projectId: Netlify.env.get('SANITY_PROJECT'),
  dataset: Netlify.env.get('SANITY_DATASET'),
  useCdn: Netlify.env.get('SANITY_CDN'),
  apiVersion: '2024-12-07',
});

async function getEvents() {
  try {
    const events = await client.fetch(
      '*[_type == "event" && !(_id in path("drafts.**"))]',
    );

    const allEvents = await Promise.all(
      events.map(async (event) => {
        const children = await client.fetch(
          '*[_type == "event" && parent._ref == $eventId] | order(dateStart asc)',
          { eventId: event._id },
        );

        return {
          ...event,
          ...(children.length > 0 && { children }),
        };
      }),
    );

    const futureEvents = allEvents
      .filter((event) => {
        const eventDate = new Date(event.dateStart);
        const currentDate = new Date();
        return eventDate > currentDate && !event.parent;
      })
      .sort((a, b) => new Date(a.dateStart) - new Date(b.dateStart));

    return {
      events: allEvents,
      future: futureEvents,
      past: allEvents.filter((event) => {
        const eventDate = new Date(event.dateStart);
        const currentDate = new Date();
        return eventDate < currentDate && !event.parent;
      }),
    };
  } catch (error) {
    console.error("Failed to fetch events", error);
    throw new Error("Failed to fetch events");
  }
}

export default async (request) => {
  try {
    const events = await getEvents();
    return new Response(JSON.stringify(events), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response("Error fetching events", { status: 500 });
  }
};

export const config = { path: "/get-events" };