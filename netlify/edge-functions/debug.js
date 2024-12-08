import { createClient } from 'https://esm.sh/@sanity/client';

const sanityClient = createClient({
    projectId: '2g5zqxo3',
    dataset: 'test',
    apiVersion: '2024-12-07',
  });

  const sanityEvents = await sanityClient.fetch(
    '*[_type == "event" && !(_id in path("drafts.**"))]'
  );

export default async (request) => {
  try {
    // Return the events with their children
    const allEvents = await Promise.all(
      sanityEvents.map(async (event) => {
        // For this example, we'll assume no children
        const children = [];

        // Return the event with its children, if it has any
        return {
          ...event,
          ...(children.length > 0 && { children }),
        };
      })
    );

    return new Response(JSON.stringify(allEvents), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Failed to fetch events", error);
    return new Response("Error fetching events", { status: 500 });
  }
};

export const config = { path: "/api/debug" };