# Date formatting

Event dates are formatted by `formatDateRange()` in `src/utils/dateUtils.ts`. The function deduplicates shared date components (month, year, AM/PM) so ranges read naturally, includes day-of-week names on all dates, and supports four locales with correct date component ordering.

## Day-of-week names

All formatted dates include the day-of-week name. The comma convention varies by locale:

| Locale  | Convention            | Example                     |
| ------- | --------------------- | --------------------------- |
| English | Comma after day name  | Sunday, March 8, 2026       |
| German  | Comma after day name  | Sonntag, 8. März 2026       |
| French  | No comma (convention) | dimanche 8 mars 2026        |
| Spanish | Comma after day name  | domingo, 8 de marzo de 2026 |

The `dayPrefix()` helper returns `'dddd, '` for en/de/es and `'dddd '` for fr.

## Single dates (no end date)

| Event type         | dayjs format | English example               |
| ------------------ | ------------ | ----------------------------- |
| Timed event        | `LLLL`       | Sunday, March 8, 2026 2:00 PM |
| All-day event      | `dddd, LL`   | Sunday, March 8, 2026         |
| Awareness day/week | `dddd, LL`   | Sunday, March 8, 2026         |
| CFS deadline       | `dddd, LL`   | Sunday, March 8, 2026         |

## Date ranges

### Timed events

| Scenario                   | English example                                                          | What's deduplicated |
| -------------------------- | ------------------------------------------------------------------------ | ------------------- |
| Same day, same AM/PM       | Sunday, March 8, 2026 2:00–5:00 PM                                       | Date + AM/PM        |
| Same day, AM/PM differs    | Sunday, March 8, 2026 10:00 AM – 5:00 PM                                 | Date                |
| Multi-day, same year       | Tuesday, February 24 2:00 PM – Wednesday, February 25, 2026 9:00 PM      | Year (on end only)  |
| Multi-day, different years | Wednesday, December 30, 2026 2:00 PM – Saturday, January 2, 2027 5:00 PM | Nothing             |

AM/PM deduplication only applies to 12-hour locales (English). 24-hour locales (German, French, Spanish) have no AM/PM to deduplicate.

### Date-only events (all-day, themes, deadlines)

| Scenario                    | English example                                       | What's deduplicated |
| --------------------------- | ----------------------------------------------------- | ------------------- |
| Same day                    | Sunday, March 8, 2026                                 | N/A (single date)   |
| Same month                  | Sunday, March 8 – Friday, March 13, 2026              | Year                |
| Different months, same year | Saturday, March 28 – Thursday, April 2, 2026          | Year                |
| Different years             | Monday, December 28, 2026 – Saturday, January 2, 2027 | Nothing             |

## Locale examples

All examples use same-month and different-month date-only ranges.

### Same month (March 8–13, 2026)

| Locale  | Output                                    |
| ------- | ----------------------------------------- |
| English | Sunday, March 8 – Friday, March 13, 2026  |
| German  | Sonntag, 8. – Freitag, 13. März 2026      |
| French  | dimanche 8 – vendredi 13 mars 2026        |
| Spanish | domingo, 8 – viernes, 13 de marzo de 2026 |

### Different months (March 28 – April 2, 2026)

| Locale  | Output                                           |
| ------- | ------------------------------------------------ |
| English | Saturday, March 28 – Thursday, April 2, 2026     |
| German  | Samstag, 28. März – Donnerstag, 2. April 2026    |
| French  | samedi 28 mars – jeudi 2 avril 2026              |
| Spanish | sábado, 28 de marzo – jueves, 2 de abril de 2026 |

## Timezone handling

- **Local events** (have a timezone): dates are converted to the event's timezone, or to the user's timezone if the timezone selector is set to "local"
- **International events** (no timezone): dates display in UTC with no timezone abbreviation
- The timezone abbreviation (e.g. "EDT") is rendered separately after the formatted range, not inside `formatDateRange()`

## Separator

All ranges use an en-dash (`–`, U+2013) with regular spaces on either side.

## Implementation

The `RANGE_FORMATS` lookup table in `dateUtils.ts` maps each locale to dayjs format strings for the start and end of deduplicated ranges, with day-of-week names included in every format. The `dayPrefix()` helper handles the French no-comma convention. The function checks whether the start and end dates share the same day, month, or year, and selects the appropriate format pair. For same-day timed events, `deduplicateAmPm()` checks whether both times share the same AM/PM period and omits it from the start time when they do. See `src/utils/dateUtils.ts` for the full implementation and `src/utils/dateUtils.test.ts` for 57 test cases covering all scenarios.
