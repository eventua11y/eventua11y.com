import {
  compareByDateAsc,
  storedCalendarDate,
  usesStoredCalendarDate,
} from './dateUtils.ts';

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

function createCalendarDayFormatter() {
  // This module runs in both Node and Deno. Reuse a formatter per timezone.
  const formatters = new Map<string, Intl.DateTimeFormat>();
  return function formatCalendarDay(date: Date, timezone: string): string {
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
  };
}

function readEventDates(event: ClassifiableEvent) {
  if (event.parent || !event.dateStart) return;
  const start = new Date(event.dateStart);
  const end = event.dateEnd ? new Date(event.dateEnd) : start;
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return;
  }

  return { start, end };
}

function eventTimezone(event: ClassifiableEvent, viewerTimezone: string) {
  if (event.timezone) return event.timezone;
  if (event.type === 'deadline') {
    return 'UTC';
  }
  return viewerTimezone;
}

function eventCalendarDays(
  event: ClassifiableEvent,
  dates: { start: Date; end: Date },
  viewerTimezone: string,
  formatCalendarDay: ReturnType<typeof createCalendarDayFormatter>
) {
  if (usesStoredCalendarDate(event)) {
    const startDay = storedCalendarDate(event.dateStart);
    return {
      startDay,
      endDay: storedCalendarDate(event.dateEnd || event.dateStart),
    };
  }
  const timezone = eventTimezone(event, viewerTimezone);
  return {
    startDay: formatCalendarDay(dates.start, timezone),
    endDay: formatCalendarDay(dates.end, timezone),
  };
}

function getEventBucket(
  startDay: string,
  endDay: string,
  viewerDay: string,
  oldestDay: string,
  isDeadline: boolean
): 'today' | 'future' | 'past' | undefined {
  if (startDay > viewerDay) return 'future';
  // An open deadline must not disappear just because the viewer is a day ahead.
  if (endDay >= viewerDay || isDeadline) return 'today';
  if (endDay >= oldestDay) return 'past';
}

/** Classifies top-level events by the calendar dates shown to the visitor. */
export function classifyEvents<T extends ClassifiableEvent>(
  events: T[],
  viewerTimezone: string,
  now = new Date()
): { today: T[]; future: T[]; past: T[] } {
  const formatCalendarDay = createCalendarDayFormatter();

  const viewerDay = formatCalendarDay(now, viewerTimezone);
  const oldestDay = twelveMonthsBefore(viewerDay);

  const today: T[] = [];
  const future: T[] = [];
  const past: T[] = [];
  const buckets = { today, future, past };
  for (const event of events) {
    const dates = readEventDates(event);
    if (!dates) continue;

    const { startDay, endDay } = eventCalendarDays(
      event,
      dates,
      viewerTimezone,
      formatCalendarDay
    );
    const isDeadline = event.type === 'deadline';
    if (isDeadline && dates.end <= now) continue;

    const bucket = getEventBucket(
      startDay,
      endDay,
      viewerDay,
      oldestDay,
      isDeadline
    );
    if (bucket) buckets[bucket].push(event);
  }

  return {
    today: today.sort(compareByDateAsc),
    future: future.sort(compareByDateAsc),
    past: past.sort((a, b) => compareByDateAsc(b, a)),
  };
}
