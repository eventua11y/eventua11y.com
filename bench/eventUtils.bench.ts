/**
 * Grouping, filtering and text extraction run over the whole event list
 * on every render of the home page and the past events page.
 */

import { bench, describe } from 'vitest';
import dayjs from '../src/lib/dayjs';
import { getYearMonth } from '../src/utils/dateUtils';
import {
  filterPastMonths,
  formatMonthHeading,
  getEventMetaDescription,
  groupByMonth,
  isCallForSpeakersOpen,
  portableTextToPlainText,
} from '../src/utils/eventUtils';
import type { Book, Event } from '../src/types/event';
import {
  makeBooks,
  makeEvents,
  makeRichDescription,
  NOW_ISO,
} from './fixtures';

const events = makeEvents(250);
const books = makeBooks(20);
const items = [...events, ...books];
const now = dayjs.utc(NOW_ISO);

const getKey = (item: Event | Book) =>
  getYearMonth(item.dateStart, {
    isBook: item._type === 'book',
    timezone: item._type === 'book' ? undefined : item.timezone,
    useLocalTimezone: true,
    userTimezone: 'Europe/London',
  });

const upcomingGroups = groupByMonth(items, 'upcoming', getKey);
const richDescription = makeRichDescription(8);

describe('eventUtils - grouping', () => {
  bench('groupByMonth (upcoming, 270 items)', () => {
    groupByMonth(items, 'upcoming', getKey);
  });

  bench('groupByMonth (past, 270 items)', () => {
    groupByMonth(items, 'past', getKey);
  });

  bench('filterPastMonths', () => {
    filterPastMonths(upcomingGroups, 2026, 3);
  });

  bench('formatMonthHeading over every month group', () => {
    for (const key of Object.keys(upcomingGroups)) {
      formatMonthHeading(key, now, 'en');
    }
  });
});

describe('eventUtils - event content', () => {
  bench('portableTextToPlainText (8 blocks)', () => {
    portableTextToPlainText(richDescription);
  });

  bench('getEventMetaDescription over 250 events', () => {
    for (const event of events) {
      getEventMetaDescription(event);
    }
  });

  bench('isCallForSpeakersOpen over 250 events', () => {
    for (const event of events) {
      isCallForSpeakersOpen(event);
    }
  });
});
