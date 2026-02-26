# Date formatting

Event dates are formatted by `formatDateRange()` in `src/utils/dateUtils.ts`. The function deduplicates shared date components (month, year) so ranges read naturally, and supports four locales with correct date component ordering.

## Single dates (no end date)

| Event type         | dayjs format | English example       |
| ------------------ | ------------ | --------------------- |
| Timed event        | `LLL`        | March 8, 2026 2:00 PM |
| All-day event      | `LL`         | March 8, 2026         |
| Awareness day/week | `LL`         | March 8, 2026         |
| CFS deadline       | `LL`         | March 8, 2026         |

## Date ranges

### Timed events

| Scenario                   | English example                                     | What's deduplicated |
| -------------------------- | --------------------------------------------------- | ------------------- |
| Same day, same AM/PM       | March 8, 2026 2:00–5:00 PM                          | Date + AM/PM        |
| Same day, AM/PM differs    | March 8, 2026 10:00 AM – 5:00 PM                    | Date                |
| Multi-day, same year       | February 24 9:00 AM – February 25, 2026 4:00 PM     | Year (on end only)  |
| Multi-day, different years | December 30, 2026 2:00 PM – January 2, 2027 5:00 PM | Nothing             |

AM/PM deduplication only applies to 12-hour locales (English). 24-hour locales (German, French, Spanish) have no AM/PM to deduplicate.

### Date-only events (all-day, themes, deadlines)

| Scenario                    | English example                     | What's deduplicated |
| --------------------------- | ----------------------------------- | ------------------- |
| Same day                    | March 8, 2026                       | N/A (single date)   |
| Same month                  | March 8 – 13, 2026                  | Month and year      |
| Different months, same year | March 28 – April 2, 2026            | Year                |
| Different years             | December 28, 2026 – January 2, 2027 | Nothing             |

## Locale examples

All examples use same-month and different-month date-only ranges.

### Same month (March 8–13, 2026)

| Locale  | Output                  |
| ------- | ----------------------- |
| English | March 8 – 13, 2026      |
| German  | 8. – 13. März 2026      |
| French  | 8 – 13 mars 2026        |
| Spanish | 8 – 13 de marzo de 2026 |

### Different months (March 28 – April 2, 2026)

| Locale  | Output                           |
| ------- | -------------------------------- |
| English | March 28 – April 2, 2026         |
| German  | 28. März – 2. April 2026         |
| French  | 28 mars – 2 avril 2026           |
| Spanish | 28 de marzo – 2 de abril de 2026 |

## Timezone handling

- **Local events** (have a timezone): dates are converted to the event's timezone, or to the user's timezone if the timezone selector is set to "local"
- **International events** (no timezone): dates display in UTC with no timezone abbreviation
- The timezone abbreviation (e.g. "EDT") is rendered separately after the formatted range, not inside `formatDateRange()`

## Separator

All ranges use an en-dash (`–`, U+2013) with regular spaces on either side.

## Implementation

The `RANGE_FORMATS` lookup table in `dateUtils.ts` maps each locale to dayjs format strings for the start and end of deduplicated ranges. The function checks whether the start and end dates share the same day, month, or year, and selects the appropriate format pair. For same-day timed events, `deduplicateAmPm()` checks whether both times share the same AM/PM period and omits it from the start time when they do. See `src/utils/dateUtils.ts` for the full implementation and `src/utils/dateUtils.test.ts` for 54 test cases covering all scenarios.
