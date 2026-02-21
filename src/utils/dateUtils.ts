import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);

/**
 * Determines the dayjs format pattern for an event's start date.
 *
 * Date-only (LL, e.g. "January 15, 2026"):
 *   - Awareness days/weeks (type === 'theme')
 *   - CFS deadlines (isDeadline)
 *   - All-day events (day)
 *
 * Date and time (LLL, e.g. "January 15, 2026 2:00 PM"):
 *   - All other timed events
 */
export function getStartDateFormat(options: {
  type?: string;
  isDeadline?: boolean;
  day?: boolean;
}): string {
  if (options.type === 'theme') return 'LL';
  if (options.isDeadline) return 'LL';
  if (options.day) return 'LL';
  return 'LLL';
}

/**
 * Determines the dayjs format pattern for an event's end date.
 *
 * Date-only (LL, e.g. "January 18, 2026"):
 *   - All-day events (day)
 *
 * Time-only (LT, e.g. "5:00 PM"):
 *   - Same-day events (avoids repeating the date from the start)
 *
 * Date and time (LLL, e.g. "January 18, 2026 5:00 PM"):
 *   - Multi-day timed events
 */
export function getEndDateFormat(options: {
  day?: boolean;
  dateStart: string;
  dateEnd?: string;
  timezone?: string;
  useLocalTimezone?: boolean;
  userTimezone?: string;
}): string {
  if (options.day) return 'LL';
  if (isSameDay(options.dateStart, options.dateEnd, options)) return 'LT';
  return 'LLL';
}

/**
 * Checks if two dates fall on the same day in the relevant timezone.
 */
export function isSameDay(
  date1: string | Date,
  date2: string | Date | undefined,
  options: {
    timezone?: string;
    useLocalTimezone?: boolean;
    userTimezone?: string;
  }
): boolean {
  if (!date2) return false;
  const tz = resolveTimezone(options);
  return dayjs(date1).tz(tz).isSame(dayjs(date2).tz(tz), 'day');
}

/**
 * Formats a date using dayjs with or without timezone conversion.
 *
 * International events (no event timezone) display UTC values directly.
 * Local events convert from UTC to the chosen timezone.
 */
export function formatEventDate(
  date: string | Date,
  format: string,
  options: {
    timezone?: string;
    useLocalTimezone?: boolean;
    userTimezone?: string;
    locale?: string;
  }
): string {
  const utcDate = dayjs.utc(date);
  const locale = options.locale || 'en';
  const isInternational = !options.timezone;

  if (isInternational) {
    return utcDate.locale(locale).format(format);
  }

  const tz = resolveTimezone(options);
  return utcDate.tz(tz).locale(locale).format(format);
}

/**
 * Returns the "YYYY-M" key for grouping an event by its calendar month.
 *
 * Books and international events (no timezone) use UTC so the month
 * matches the date stored in Sanity. Local events use either the event's
 * own timezone or the user's selected timezone.
 */
export function getYearMonth(
  dateStart: string,
  options: {
    isBook?: boolean;
    timezone?: string;
    useLocalTimezone?: boolean;
    userTimezone?: string;
  }
): string {
  if (options.isBook || !options.timezone) {
    const d = dayjs.utc(dateStart);
    return `${d.year()}-${d.month() + 1}`;
  }
  const tz = resolveTimezone(options);
  const d = dayjs.utc(dateStart).tz(tz);
  return `${d.year()}-${d.month() + 1}`;
}

/**
 * Resolves which timezone to use based on user preference.
 *
 * If useLocalTimezone is true, uses the user's timezone.
 * Otherwise uses the event's timezone. Falls back to UTC.
 */
function resolveTimezone(options: {
  timezone?: string;
  useLocalTimezone?: boolean;
  userTimezone?: string;
}): string {
  if (options.useLocalTimezone) {
    return options.userTimezone || 'UTC';
  }
  return options.timezone || 'UTC';
}
