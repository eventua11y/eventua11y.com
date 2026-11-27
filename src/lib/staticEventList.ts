import { getEvents, getBooks } from './sanity';
import { groupByMonth, filterPastBooks } from '../utils/eventUtils';
import type { Event, Book } from '../types/event';
import dayjs from './dayjs';
import {
  storedCalendarDate,
  usesStoredCalendarDate,
} from '../../netlify/edge-functions/lib/dateUtils';
import { getYearMonth } from '../utils/dateUtils';

type ListType = 'upcoming' | 'past';

export type StaticEventListResult =
  | { success: true; groupedItems: Record<string, (Event | Book)[]> }
  | { success: false };

export async function loadStaticEvents(
  type: ListType
): Promise<StaticEventListResult> {
  try {
    const [{ future, past }, books] = await Promise.all([
      getEvents(),
      getBooks(),
    ]);

    const items = type === 'past' ? past : [...future, ...books];

    const monthKey = (item: Event | Book) => {
      if (item._type === 'book')
        return getYearMonth(item.dateStart, { isBook: true });
      if (usesStoredCalendarDate(item)) {
        return getYearMonth(storedCalendarDate(item.dateStart), {});
      }
      return getYearMonth(item.dateStart, {
        timezone: item.type === 'deadline' ? undefined : item.timezone,
      });
    };

    let grouped = groupByMonth(items, type, monthKey);

    if (type !== 'past') {
      const now = dayjs.utc();
      grouped = filterPastBooks(grouped, now.year(), now.month() + 1);
    }

    return { success: true, groupedItems: grouped };
  } catch (e) {
    console.error('StaticEventList SSR error:', e);
    return { success: false };
  }
}
