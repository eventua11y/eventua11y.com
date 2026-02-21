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

/**
 * Formats year-month string into readable heading
 * @param {string} yearMonth - Format: "YYYY-M"
 * @returns {string} Formatted heading (e.g., "This month", "January", or "January 2024")
 */
const formatDate = (yearMonth: string) => {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // 0-indexed for Date constructor
  const date = new Date(year, month);

  const userTz = userStore.geo?.timezone || 'UTC';
  const now = dayjs().tz(userTz);

  // Check if date is current month and year
  if (month === now.month() && year === now.year()) {
    return 'This month';
  }

  const formatter = new Intl.DateTimeFormat('default', {
    month: 'long',
    year: year !== now.year() ? 'numeric' : undefined,
  });

  return formatter.format(date);
};

/**
 * Returns a "YYYY-M" key for grouping an item by its calendar month.
 *
 * Books and international events (no timezone) use UTC so the month
 * matches the date stored in Sanity. Local events use the same timezone
 * logic as EventDate: either the event's own timezone or the user's
 * selected timezone, depending on the useLocalTimezone preference.
 */
const getYearMonth = (item: ListItem): string => {
  if (item._type === 'book' || !('timezone' in item) || !item.timezone) {
    // Books and international events: use UTC
    const d = dayjs.utc(item.dateStart);
    return `${d.year()}-${d.month() + 1}`;
  }
  // Local events: respect the user's timezone preference
  const tz = userStore.useLocalTimezone
    ? userStore.timezone || 'UTC'
    : item.timezone;
  const d = dayjs.utc(item.dateStart).tz(tz);
  return `${d.year()}-${d.month() + 1}`;
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
  const filteredEvents =
    props.type === 'past'
      ? events.filter(
          (event) => !('type' in event) || event.type !== 'deadline'
        )
      : events;

  // Initial sort of all events before grouping by month
  // This ensures events appear in the correct order when first grouped
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    // Compare event dates (chronological order)
    const comparison =
      new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime();

    // For past events: reverse chronological order (newest first)
    // For upcoming events: chronological order (oldest first)
    return props.type === 'past' ? -comparison : comparison;
  });

  // Group by year-month using timezone-aware logic
  const groups = sortedEvents.reduce((groups: GroupedEvents, event) => {
    const yearMonth = getYearMonth(event);
    if (!groups[yearMonth]) groups[yearMonth] = [];
    groups[yearMonth].push(event);
    return groups;
  }, {} as GroupedEvents);

  // Sort each month's events: books first, then events by date
  Object.keys(groups).forEach((yearMonth) => {
    groups[yearMonth].sort((a, b) => {
      // If both items are the same type (both books or both events)
      if ((a._type === 'book') === (b._type === 'book')) {
        // Calculate chronological comparison (earlier date comes first)
        const comparison =
          new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime();

        // For past events: reverse chronological order (newest first)
        // For upcoming events: chronological order (oldest first)
        return props.type === 'past' ? -comparison : comparison;
      }
      // Different types: Books always go first within their month
      return a._type === 'book' ? -1 : 1;
    });
  });

  // Sort the month groups themselves
  const sortedGroups = Object.fromEntries(
    Object.entries(groups).sort((a, b) => {
      // Extract year and month from month keys
      const [yearA, monthA] = a[0].split('-').map(Number);
      const [yearB, monthB] = b[0].split('-').map(Number);

      // First compare years, then months if years are the same
      const comparison = yearA - yearB || monthA - monthB;

      // For past events: reverse chronological order (newest month first)
      // For upcoming events: chronological order (oldest month first)
      return props.type === 'past' ? -comparison : comparison;
    })
  );

  // Filter out past months for upcoming events
  if (props.type !== 'past') {
    const userTz = userStore.geo?.timezone || 'UTC';
    const now = dayjs().tz(userTz);
    const currentYear = now.year();
    const currentMonth = now.month() + 1; // dayjs months are 0-indexed
    Object.keys(sortedGroups).forEach((yearMonth) => {
      const [year, month] = yearMonth.split('-').map(Number);
      if (
        year < currentYear ||
        (year === currentYear && month < currentMonth)
      ) {
        delete sortedGroups[yearMonth];
      }
    });
  }

  groupedEvents.value = sortedGroups;
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
    <sl-alert v-else-if="error" open variant="danger" class="my-xl">
      <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
      {{ error }}
    </sl-alert>

    <!-- No events state -->
    <sl-alert
      v-else-if="!loading && Object.keys(groupedEvents).length === 0"
      open
      class="my-xl"
    >
      <sl-icon slot="icon" name="info-circle"></sl-icon>
      {{
        type === 'past'
          ? 'There are no past events to display.'
          : 'There are no upcoming events to display.'
      }}
    </sl-alert>

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
