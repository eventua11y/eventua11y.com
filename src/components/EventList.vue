<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import Event from './Event.vue';
import EventBook from './EventBook.vue';
import Skeleton from './Skeleton.vue';
import userStore from '../store/userStore';
import filtersStore from '../store/filtersStore';
import type { Event as EventType, Book } from '../types/event';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { getYearMonth as _getYearMonth } from '../utils/dateUtils';
import {
  groupByMonth,
  filterPastMonths,
  formatMonthHeading,
} from '../utils/eventUtils';

dayjs.extend(utc);
dayjs.extend(timezone);

type ListItem = EventType | Book;
type GroupedEvents = Record<string, ListItem[]>;

const props = defineProps<{
  type: 'past' | 'upcoming';
}>();

// Reactive references for component state
const groupedEvents = ref<GroupedEvents>({});
const loading = ref(true);
const error = ref<string | null>(null);

/** Delegates to the shared getYearMonth utility */
const getYearMonth = (item: ListItem): string => {
  const isBook = item._type === 'book';
  const eventTimezone =
    !isBook && 'timezone' in item ? item.timezone : undefined;
  return _getYearMonth(item.dateStart, {
    isBook,
    timezone: eventTimezone,
    useLocalTimezone: userStore.useLocalTimezone,
    userTimezone: userStore.timezone || undefined,
  });
};

/**
 * Formats year-month string into readable heading
 * @param {string} yearMonth - Format: "YYYY-M"
 * @returns {string} Formatted heading (e.g., "This month", "January", or "January 2024")
 */
const formatDate = (yearMonth: string) => {
  const userTz = userStore.geo?.timezone || 'UTC';
  const now = dayjs().tz(userTz);
  return formatMonthHeading(yearMonth, now);
};

/**
 * Groups and sorts events and books by month
 * - Groups items by calendar month
 * - Books appear at top of each month group
 * - Past events: reverse chronological order
 * - Upcoming events: chronological order
 * @param {Array} events - Array of event and book objects
 */
const groupEvents = (events: ListItem[]) => {
  // Filter out deadline events from past events
  const filtered =
    props.type === 'past'
      ? events.filter(
          (event) => !('type' in event) || event.type !== 'deadline'
        )
      : events;

  let groups = groupByMonth(filtered, props.type, getYearMonth);

  // Filter out past months for upcoming events
  if (props.type !== 'past') {
    const userTz = userStore.geo?.timezone || 'UTC';
    const now = dayjs().tz(userTz);
    groups = filterPastMonths(groups, now.year(), now.month() + 1);
  }

  groupedEvents.value = groups;
};

/**
 * Lifecycle hook: initializes component data
 * - Fetches and sets user info if needed
 * - Gets events from store
 * - Fetches and merges books with events
 * - Groups combined items by month
 */
onMounted(async () => {
  loading.value = true;
  error.value = null;

  try {
    if (!userStore.userInfoFetched) {
      const response = await fetch('/api/get-user-info');
      if (!response.ok) throw new Error('Failed to fetch user info');
      const data = await response.json();
      userStore.setUserInfo(data.timezone, data.acceptLanguage, data.geo);
    }

    // Get events from the store
    let events =
      props.type === 'past'
        ? filtersStore.pastEvents
        : filtersStore.filteredEvents;

    // Process events if we have them
    if (events && events.length > 0) {
      groupEvents(events);
    }
  } catch (e) {
    error.value = `Unable to load ${props.type} events. Please try again later.`;
    console.error('Error:', e);
  } finally {
    if (error.value || Object.keys(groupedEvents.value).length > 0) {
      loading.value = false;
    }
  }
});

/**
 * Watch handler: updates grouped events when filters change
 * - Maintains books at top of each month group
 * - Preserves past/upcoming sort order
 */
watch(
  () =>
    props.type === 'past'
      ? filtersStore.pastEvents
      : filtersStore.filteredEvents,
  (newEvents) => {
    if (!loading.value) loading.value = true;
    error.value = null;

    try {
      if (newEvents !== undefined) {
        groupEvents(newEvents);
        loading.value = false;
      }
    } catch (e) {
      error.value = `Error updating ${props.type} events.`;
      console.error('Error:', e);
      loading.value = false;
    }
  }
);
</script>

<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="flow flow-xl">
      <Skeleton />
      <Skeleton />
      <Skeleton />
    </div>

    <!-- Error state -->
    <wa-callout v-else-if="error" variant="danger" class="my-xl">
      <wa-icon
        slot="icon"
        name="octagon-exclamation"
        variant="regular"
      ></wa-icon>
      {{ error }}
    </wa-callout>

    <!-- No events state -->
    <wa-callout
      v-else-if="!loading && Object.keys(groupedEvents).length === 0"
      variant="neutral"
      class="my-xl"
    >
      <wa-icon slot="icon" name="circle-info" variant="regular"></wa-icon>
      {{
        type === 'past'
          ? 'There are no past events to display.'
          : 'There are no upcoming events to display.'
      }}
    </wa-callout>

    <!-- Events list -->
    <div :id="`${type}-events`" v-else class="flow flow-2xl">
      <section
        v-for="(events, yearMonth) in groupedEvents"
        :key="yearMonth"
        :id="'section-' + yearMonth"
        :data-month="yearMonth"
        class="month flow flow-m"
      >
        <h2 :id="'heading-' + yearMonth" class="month__heading">
          {{ formatDate(yearMonth) }}
        </h2>
        <ol
          role="list"
          class="flow flow-l"
          :aria-labelledby="'heading-' + yearMonth"
        >
          <li v-for="event in events" :key="event._id">
            <EventBook
              v-if="event._type === 'book'"
              :book="event"
              client:visible
            />
            <Event v-else :event="event" client:visible />
          </li>
        </ol>
      </section>
    </div>
  </div>
</template>

<style>
h2 {
  font-size: var(--p-step-4);
}
</style>
