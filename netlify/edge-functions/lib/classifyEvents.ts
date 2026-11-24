import { compareByDateAsc } from './dateUtils.ts';

interface ClassifiableEvent {
  dateStart: string;
  dateEnd?: string;
  timezone?: string;
  day?: boolean;
  type?: string;
  parent?: unknown;
}

function twelveMonthsBefore(calendarDay: string): string {
  const [year, month, day] = calendarDay.split('-').map(Number);
  const previousYear = year - 1;
  // Clamp leap day to the last day of February in the previous year.
  const lastDayOfMonth = new Date(
    Date.UTC(previousYear, month, 0)
  ).getUTCDate();
  return new Date(
    Date.UTC(previousYear, month - 1, Math.min(day, lastDayOfMonth))
  )
    .toISOString()
    .slice(0, 10);
}

/** Classifies top-level events by the calendar dates shown to the visitor. */
export function classifyEvents<T extends ClassifiableEvent>(
  events: T[],
  viewerTimezone: string,
  now = new Date()
): { today: T[]; future: T[]; past: T[] } {
  // This module runs in both Node and Deno. Reuse a formatter per timezone.
  const formatters = new Map<string, Intl.DateTimeFormat>();
  function formatCalendarDay(date: Date, timezone: string): string {
    let formatter = formatters.get(timezone);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      formatters.set(timezone, formatter);
    }
    const parts = formatter.formatToParts(date);
    const partValue = (type: 'year' | 'month' | 'day') =>
      parts.find((part) => part.type === type)?.value;
    return `${partValue('year')}-${partValue('month')}-${partValue('day')}`;
  }

  const viewerDay = formatCalendarDay(now, viewerTimezone);
  const oldestDay = twelveMonthsBefore(viewerDay);

  const today: T[] = [];
  const future: T[] = [];
  const past: T[] = [];
  for (const event of events) {
    if (event.parent || !event.dateStart) continue;
    const start = new Date(event.dateStart);
    const end = event.dateEnd ? new Date(event.dateEnd) : start;
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      continue;
    }

    const isDeadline = event.type === 'deadline';
    const dateOnly = event.day || event.type === 'theme' || isDeadline;
    const timezone = event.timezone || (dateOnly ? 'UTC' : viewerTimezone);
    const startDay = formatCalendarDay(start, timezone);
    const endDay = event.dateEnd ? formatCalendarDay(end, timezone) : startDay;

    // An open deadline must not disappear just because the viewer is a day ahead.
    if (isDeadline && end <= now) continue;
    if (startDay > viewerDay) future.push(event);
    else if (endDay >= viewerDay || isDeadline) today.push(event);
    else if (endDay >= oldestDay) past.push(event);
  }

  return {
    today: today.sort(compareByDateAsc),
    future: future.sort(compareByDateAsc),
    past: past.sort((a, b) => compareByDateAsc(b, a)),
  };
}
