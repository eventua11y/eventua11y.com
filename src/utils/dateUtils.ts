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
 * Returns the day-of-week prefix for a given locale.
 *
 * French convention omits the comma after the day name
 * ("dimanche 8 mars 2026"), while English, German, and Spanish
 * use a comma ("Sunday, March 8, 2026").
 */
function dayPrefix(locale: string): string {
  return locale === 'fr' ? 'dddd ' : 'dddd, ';
}

/**
 * Determines the dayjs format pattern for an event's start date.
 *
 * Date-only (dddd, LL — e.g. "Sunday, March 8, 2026"):
 *   - Awareness days/weeks (type === 'theme')
 *   - CFS deadlines (isDeadline)
 *   - All-day events (day)
 *
 * Date and time (LLLL — e.g. "Sunday, March 8, 2026 2:00 PM"):
 *   - All other timed events
 *
 * The locale parameter controls comma convention (French omits
 * the comma after the day name).
 */
export function getStartDateFormat(options: {
  type?: string;
  isDeadline?: boolean;
  day?: boolean;
  locale?: string;
}): string {
  const locale = options.locale || 'en';
  if (options.type === 'theme') return `${dayPrefix(locale)}LL`;
  if (options.isDeadline) return `${dayPrefix(locale)}LL`;
  if (options.day) return `${dayPrefix(locale)}LL`;
  return 'LLLL';
}

/**
 * Determines the dayjs format pattern for an event's end date.
 *
 * Date-only (dddd, LL — e.g. "Wednesday, January 18, 2026"):
 *   - All-day events (day)
 *
 * Time-only (LT, e.g. "5:00 PM"):
 *   - Same-day events (avoids repeating the date from the start)
 *
 * Date and time (LLLL — e.g. "Wednesday, January 18, 2026 5:00 PM"):
 *   - Multi-day timed events
 *
 * The locale parameter controls comma convention (French omits
 * the comma after the day name).
 */
