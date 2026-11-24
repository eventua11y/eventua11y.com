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

type DatedItem = Parameters<typeof usesStoredCalendarDate>[0] & {
  dateStart: string;
};

function dateSortKey(item: DatedItem): number {
  const date = usesStoredCalendarDate(item)
    ? storedCalendarDate(item.dateStart)
    : item.dateStart;
  return Date.parse(date);
}

/** Sorts by written date for calendar events, and by instant otherwise. */
export function compareByDateAsc(a: DatedItem, b: DatedItem): number {
  return dateSortKey(a) - dateSortKey(b);
}
