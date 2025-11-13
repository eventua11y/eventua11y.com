/**
 * Calendar utility functions for generating iCalendar (.ics) files
 */

interface CalendarEvent {
  title: string;
  dateStart: string;
  dateEnd?: string;
  description?: string;
  location?: string;
  website?: string;
  timezone?: string;
}

/**
 * Formats a date string to iCalendar format (YYYYMMDDTHHMMSSZ or YYYYMMDD for all-day events)
 * @param dateString - ISO date string
 * @param isInternational - Whether the event is international (uses UTC)
 * @param timezone - Event timezone
 * @returns Formatted date string for iCalendar
 */
function formatICalDate(
  dateString: string,
  isInternational: boolean = false,
  timezone?: string
): string {
  const date = new Date(dateString);

  // For international events or events without specific times, use date-only format
  if (isInternational || !dateString.includes('T')) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  // For events with specific times, use date-time format in UTC
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escapes special characters in iCalendar text fields
 * @param text - Text to escape
 * @returns Escaped text
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Generates a unique identifier for the event
 * @param event - Event object
 * @returns Unique identifier
 */
function generateUID(event: CalendarEvent): string {
  // Use title and start date to create a semi-unique ID
  const timestamp = new Date(event.dateStart).getTime();
  const titleHash = event.title
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `${timestamp}-${titleHash}@eventua11y.com`;
}

/**
 * Generates iCalendar content for a single event
 * @param event - Event data
 * @returns iCalendar formatted string
 */
export function generateICalendar(event: CalendarEvent): string {
  const now = new Date();
  const timestamp = formatICalDate(now.toISOString(), true);

  // Determine if this is an all-day event
  const isAllDay = !event.dateStart.includes('T');
  const isInternational = !!event.timezone;

  const dtstart = formatICalDate(
    event.dateStart,
    isInternational,
    event.timezone
  );
  const dtend = event.dateEnd
    ? formatICalDate(event.dateEnd, isInternational, event.timezone)
    : dtstart;

  // Build description
  let description = '';
  if (event.description) {
    description = escapeICalText(event.description);
  }
  if (event.website) {
    description += description ? '\\n\\n' : '';
    description += `Website: ${event.website}`;
  }

  // Build location
  const location = event.location ? escapeICalText(event.location) : '';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//eventua11y.com//NONSGML Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' + escapeICalText(event.title),
    'X-WR-TIMEZONE:UTC',
    'BEGIN:VEVENT',
    'UID:' + generateUID(event),
    'DTSTAMP:' + timestamp,
    'DTSTART' + (isAllDay ? ';VALUE=DATE' : '') + ':' + dtstart,
    'DTEND' + (isAllDay ? ';VALUE=DATE' : '') + ':' + dtend,
    'SUMMARY:' + escapeICalText(event.title),
  ];

  if (description) {
    lines.push('DESCRIPTION:' + description);
  }

  if (location) {
    lines.push('LOCATION:' + location);
  }

  if (event.website) {
    lines.push('URL:' + event.website);
  }

  lines.push('STATUS:CONFIRMED');
  lines.push('SEQUENCE:0');
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Downloads an iCalendar file
 * @param event - Event data
 * @param filename - Optional filename (defaults to event title)
 */
export function downloadICalendar(
  event: CalendarEvent,
  filename?: string
): void {
  const icsContent = generateICalendar(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });

  // Create download link
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download =
    filename || `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;

  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  window.URL.revokeObjectURL(link.href);
}
