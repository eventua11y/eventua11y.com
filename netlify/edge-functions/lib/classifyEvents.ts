import { compareByDateAsc } from './dateUtils.ts';

interface ClassifiableEvent {
  dateStart: string;
  dateEnd?: string;
  timezone?: string;
  day?: boolean;
  type?: string;
  parent?: unknown;
}

/** Classifies top-level events by the calendar dates shown to the visitor. */
export function classifyEvents<T extends ClassifiableEvent>(
  events: T[],
  viewerTimezone: string,
  now = new Date()
): { today: T[]; future: T[]; past: T[] } {
  // This module runs in both Node and Deno. Reuse a formatter per timezone.
  const formatters = new Map<string, Intl.DateTimeFormat>();
  function calendarDay(date: Date, timezone: string): string {
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
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }

  const viewerDay = calendarDay(now, viewerTimezone);
  const [year, month, day] = viewerDay.split('-').map(Number);
  const lastDayOfMonth = new Date(Date.UTC(year - 1, month, 0)).getUTCDate();
  const oldestDay = new Date(
    Date.UTC(year - 1, month - 1, Math.min(day, lastDayOfMonth))
  )
    .toISOString()
    .slice(0, 10);

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
    const startDay = calendarDay(start, timezone);
    const endDay = end === start ? startDay : calendarDay(end, timezone);

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
