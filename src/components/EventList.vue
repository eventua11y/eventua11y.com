<script setup>
import { ref, onMounted, watch } from 'vue';
import Event from './Event.vue';
import EventBook from './EventBook.vue';
import Skeleton from './Skeleton.vue';
import userStore from '../store/userStore';
import filtersStore from '../store/filtersStore';

/**
 * EventList component
 * Displays a grouped list of events by month
 * Handles both upcoming and past events with different sorting
 */

/**
 * @prop {string} type - Type of events to display ('past' or 'upcoming')
 * @prop {Object} initialEvents - Initial events data from SSR
 * @prop {Array} initialBooks - Initial books data from SSR
 * @prop {Object} initialUserInfo - Initial user info from SSR
 */
const props = defineProps({
  // 'past' or 'upcoming'
  type: {
    type: String,
    required: true,
    validator: (value) => ['past', 'upcoming'].includes(value),
  },
  initialEvents: {
    type: Object,
    default: null,
  },
  initialBooks: {
    type: Array,
    default: () => [],
  },
  initialUserInfo: {
    type: Object,
    default: null,
  },
});

// Reactive references for component state
const groupedEvents = ref({});
const loading = ref(true);
const error = ref(null);

/**
 * Formats year-month string into readable date
 * @param {string} yearMonth - Format: "YYYY-M"
 * @returns {string} Formatted date (e.g., "January" or "January 2024")
 */
const formatDate = (yearMonth) => {
  const [year, month] = yearMonth.split('-');
  const date = new Date(year, month - 1);
  const now = new Date();

  // Check if date is current month and year
  if (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return 'This month';
  }

  const formatter = new Intl.DateTimeFormat('default', {
    month: 'long',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });

  return formatter.format(date);
};

/**
 * Groups and sorts events and books by month
 * - Groups items by calendar month
 * - Books appear at top of each month group
 * - Past events: reverse chronological order
 * - Upcoming events: chronological order
 * @param {Array} events - Array of event and book objects
 */
const groupEvents = (events) => {
  // Filter out deadline events from past events
  const filteredEvents =
    props.type === 'past'
      ? events.filter((event) => event.type !== 'deadline')
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

  // Group by year-month, using UTC for books and local time for events
  const groups = sortedEvents.reduce((groups, event) => {
    const date = new Date(event.dateStart);
    // Use UTC methods for books since their dates are in UTC
    const yearMonth =
      event._type === 'book'
        ? `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`
        : `${date.getFullYear()}-${date.getMonth() + 1}`;
    if (!groups[yearMonth]) groups[yearMonth] = [];
    groups[yearMonth].push(event);
    return groups;
  }, {});

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
    const now = new Date();
    const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
    Object.keys(sortedGroups).forEach((yearMonth) => {
      const [year, month] = yearMonth.split('-').map(Number);
      const groupDate = new Date(year, month - 1);
      if (groupDate < currentMonthDate) {
        delete sortedGroups[yearMonth];
      }
    });
  }

  groupedEvents.value = sortedGroups;
};

// Initialize immediately for SSR
// This runs during server-side rendering
if (props.initialEvents) {
  // Process initial events for SSR
  const eventsToProcess =
    props.type === 'past'
      ? props.initialEvents.past || []
      : [
          ...(props.initialEvents.future || []),
          ...(props.initialEvents.today || []),
        ];

  // Add books to the events list (only for upcoming events)
  const booksWithType =
    props.type === 'upcoming' && props.initialBooks?.map((book) => ({
      ...book,
      _type: 'book',
      dateStart: book.date,
    })) || [];

  // Group events immediately for SSR
  if (eventsToProcess.length > 0 || booksWithType.length > 0) {
    const allEvents = props.type === 'past' 
      ? eventsToProcess 
      : [...eventsToProcess, ...booksWithType];
    groupEvents(allEvents);
    loading.value = false;
  }
}

/**
 * Fetches books from the API endpoint
 * @returns {Promise<Array>} Array of book objects or empty array on error
 */
async function fetchBooks() {
  try {
    const response = await fetch('/api/get-books');
    if (!response.ok) throw new Error('Failed to fetch books');
    return await response.json();
  } catch (error) {
    console.error('Error fetching books:', error);
    return [];
  }
}

/**
 * Normalizes a date string to ISO format
 * @param {string} dateString - Date string from various sources
 * @returns {string|null} ISO date string or null if invalid
 */
const normalizeDate = (dateString) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    console.warn('Invalid date:', dateString);
    return null;
  }
  return date.toISOString();
};

/**
 * Client-side initialization
 * Syncs SSR data with stores and handles client-side fetching
 */
onMounted(async () => {
  error.value = null;
  
  // Remove static server-rendered content to prevent duplicates
  const staticContainer = document.getElementById('static-events-container');
  if (staticContainer) {
    staticContainer.remove();
  }

  try {
    // If we have initial SSR data and stores are empty, populate them
    if (props.initialEvents && !filtersStore.events.length) {
      // Set user info from SSR
      if (props.initialUserInfo && !userStore.userInfoFetched) {
        userStore.setUserInfo(
          props.initialUserInfo.timezone,
          props.initialUserInfo.acceptLanguage,
          props.initialUserInfo.geo
        );
      }

      // Set events from SSR
      filtersStore.setEvents(
        props.initialEvents.future || [],
        props.initialEvents.today || [],
        props.initialEvents.past || []
      );

      // Set books from SSR
      if (props.initialBooks && props.initialBooks.length > 0) {
        filtersStore.books = props.initialBooks.map((book) => ({
          ...book,
          _type: 'book',
          dateStart: book.date,
        }));
      }
    } else if (!filtersStore.events.length && !props.initialEvents) {
      // No SSR data and no store data - fetch from API
      loading.value = true;
      await filtersStore.fetchEvents();

      // Get user info if not already fetched
      if (!userStore.userInfoFetched) {
        const response = await fetch('/api/get-user-info');
        if (response.ok) {
          const data = await response.json();
          userStore.setUserInfo(data.timezone, data.acceptLanguage, data.geo);
        }
      }
    }

    // Update grouped events from store
    const events =
      props.type === 'past'
        ? filtersStore.pastEvents
        : filtersStore.filteredEvents;

    if (events) {
      groupEvents(events);
    }
    loading.value = false;
  } catch (e) {
    error.value = `Unable to load ${props.type} events. Please try again later.`;
    console.error('Error:', e);
    loading.value = false;
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
      if (newEvents) {
        // Remove length check to handle empty arrays
        groupEvents(newEvents);
        loading.value = false; // Always set loading to false when we have a response
      }
    } catch (e) {
      error.value = `Error updating ${props.type} events.`;
      console.error('Error:', e);
      loading.value = false;
    }
  }
);

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
      <Skeleton effect="sheen" />
      <Skeleton effect="sheen" />
      <Skeleton effect="sheen" />
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
