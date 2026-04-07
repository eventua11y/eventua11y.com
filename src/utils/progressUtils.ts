import dayjs, { type Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { resolveTimezone } from './dateUtils';

dayjs.extend(utc);
dayjs.extend(timezone);

/** Wraps time abbreviations in <abbr> elements. */
const HR = ' <abbr title="hours">hr</abbr>';
const M = ' <abbr title="minutes">m</abbr>';

export interface ProgressOptions {
  dateStart: string;
  dateEnd?: string;
  timezone?: string;
  day?: boolean;
  type?: string;
  showCountdown?: boolean;
  showEnded?: boolean;
  useLocalTimezone?: boolean;
  userTimezone?: string;
}

/**
 * Returns the event start as a dayjs instance in the resolved timezone.
 */
export function getEventStart(options: ProgressOptions): Dayjs {
  if (!options.timezone) {
    return dayjs.utc(options.dateStart);
  }
  return dayjs.utc(options.dateStart).tz(resolveTimezone(options));
}

/**
 * Returns the event end as a dayjs instance in the resolved timezone.
 * Falls back to end-of-day of the start date when no end date is provided.
 */
export function getEventEnd(options: ProgressOptions): Dayjs {
  if (options.dateEnd) {
    if (!options.timezone) {
      return dayjs.utc(options.dateEnd);
    }
    return dayjs.utc(options.dateEnd).tz(resolveTimezone(options));
  }
  return getEventStart(options).endOf('day');
}

/**
 * Whether this is a multi-day all-day event (day flag set, with an end
 * date on a different calendar day than the start).
 */
export function isMultiDayAllDay(options: ProgressOptions): boolean {
  if (!options.day || !options.dateEnd) return false;
  return !getEventStart(options).isSame(getEventEnd(options), 'day');
}

/**
 * Whether the event is actively in progress right now.
 *
 * Excluded:
 * - Theme/awareness days and deadlines (not meaningful)
 * - Single-day all-day events (we don't know when they end)
 *
 * Included:
 * - Timed events with an end time where now is between start and end
 * - Multi-day all-day events where today falls within the date range
 */
export function isHappeningNow(now: Dayjs, options: ProgressOptions): boolean {
  if (options.type === 'theme') return false;
  if (options.type === 'deadline') return false;
  if (options.day && !isMultiDayAllDay(options)) return false;
  if (!options.dateEnd) return false;

  const start = getEventStart(options);
  const end = getEventEnd(options);
  return now.isAfter(start) && now.isBefore(end);
}

/**
 * Whether the event hasn't started yet.
 * Only returns true when showCountdown is enabled.
 * Excludes themes, deadlines, and all-day events.
 */
export function isStartingSoon(now: Dayjs, options: ProgressOptions): boolean {
  if (!options.showCountdown) return false;
  if (options.type === 'theme') return false;
  if (options.type === 'deadline') return false;
  if (options.day) return false;

  return now.isBefore(getEventStart(options));
}

/**
 * Whether today is the final calendar day of a multi-day all-day event.
 *
 * Because dateEnd for all-day events is an exclusive upper bound (midnight
 * of the day *after* the last day), the last real day is the calendar day
 * immediately before dateEnd.
 */
export function isLastDayOfAllDay(
  now: Dayjs,
  options: ProgressOptions
): boolean {
  if (!isMultiDayAllDay(options)) return false;
  const tz = resolveTimezone(options);
  const todayInTz = now.tz(tz);
  const lastRealDay = getEventEnd(options).subtract(1, 'day');
  return todayInTz.isSame(lastRealDay, 'day');
}

/**
 * The effective end point used for progress calculation.
 *
 * - Timed events: the actual end time.
 * - Multi-day all-day events on their final day: end-of-today (we know
 *   it ends today but not at what exact time).
 * - Multi-day all-day events on earlier days: the actual dateEnd so the
 *   progress bar reflects overall span progress.
 */
export function getEffectiveEnd(now: Dayjs, options: ProgressOptions): Dayjs {
  if (isMultiDayAllDay(options)) {
    if (isLastDayOfAllDay(now, options)) {
      const tz = resolveTimezone(options);
      return now.tz(tz).endOf('day');
    }
    return getEventEnd(options);
  }
  return getEventEnd(options);
}

/**
 * Percentage of the event's duration that has elapsed (0-100),
 * rounded to the nearest whole number.
 */
export function getProgress(now: Dayjs, options: ProgressOptions): number {
  if (!isHappeningNow(now, options)) return 0;

  const start = getEventStart(options);
  const end = getEffectiveEnd(now, options);
  const total = end.diff(start);
  if (total <= 0) return 0;

  const elapsed = now.diff(start);
  return Math.round(Math.min(100, Math.max(0, (elapsed / total) * 100)));
}

/**
 * Whether the event end falls on the same calendar day as now
 * in the resolved timezone.
 */
export function endsToday(now: Dayjs, options: ProgressOptions): boolean {
  const tz = resolveTimezone(options);
  const todayInTz = now.tz(tz);
  return getEventEnd(options).isSame(todayInTz, 'day');
}

/**
 * Formats a time-remaining duration as hours/minutes with <abbr> elements.
 */
function formatDuration(minutes: number): string {
  if (minutes < 1) return `less than 1${M}`;
  if (minutes < 60) return `${minutes}${M}`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) return `${hours}${HR}`;
  return `${hours}${HR} ${mins}${M}`;
}

