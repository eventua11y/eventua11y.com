import dayjs from 'dayjs';

interface EventWithCFS {
  callForSpeakers?: boolean;
  callForSpeakersClosingDate?: string;
}

/**
 * Checks if the call for speakers is open for a given event.
 * Returns true if:
 * - Event has call for speakers enabled AND
 * - Either no closing date is set OR current date is before closing date
 *
 * @param event - The event to check
 * @returns True if the call for speakers is open, false otherwise
 */
export const isCallForSpeakersOpen = (event: EventWithCFS): boolean => {
  if (!event.callForSpeakers) return false;
  if (!event.callForSpeakersClosingDate) return true;
  return dayjs().isBefore(dayjs(event.callForSpeakersClosingDate));
};