export function getEndDateFormat(options: {
  day?: boolean;
  dateStart: string;
  dateEnd?: string;
  timezone?: string;
  useLocalTimezone?: boolean;
  userTimezone?: string;
  locale?: string;
}): string {
  const locale = options.locale || 'en';
  if (options.day) return `${dayPrefix(locale)}LL`;
  if (isSameDay(options.dateStart, options.dateEnd, options)) return 'LT';
  return 'LLLL';
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
 * Day names are included in every format. French omits the comma
 * after the day name; English, German, and Spanish include it.
 *
 * Same month:     only the day changes (month + year shown once)
 * Different month: month differs but year is shared (year shown once)
 */
const RANGE_FORMATS: Record<
  string,
  {
    sameMonth: { start: string; end: string };
    diffMonth: { start: string; end: string };
    timedSameYear: { start: string; end: string };
    timedDiffYear: { start: string; end: string };
    dateOnlyDiffYear: { start: string; end: string };
  }
> = {
  // Date-only: "Sunday, March 8 – Friday, March 13, 2026"
  // Timed:     "Tuesday, February 24 2:00 PM – Wednesday, February 25, 2026 4:00 PM"
  en: {
    sameMonth: { start: 'dddd, MMMM D', end: 'dddd, MMMM D, YYYY' },
    diffMonth: { start: 'dddd, MMMM D', end: 'dddd, MMMM D, YYYY' },
    timedSameYear: {
      start: 'dddd, MMMM D LT',
      end: 'LLLL',
    },
    timedDiffYear: { start: 'LLLL', end: 'LLLL' },
    dateOnlyDiffYear: { start: 'dddd, LL', end: 'dddd, LL' },
  },
  // "Sonntag, 8. – Freitag, 13. März 2026"
  de: {
    sameMonth: { start: 'dddd, D.', end: 'dddd, D. MMMM YYYY' },
    diffMonth: { start: 'dddd, D. MMMM', end: 'dddd, D. MMMM YYYY' },
    timedSameYear: {
      start: 'dddd, D. MMMM LT',
      end: 'LLLL',
    },
    timedDiffYear: { start: 'LLLL', end: 'LLLL' },
    dateOnlyDiffYear: { start: 'dddd, LL', end: 'dddd, LL' },
  },
  // "dimanche 8 – vendredi 13 mars 2026"
  fr: {
    sameMonth: { start: 'dddd D', end: 'dddd D MMMM YYYY' },
    diffMonth: { start: 'dddd D MMMM', end: 'dddd D MMMM YYYY' },
    timedSameYear: {
      start: 'dddd D MMMM LT',
      end: 'LLLL',
    },
    timedDiffYear: { start: 'LLLL', end: 'LLLL' },
    dateOnlyDiffYear: { start: 'dddd LL', end: 'dddd LL' },
  },
  // "domingo, 8 – viernes, 13 de marzo de 2026"
  es: {
    sameMonth: { start: 'dddd, D', end: 'dddd, D [de] MMMM [de] YYYY' },
    diffMonth: {
      start: 'dddd, D [de] MMMM',
      end: 'dddd, D [de] MMMM [de] YYYY',
    },
    timedSameYear: {
      start: 'dddd, D [de] MMMM LT',
      end: 'LLLL',
    },
    timedDiffYear: { start: 'LLLL', end: 'LLLL' },
    dateOnlyDiffYear: { start: 'dddd, LL', end: 'dddd, LL' },
  },
};

/**
 * Formats a date range using dayjs with locale-aware deduplication
 * of shared date components (month, year).
 *
 * Examples (en locale):
 *   Same day, same period:  "March 8, 2026 2:00–5:00 PM"
 *   Same day, diff period:  "March 8, 2026 10:00 AM – 5:00 PM"
 *   Multi-day, timed:      "February 24 9:00 AM – February 25, 2026 4:00 PM"
 *   Same month, date-only: "March 8 – 13, 2026"
 *   Different months:      "March 28 – April 2, 2026"
 *   Different years:       "December 28, 2026 – January 2, 2027"
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

  const dp = dayPrefix(locale);

  // Same day — timed events show "date time – time", date-only returns single date
  if (start.isSame(end, 'day')) {
    if (isDateOnly) {
      return start.format(`${dp}LL`);
    }
    const startTime = deduplicateAmPm(start, end, locale);
    return `${start.format(`${dp}LL`)} ${startTime} \u2013 ${end.format('LT')}`;
  }

  const formats = RANGE_FORMATS[locale] || RANGE_FORMATS.en;

  // Timed multi-day events: deduplicate year when same year
  if (!isDateOnly) {
    if (start.isSame(end, 'year')) {
      return `${start.format(formats.timedSameYear.start)} \u2013 ${end.format(formats.timedSameYear.end)}`;
    }
    return `${start.format(formats.timedDiffYear.start)} \u2013 ${end.format(formats.timedDiffYear.end)}`;
  }

  // Date-only multi-day ranges: deduplicate shared components
  if (start.isSame(end, 'year')) {
    const fmt = start.isSame(end, 'month')
      ? formats.sameMonth
      : formats.diffMonth;
    return `${start.format(fmt.start)} \u2013 ${end.format(fmt.end)}`;
  }

  // Different years: no deduplication possible
  return `${start.format(formats.dateOnlyDiffYear.start)} \u2013 ${end.format(formats.dateOnlyDiffYear.end)}`;
}

/**
 * Returns the formatted start time for a same-day range.
 *
 * For 12-hour locales (where LT contains AM/PM), omits AM/PM from the
 * start time when both times share the same period — e.g. "2:00–5:00 PM"
 * instead of "2:00 PM – 5:00 PM". For 24-hour locales this is a no-op.
 */
function deduplicateAmPm(
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
  locale: string
): string {
  // Detect 12-hour locale by checking if LT output contains AM/PM.
  // We test against a known PM time rather than relying on internal
  // dayjs.Ls which may not survive bundling.
  const probe = dayjs.utc('2000-01-01T13:00:00Z').locale(locale).format('LT');
  const uses12Hour = /AM|PM/i.test(probe);

  if (uses12Hour && start.format('A') === end.format('A')) {
    return start.format('h:mm');
  }
  return start.format('LT');
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