/**
 * Human-readable time remaining label (HTML with <abbr> elements).
 *
 * - Multi-day all-day events on their final day: "Ends today"
 * - Multi-day all-day events on earlier days: "Ends tomorrow" / "Ends in N days"
 * - Timed events ending today: "Ends in 2<abbr>hr</abbr> 15<abbr>m</abbr>"
 * - Timed events ending tomorrow: "Ends tomorrow"
 * - Timed events ending further out: "Ends in 3 days"
 */
export function getTimeRemaining(now: Dayjs, options: ProgressOptions): string {
  if (!isHappeningNow(now, options)) return '';

  // Multi-day all-day: "Ends today" only on the final day,
  // otherwise fall through to the days-away logic below.
  if (isMultiDayAllDay(options)) {
    if (isLastDayOfAllDay(now, options)) {
      return 'Ends today';
    }
    // Fall through to days-away calculation.
    // Use the last real day (dateEnd − 1) as the target.
    const tz = resolveTimezone(options);
    const todayStart = now.tz(tz).startOf('day');
    const lastRealDay = getEventEnd(options).subtract(1, 'day').startOf('day');
    const daysAway = lastRealDay.diff(todayStart, 'day');

    if (daysAway === 1) return 'Ends tomorrow';
    return `Ends in ${Math.max(2, daysAway)} days`;
  }

  if (endsToday(now, options)) {
    const minutesLeft = Math.max(0, getEventEnd(options).diff(now, 'minute'));
    return `Ends in ${formatDuration(minutesLeft)}`;
  }

  const tz = resolveTimezone(options);
  const todayStart = now.tz(tz).startOf('day');
  const endDay = getEventEnd(options).startOf('day');
  const daysAway = Math.max(1, endDay.diff(todayStart, 'day'));

  if (daysAway === 1) return 'Ends tomorrow';
  return `Ends in ${daysAway} days`;
}

/**
 * Countdown label for events that haven't started yet
 * (HTML with <abbr> elements).
 *
 * Escalates through increasingly coarse units:
 * - Under 24 hr: "Starts in 3 hr 15 m" (via formatDuration)
 * - 1 day:       "Starts tomorrow"
 * - Under 30 d:  "Starts in 4 days"
 * - Under 24 mo: "Starts in 3 months"
 * - 24 mo+:      "Starts in 2 years"
 */
export function getCountdownLabel(
  now: Dayjs,
  options: ProgressOptions
): string {
  if (!isStartingSoon(now, options)) return '';

  const start = getEventStart(options);
  const minutesUntil = Math.max(0, start.diff(now, 'minute'));

  if (minutesUntil < 60 * 24) {
    return `Starts in ${formatDuration(minutesUntil)}`;
  }

  const daysUntil = Math.max(1, start.diff(now, 'day'));
  if (daysUntil === 1) {
    return 'Starts tomorrow';
  }
  if (daysUntil < 30) {
    return `Starts in ${daysUntil} days`;
  }

  const monthsUntil = Math.max(1, start.diff(now, 'month'));
  if (monthsUntil < 24) {
    return `Starts in ${monthsUntil} ${monthsUntil === 1 ? 'month' : 'months'}`;
  }

  const yearsUntil = Math.max(2, start.diff(now, 'year'));
  return `Starts in ${yearsUntil} years`;
}

/**
 * Whether the event has ended (now is after the event end).
 *
 * Excluded (same as isHappeningNow):
 * - Theme/awareness days and deadlines
 * - Single-day all-day events
 * - Events without a dateEnd
 *
 * Only returns true when showEnded is enabled (Today section only).
 */
export function hasEnded(now: Dayjs, options: ProgressOptions): boolean {
  if (!options.showEnded) return false;
  if (options.type === 'theme') return false;
  if (options.type === 'deadline') return false;
  if (options.day && !isMultiDayAllDay(options)) return false;
  if (!options.dateEnd) return false;

  return now.isAfter(getEventEnd(options));
}

/**
 * Human-readable time-since-ended label (HTML with <abbr> elements).
 *
 * Escalates through increasingly coarse units:
 * - Under 60 m:  "Ended 5 m ago"
 * - Under 24 hr: "Ended 3 hr ago"
 * - Under 30 d:  "Ended 4 days ago" / "Ended yesterday"
 * - Under 24 mo: "Ended 3 months ago" / "Ended 20 months ago"
 * - 24 mo+:      "Ended 2 years ago" / "Ended 3 years ago"
 */
export function getTimeSinceEnded(
  now: Dayjs,
  options: ProgressOptions
): string {
  if (!hasEnded(now, options)) return '';

  const end = getEventEnd(options);
  const minutesSince = Math.max(0, now.diff(end, 'minute'));

  if (minutesSince < 60) {
    return `Ended ${formatDuration(minutesSince)} ago`;
  }

  const hoursSince = Math.floor(minutesSince / 60);
  if (hoursSince < 24) {
    return `Ended ${hoursSince}${HR} ago`;
  }

  const daysSince = Math.max(1, now.diff(end, 'day'));
  if (daysSince === 1) {
    return 'Ended yesterday';
  }
  if (daysSince < 30) {
    return `Ended ${daysSince} days ago`;
  }

  const monthsSince = Math.max(1, now.diff(end, 'month'));
  if (monthsSince < 24) {
    return `Ended ${monthsSince} ${monthsSince === 1 ? 'month' : 'months'} ago`;
  }

  const yearsSince = Math.max(2, now.diff(end, 'year'));
  return `Ended ${yearsSince} years ago`;
}
