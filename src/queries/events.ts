/**
 * Shared GROQ query strings for event data.
 *
 * These are used by both the Astro SSR layer (src/lib/sanity.ts)
 * and the Netlify edge function (netlify/edge-functions/get-events.ts).
 *
 * IMPORTANT: This file must have zero imports — it runs in both
 * Node (Astro) and Deno (edge functions) contexts.
 */

/** Fetch all parent events (those without a parent reference). */
export const PARENT_EVENTS_QUERY = `
  *[_type == "event" && !(_id in path("drafts.**")) && !defined(parent)] {
    _id,
    _type,
    type,
    title,
    slug,
    description,
    dateStart,
    dateEnd,
    timezone,
    website,
    attendanceMode,
    callForSpeakers,
    callForSpeakersClosingDate,
    parent,
    day,
    isFree,
    isParent,
    location,
    "speakers": speakers[]->{ _id, name }
  }
`;

/** Fetch all child events (those with a parent reference). */
export const CHILD_EVENTS_QUERY = `
  *[_type == "event" && !(_id in path("drafts.**")) && defined(parent)] {
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
    parent,
    "speakers": speakers[]->{ _id, name }
  } | order(dateStart asc)
`;

/** Fetch all books, ordered by date descending. */
export const BOOKS_QUERY = `
  *[_type == "book"] | order(date desc) {
    _id,
    title,
    link,
    date
  }
`;
