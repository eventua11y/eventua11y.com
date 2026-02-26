import dayjs from 'dayjs';
import type { Event, ChildEvent } from '../types/event';

/**
 * Checks if the call for speakers is open for a given event.
 * Returns true if:
 * - Event has call for speakers enabled AND
 * - Either no closing date is set OR current date is before closing date
 *
 * @param event - The event to check
 * @returns True if the call for speakers is open, false otherwise
 */
export const isCallForSpeakersOpen = (
  event: Pick<Event, 'callForSpeakers' | 'callForSpeakersClosingDate'>
): boolean => {
  if (!event.callForSpeakers) return false;
  if (!event.callForSpeakersClosingDate) return true;
  return dayjs().isBefore(dayjs(event.callForSpeakersClosingDate));
};

/**
 * Returns the internal URL for an event's detail page, or undefined
 * if the event has no slug (e.g. synthetic CFS deadline events).
 *
 * @param event - The event or child event to get the URL for
 * @returns The internal URL path (e.g. "/events/my-event") or undefined
 */
export const getEventUrl = (
  event: Pick<Event | ChildEvent, 'slug'>
): string | undefined => {
  if (!event.slug?.current) return undefined;
  return `/events/${event.slug.current}`;
};
