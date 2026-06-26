import dayjs from '../lib/dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/de';
import 'dayjs/locale/fr';
import 'dayjs/locale/es';

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
    return nonBreakingTime(utcDate.locale(locale).format(format));
  }

  const tz = resolveTimezone(options);
  return nonBreakingTime(utcDate.tz(tz).locale(locale).format(format));
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
 * Locale-specific labels for "Today" and "Tomorrow".
 *
 * Used by formatDateRange to replace the day-of-week and date portion
 * when a start or end date falls on the current or next calendar day
 * in the resolved timezone.
 */
const TODAY_LABELS: Record<string, string> = {
  en: 'Today',
  de: 'Heute',
  fr: "Aujourd'hui",
  es: 'Hoy',
};

const TOMORROW_LABELS: Record<string, string> = {
  en: 'Tomorrow',
  de: 'Morgen',
  fr: 'Demain',
  es: 'Mañana',
};

/**
 * Checks whether a date falls on today's calendar day in the given timezone.
 *
 * Accepts an optional `now` parameter for testability; defaults to the
 * real current time.
 */
export function isToday(
  date: string | Date,
  options: {
    timezone?: string;
    useLocalTimezone?: boolean;
    userTimezone?: string;
  },
  now?: dayjs.Dayjs
): boolean {
  const tz = resolveTimezone(options);
  const today = (now || dayjs()).tz(tz);
  const target = dayjs.utc(date).tz(tz);
  return target.isSame(today, 'day');
}

/**
 * Checks whether a date falls on tomorrow's calendar day in the given timezone.
 *
 * Accepts an optional `now` parameter for testability; defaults to the
 * real current time.
 */
export function isTomorrow(
  date: string | Date,
  options: {
    timezone?: string;
    useLocalTimezone?: boolean;
    userTimezone?: string;
  },
  now?: dayjs.Dayjs
): boolean {
  const tz = resolveTimezone(options);
  const tomorrow = (now || dayjs()).tz(tz).add(1, 'day');
  const target = dayjs.utc(date).tz(tz);
  return target.isSame(tomorrow, 'day');
}

/**
 * Locale-specific format strings for full-month display.
 *
 * When an event spans an entire calendar month (1st to last day),
 * we display just the month and year instead of a verbose date range.
 *
 * English:  "October 2026"
 * German:   "Oktober 2026"
 * French:   "octobre 2026"
 * Spanish:  "octubre de 2026"
 */
const FULL_MONTH_FORMATS: Record<string, string> = {
  en: 'MMMM YYYY',
  de: 'MMMM YYYY',
  fr: 'MMMM YYYY',
  es: 'MMMM [de] YYYY',
};

/**
 * Year-free date-only format strings per locale.
 *
 * Used for upcoming events where the year is implicit and can be omitted
 * to reduce visual noise. Matches the day/month portion of the LL locale
 * format without the year component.
 *
 * English:  "March 8"
 * German:   "8. März"
 * French:   "8 mars"
 * Spanish:  "8 de marzo"
 */
const NO_YEAR_DATE_ONLY: Record<string, string> = {
  en: 'MMMM D',
  de: 'D. MMMM',
  fr: 'D MMMM',
  es: 'D [de] MMMM',
};

/**
 * Year-free timed format strings per locale (LLLL equivalent without year).
 *
 * Used for upcoming timed events. Includes the day name and time but omits
 * the year.
 *
 * English:  "Sunday, March 8 2:00 PM"
 * German:   "Sonntag, 8. März 14:00"
 * French:   "dimanche 8 mars 14:00"
 * Spanish:  "domingo, 8 de marzo 2:00 PM"
 */
const NO_YEAR_TIMED: Record<string, string> = {
  en: 'dddd, MMMM D LT',
  de: 'dddd, D. MMMM LT',
  fr: 'dddd D MMMM LT',
  es: 'dddd, D [de] MMMM LT',
};

/**
 * Checks if a date range spans an entire calendar month.
 *
 * Returns true when the start date is the 1st and the end date is
 * the last day of the same month and year.
 */
export function isFullMonth(start: dayjs.Dayjs, end: dayjs.Dayjs): boolean {
  return (
    start.date() === 1 &&
    end.date() === end.daysInMonth() &&
    start.isSame(end, 'month')
  );
}

/**
 * A formatted date range split into parts for accessible rendering.
 *
 * - Single element: no range (single date, or same-day date-only)
 * - Two elements: [startText, endText] — the template renders an
 *   accessible separator between them (en-dash hidden from AT,
 *   "until" visible only to screen readers)
 */
type DateRangeParts = [string] | [string, string];

