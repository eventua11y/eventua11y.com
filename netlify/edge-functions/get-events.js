import { sanityClient } from "sanity:client";

async function getEvents() {
  try {
    // Fetch all events from Sanity
    const events = await sanityClient.fetch(
      '*[_type == "event" && !(_id in path("drafts.**"))]',
    );

    // Return the events with their children
    const allEvents = await Promise.all(
      events.map(async (event) => {
        // Find children of this event, sorted by dateStart in ascending order
        const children = await sanityClient.fetch(
          '*[_type == "event" && parent._ref == $eventId] | order(dateStart asc)',
          { eventId: event._id },
        );

        // Return the event with its children, if it has any
        return {
          ...event,
          ...(children.length > 0 && { children }),
        };
      }),
    );

    return {
      events: allEvents,
      future: () =>
        allEvents
          .filter((event) => {
            // Get the date of the event
            const eventDate = new Date(event.dateStart);
            // Get the current date
            const currentDate = new Date();
            // Return true if the event is in the future and does not have a parent
            return eventDate > currentDate && !event.parent;
          })
          .sort((a, b) => new Date(a.dateStart) - new Date(b.dateStart)), // Sort in ascending order
      past: () =>
        allEvents.filter((event) => {
          // Get the date of the event
          const eventDate = new Date(event.dateStart);
          // Get the current date
          const currentDate = new Date();
          // Return true if the event is in the past and does not have a parent
          return eventDate < currentDate && !event.parent;
        }),
    };
  } catch (error) {
    console.error(error);
    throw new Error("Failed to fetch events");
  }
}

export default getEvents;
