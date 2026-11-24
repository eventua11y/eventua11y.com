/** All-day and awareness dates are calendar dates, not times to convert. */
export function usesStoredCalendarDate(event: {
  day?: boolean;
  type?: string;
  isDeadline?: boolean;
}): boolean {
  return (
    !event.isDeadline &&
    event.type !== 'deadline' &&
    (event.day === true || event.type === 'theme')
  );
}

/** The calendar date as written, without applying the timestamp's offset. */
export function storedCalendarDate(date: string): string {
  return /^\d{4}-\d{2}-\d{2}(?=T|$)/.exec(date)?.[0] ?? date;
}

/**
 * Comparator: sorts items with a `dateStart` field in ascending
 * chronological order (earliest first).
 */
export function compareByDateAsc(
  a: { dateStart: string },
  b: { dateStart: string }
): number {
  return new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime();
}
