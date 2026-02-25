import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import 'dayjs/locale/en';
import 'dayjs/locale/de';
import 'dayjs/locale/fr';
import 'dayjs/locale/es';

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
 * Locale-specific format strings for deduplicated date ranges.
 *
 * Each locale defines shortened formats for the start/end of a range
 * when month or year can be omitted because it's shared. The full LL
 * format is the dayjs localised long-date format used as fallback.
 *
 * Same month:     only the day changes (month + year shown once)
 * Different month: month differs but year is shared (year shown once)
 */
const RANGE_FORMATS: Record<
  string,
  {
    sameMonth: { start: string; end: string };
    diffMonth: { start: string; end: string };
  }
> = {
  // "March 8 – 13, 2026"
  en: {
    sameMonth: { start: 'MMMM D', end: 'D, YYYY' },
    diffMonth: { start: 'MMMM D', end: 'MMMM D, YYYY' },
  },
  // "8. – 13. März 2026"
  de: {
    sameMonth: { start: 'D.', end: 'D. MMMM YYYY' },
    diffMonth: { start: 'D. MMMM', end: 'D. MMMM YYYY' },
  },
  // "8 – 13 mars 2026"
  fr: {
    sameMonth: { start: 'D', end: 'D MMMM YYYY' },
    diffMonth: { start: 'D MMMM', end: 'D MMMM YYYY' },
  },
  // "8 – 13 de marzo de 2026"
  es: {
    sameMonth: { start: 'D', end: 'D [de] MMMM [de] YYYY' },
    diffMonth: { start: 'D [de] MMMM', end: 'D [de] MMMM [de] YYYY' },
  },
};

/**
 * Formats a date range using dayjs with locale-aware deduplication
 * of shared date components (month, year).
 *
 * Examples (en locale):
 *   Same day, timed:    "March 8, 2026 2:00 PM – 5:00 PM"
 *   Same month:         "March 8 – 13, 2026"
 *   Different months:   "March 28 – April 2, 2026"
 *   Different years:    "December 28, 2026 – January 2, 2027"
 *
 * Falls back to formatEventDate() for single dates (no dateEnd).
 */
export function formatDateRange(options: {
  dateStart: string;
  dateEnd?: string;
  timezone?: string;
  useLocalTimezone?: boolean;
  userTimezone?: string;
  locale?: string;
  day?: boolean;
  type?: string;
  isDeadline?: boolean;
}): string {
  const locale = options.locale || 'en';

  // No end date — return a single formatted date
  if (!options.dateEnd) {
    const format = getStartDateFormat(options);
    return formatEventDate(options.dateStart, format, options);
  }

  const isDateOnly =
    options.day || options.type === 'theme' || options.isDeadline;

  const isInternational = !options.timezone;
  const tz = isInternational ? 'UTC' : resolveTimezone(options);

  // Resolve dayjs instances in the target timezone
  const start = isInternational
    ? dayjs.utc(options.dateStart).locale(locale)
    : dayjs.utc(options.dateStart).tz(tz).locale(locale);
  const end = isInternational
    ? dayjs.utc(options.dateEnd).locale(locale)
    : dayjs.utc(options.dateEnd).tz(tz).locale(locale);

  // Same day — timed events show "date time – time", date-only returns single date
  if (start.isSame(end, 'day')) {
    if (isDateOnly) {
      return start.format('LL');
    }
    return `${start.format('LLL')} \u2013 ${end.format('LT')}`;
  }

  // Timed multi-day events: no deduplication, full LLL on both sides
  if (!isDateOnly) {
    return `${start.format('LLL')} \u2013 ${end.format('LLL')}`;
  }

  // Date-only multi-day ranges: deduplicate shared components
  const formats = RANGE_FORMATS[locale] || RANGE_FORMATS.en;

  if (start.isSame(end, 'year')) {
    const fmt = start.isSame(end, 'month')
      ? formats.sameMonth
      : formats.diffMonth;
    return `${start.format(fmt.start)} \u2013 ${end.format(fmt.end)}`;
  }

  // Different years: no deduplication possible
  return `${start.format('LL')} \u2013 ${end.format('LL')}`;
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