/**
 * Formats a date range using dayjs with locale-aware deduplication
 * of shared date components (month, year).
 *
 * Returns a `DateRangeParts` tuple so templates can insert an
 * accessible separator between the start and end parts:
 *
 *   <span aria-hidden="true"> – </span>
 *   <span class="sr-only">until</span>
 *
 * Examples (en locale, showing the two parts):
 *   Same day, same period:  ["Sunday, March 8, 2026 2:00", "5:00 PM"]
 *   Same day, diff period:  ["Sunday, March 8, 2026 10:00 AM", "5:00 PM"]
 *   Multi-day, timed:       ["Tuesday, February 24 2:00 PM", "Wednesday, February 25, 2026 9:00 PM"]
 *   Full month:             ["October 2026"]
 *   Same month, date-only:  ["Sunday, March 8", "Friday, March 13, 2026"]
 *   Different months:       ["Saturday, March 28", "Thursday, April 2, 2026"]
 *   Different years:        ["Monday, December 28, 2026", "Saturday, January 2, 2027"]
 *   Single date:            ["Sunday, March 8, 2026 2:00 PM"]
 *
 * Falls back to a single-element tuple for single dates (no dateEnd)
 * or same-day date-only events.
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
  /**
   * Whether the event is in the past. When false (upcoming), the year is
   * omitted from display to reduce visual noise. Defaults to false.
   */
  isPast?: boolean;
  /** Injected "now" for testability; defaults to the real current time. */
  now?: dayjs.Dayjs;
}): DateRangeParts {
  const locale = options.locale || 'en';
  const todayLabel = TODAY_LABELS[locale] || TODAY_LABELS.en;
  const tomorrowLabel = TOMORROW_LABELS[locale] || TOMORROW_LABELS.en;

  const isInternational = !options.timezone;
  const tz = isInternational ? 'UTC' : resolveTimezone(options);
  const nowInTz = (options.now || dayjs()).tz(tz);
  const tomorrowInTz = nowInTz.add(1, 'day');

  /**
   * Replaces the day-of-week + date portion of a formatted string with
   * "Today" or "Tomorrow" (or their locale equivalents) when `dateObj`
   * falls on the current or next calendar day.
   *
   * Accepts the dayjs format string used to produce `formatted` so it
   * can strip the date-only prefix precisely for any locale. It removes
   * the time tokens (LT / h:mm / H:mm / HH:mm) from the format to
   * isolate the date prefix, then replaces that prefix in the output.
   */
  function relativeDay(
    dateObj: dayjs.Dayjs,
    formatted: string,
    fmt?: string
  ): string {
    let label: string | undefined;
    if (dateObj.isSame(nowInTz, 'day')) {
      label = todayLabel;
    } else if (dateObj.isSame(tomorrowInTz, 'day')) {
      label = tomorrowLabel;
    }
    if (!label) return formatted;

    // If we know the exact format, strip time tokens to get the date prefix
    if (fmt) {
      const dateOnlyFmt = fmt
        .replace(/\s*LT$/, '')
        .replace(/\s*h:mm\s*(A)?$/i, '')
        .replace(/\s*H{1,2}:mm$/i, '')
        .trim();
      const datePrefix = dateObj.format(dateOnlyFmt);
      if (formatted.startsWith(datePrefix)) {
        return label + formatted.slice(datePrefix.length);
      }
    }

    // Fallback: try common date-only patterns from longest to shortest
    const dp = dayPrefix(locale);
    const candidates = [
      dateObj.format(`${dp}LL`), // "Sunday, March 8, 2026"
      dateObj.format(`${dp}MMMM D, YYYY`), // explicit with year
      dateObj.format(`${dp}MMMM D`), // without year
    ];

    for (const candidate of candidates) {
      if (candidate && formatted.startsWith(candidate)) {
        return label + formatted.slice(candidate.length);
      }
    }
    return formatted;
  }

  // Whether the year should be shown. For upcoming events (isPast = false/undefined),
  // the year is omitted to reduce visual noise. Year is always shown for past events
  // and for ranges that span a year boundary (which need the year for clarity).
  const showYear = !!options.isPast;

  // Year-free date-only format for the current locale
  const noYearDateOnly = NO_YEAR_DATE_ONLY[locale] || NO_YEAR_DATE_ONLY.en;
  // Year-free timed format for the current locale (LLLL equivalent without year)
  const noYearTimed = NO_YEAR_TIMED[locale] || NO_YEAR_TIMED.en;

  const dp = dayPrefix(locale);

  // No end date — return a single formatted date
  if (!options.dateEnd) {
    let format: string;
    const isDateOnlySingle =
      options.type === 'theme' || options.isDeadline || options.day;
    if (showYear) {
      format = getStartDateFormat(options);
    } else if (isDateOnlySingle) {
      format = `${dp}${noYearDateOnly}`;
    } else {
      format = noYearTimed;
    }
    const startDj = isInternational
      ? dayjs.utc(options.dateStart).locale(locale)
      : dayjs.utc(options.dateStart).tz(tz).locale(locale);
    return [
      relativeDay(
        startDj,
        formatEventDate(options.dateStart, format, options),
        format
      ),
    ];
  }

  const isDateOnly =
    options.day || options.type === 'theme' || options.isDeadline;

  // Resolve dayjs instances in the target timezone
  const start = isInternational
    ? dayjs.utc(options.dateStart).locale(locale)
    : dayjs.utc(options.dateStart).tz(tz).locale(locale);
  const end = isInternational
    ? dayjs.utc(options.dateEnd).locale(locale)
    : dayjs.utc(options.dateEnd).tz(tz).locale(locale);

  // For year-spanning ranges, always show the year regardless of isPast
  const sameYear = start.isSame(end, 'year');
  const dateFmt = showYear || !sameYear ? `${dp}LL` : `${dp}${noYearDateOnly}`;

  // Same day — timed events show "date time" / "time", date-only returns single date
  if (start.isSame(end, 'day')) {
    if (isDateOnly) {
      return [
        relativeDay(start, nonBreakingTime(start.format(dateFmt)), dateFmt),
      ];
    }
    const startTime = deduplicateAmPm(start, end, locale);
    return [
      relativeDay(
        start,
        nonBreakingTime(`${start.format(dateFmt)} ${startTime}`),
        dateFmt
      ),
      nonBreakingTime(end.format('LT')),
    ];
  }

  const formats = RANGE_FORMATS[locale] || RANGE_FORMATS.en;

  // Timed multi-day events: deduplicate year when same year
  if (!isDateOnly) {
    if (sameYear) {
      // End format: LLLL (with year) for past, year-free timed for upcoming
      const timedEndFmt = showYear ? formats.timedSameYear.end : noYearTimed;
      return [
        relativeDay(
          start,
          nonBreakingTime(start.format(formats.timedSameYear.start)),
          formats.timedSameYear.start
        ),
        relativeDay(end, nonBreakingTime(end.format(timedEndFmt)), timedEndFmt),
      ];
    }
    return [
      relativeDay(
        start,
        nonBreakingTime(start.format(formats.timedDiffYear.start)),
        formats.timedDiffYear.start
      ),
      relativeDay(
        end,
        nonBreakingTime(end.format(formats.timedDiffYear.end)),
        formats.timedDiffYear.end
      ),
    ];
  }

  // Full-month events: display as "October 2026" for past, "October" for upcoming
  if (isFullMonth(start, end)) {
    const fullMonthFmt = showYear
      ? FULL_MONTH_FORMATS[locale] || FULL_MONTH_FORMATS.en
      : 'MMMM';
    return [start.format(fullMonthFmt)];
  }

  // Date-only multi-day ranges: deduplicate shared components
  if (sameYear) {
    const fmt = start.isSame(end, 'month')
      ? formats.sameMonth
      : formats.diffMonth;
    // For upcoming events, omit the year from the end date too
    const endFmt = showYear ? fmt.end : fmt.start;
    return [
      relativeDay(start, nonBreakingTime(start.format(fmt.start)), fmt.start),
      relativeDay(end, nonBreakingTime(end.format(endFmt)), endFmt),
    ];
  }

  // Different years: always show year for clarity
  return [
    relativeDay(
      start,
      nonBreakingTime(start.format(formats.dateOnlyDiffYear.start)),
      formats.dateOnlyDiffYear.start
    ),
    relativeDay(
      end,
      nonBreakingTime(end.format(formats.dateOnlyDiffYear.end)),
      formats.dateOnlyDiffYear.end
    ),
  ];
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
 * Replaces the space before AM/PM with a non-breaking space so that
 * times like "2:00 PM" never wrap between the digits and the period.
 */
function nonBreakingTime(formatted: string): string {
  return formatted.replace(/(\d)\s+(AM|PM)/gi, '$1\u00A0$2');
}

/**
 * Resolves which timezone to use based on user preference.
 *
 * If useLocalTimezone is true, uses the user's timezone.
 * Otherwise uses the event's timezone. Falls back to UTC.
 */
export function resolveTimezone(options: {
  timezone?: string;
  useLocalTimezone?: boolean;
  userTimezone?: string;
}): string {
  if (options.useLocalTimezone) {
    return options.userTimezone || 'UTC';
  }
  return options.timezone || 'UTC';
}
