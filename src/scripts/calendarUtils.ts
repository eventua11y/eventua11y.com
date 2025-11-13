/**
 * Utility functions for generating calendar files (ICS format)
 * Handles event data conversion to iCalendar format for download
 */

import type { EventAttributes } from 'ics';
import { createEvent } from 'ics';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Event data structure from Sanity CMS
 */
interface EventData {
  _id: string;
  title: string;
  dateStart: string;
  dateEnd?: string;
  timezone?: string;
  location?: string;
  description?: string;
  website?: string;
  attendanceMode?: string;
  type?: string;
}

/**
 * Converts a date string to ICS date array format [year, month, day, hour, minute]
 * @param dateStr - ISO date string
 * @param eventTimezone - Optional timezone for the event
 * @returns Array of numbers representing [year, month, day, hour, minute]
 */
function dateToArray(
  dateStr: string,
  eventTimezone?: string
): [number, number, number, number, number] {
  const date = eventTimezone
    ? dayjs(dateStr).tz(eventTimezone)
    : dayjs.utc(dateStr);

  return [
    date.year(),
    date.month() + 1, // ICS months are 1-indexed
    date.date(),
    date.hour(),
    date.minute(),
  ];
}

/**
 * Generates location string for ICS file based on attendance mode
 * @param attendanceMode - Type of attendance (online, offline, mixed)
 * @param location - Physical location if applicable
 * @param website - Event website URL
 * @returns Formatted location string
 */
function generateLocationString(
  attendanceMode?: string,
  location?: string,
  website?: string
): string {
  if (attendanceMode === 'online') {
    return website || 'Online Event';
  }
  if (attendanceMode === 'offline' && location) {
    return location;
  }
  if (attendanceMode === 'mixed') {
    return location ? `${location} & Online` : 'Hybrid Event';
  }
  return location || website || '';
}

/**
 * Generates an ICS file from event data and triggers download
 * @param event - Event data object
 * @param userTimezone - User's current timezone for conversions
 * @returns Promise that resolves to true on success, false on error
 */
export async function downloadEventAsICS(
  event: EventData,
  userTimezone?: string
): Promise<boolean> {
  try {
    // Prepare event attributes for ICS creation
    const eventAttributes: EventAttributes = {
      start: dateToArray(event.dateStart, event.timezone),
      startInputType: event.timezone ? 'local' : 'utc',
      title: event.title,
      description: event.description
        ? `${event.description}\n\nMore information: ${event.website || ''}`
        : event.website
          ? `More information: ${event.website}`
          : undefined,
      url: event.website,
      location: generateLocationString(
        event.attendanceMode,
        event.location,
        event.website
      ),
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      productId: 'eventua11y.com',
    };

    // Add end date if available
    if (event.dateEnd) {
      eventAttributes.end = dateToArray(event.dateEnd, event.timezone);
      eventAttributes.endInputType = event.timezone ? 'local' : 'utc';
    } else {
      // For events without end time, set duration to 1 hour
      eventAttributes.duration = { hours: 1 };
    }

    // Create the ICS file
    const { error, value } = createEvent(eventAttributes);

    if (error) {
      console.error('Error creating ICS file:', error);
      return false;
    }

    if (!value) {
      console.error('No ICS content generated');
      return false;
    }

    // Create blob and trigger download
    const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Generate filename from event title
    const safeTitle = event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    link.download = `${safeTitle}.ics`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Error generating calendar file:', error);
    return false;
  }
}

/**
 * Checks if an event can be exported to calendar
 * Deadlines and theme days typically shouldn't be added to calendar as events
 * @param event - Event data object
 * @returns True if event can be exported
 */
export function canExportToCalendar(event: EventData): boolean {
  // Don't export deadline events (these are just reminders for CFS deadlines)
  if (event.type === 'deadline') {
    return false;
  }
  // All other event types can be exported
  return true;
}
