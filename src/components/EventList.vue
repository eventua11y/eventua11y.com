<script setup>
/**
 * EventList component
 * - Displays events and book club selections grouped by month
 * - Handles both upcoming and past events with different sorting
 * - Shows book club selections only in upcoming events view
 * - Places books at the start of their respective month's list
 */

import { ref, onMounted, watch } from 'vue';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import Event from './Event.vue';
import Skeleton from './Skeleton.vue';
import userStore from '../store/userStore';
import filtersStore from '../store/filtersStore';

dayjs.extend(utc);

// Helper function to get month grouping key with timezone consideration
const getMonthKey = (dateString) => {
  const date = new Date(dateString);
  // Convert to user's timezone
  const userDate = new Date(date.toLocaleString('en-US', { timeZone: userStore.timezone }));
  return `${userDate.getFullYear()}-${userDate.getMonth() + 1}`;
};

// Helper function to get month group for books - using UTC
const getBookMonthKey = (dateString) => {
  const date = dayjs.utc(dateString);
  return `${date.year()}-${date.month() + 1}`;
};

// Helper function for events month grouping
const getEventMonthKey = (dateString) => {
  const date = dayjs(dateString);
  return `${date.year()}-${date.month() + 1}`;
};

/**
 * @prop {string} type - Type of events to display ('past' or 'upcoming')
 * Controls sorting direction and whether books are displayed
 */
const props = defineProps({
  // 'past' or 'upcoming'
  type: {
    type: String,
    required: true,
    validator: (value) => ['past', 'upcoming'].includes(value),
  },
});

// Reactive references for component state
const groupedEvents = ref({}); // Events and books organized by month
const loading = ref(true); // Main loading state for events
const error = ref(null); // Error state for failed fetches
const monthlyBooks = ref({}); // Books organized by month
const booksLoading = ref(props.type === 'upcoming'); // Separate loading for books
const cachedBooks = ref(null); // Cache for books

/**
 * Formats month display with special handling for current month
 * @param {string} yearMonth - Format: "YYYY-M"
 * @returns {string} Formatted date (e.g., "This month", "January", or "January 2024")
 */
const formatDate = (yearMonth) => {
  const [year, month] = yearMonth.split('-');
  const date = dayjs().year(parseInt(year)).month(parseInt(month) - 1);
  const now = dayjs();

  // Check if date is current month and year
  if (
    date.month() === now.month() &&
    date.year() === now.year()
  ) {
    return 'This month';
  }

  return date.format(date.year() === now.year() ? 'MMMM' : 'MMMM YYYY');
};

/**
 * Groups and sorts events chronologically
 * - Past events: reverse chronological order
 * - Upcoming events: chronological order
 * @param {Array} events - Array of event objects
 */
const groupEvents = (events) => {
  // Sort events based on type (past events in reverse chronological order)
  const sortedEvents = [...events].sort((a, b) => {
    const comparison = dayjs(a.dateStart).valueOf() - dayjs(b.dateStart).valueOf();
    return props.type === 'past' ? -comparison : comparison;
  });

  // Group by year-month
  const groups = sortedEvents.reduce((groups, event) => {
    const yearMonth = getEventMonthKey(event.dateStart);
    if (!groups[yearMonth]) groups[yearMonth] = [];
    groups[yearMonth].push(event);
    return groups;
  }, {});

  // Sort months (reverse for past events)
  const sortedGroups = Object.fromEntries(
    Object.entries(groups).sort((a, b) => {
      const [yearA, monthA] = a[0].split('-').map(Number);
      const [yearB, monthB] = b[0].split('-').map(Number);
      const comparison = yearA - yearB || monthA - monthB;
      return props.type === 'past' ? -comparison : comparison;
    })
  );

  groupedEvents.value = sortedGroups;
};

/**
 * Processes and groups books by month
 * - Used only for upcoming events view
 * - Stores a single book per month
 * @param {Array} books - Array of book objects
 */
const groupBooks = (books) => {
  // Reduce to object with single book per month
  monthlyBooks.value = books.reduce((groups, book) => {
    const date = new Date(book.date);
    const yearMonth = `${date.getFullYear()}-${date.getMonth() + 1}`;
    groups[yearMonth] = book;
    return groups;
  }, {});
};

/**
 * Combines events and books into monthly groups
 * - Sorts events chronologically
 * - Places books at the start of their month
 * - Only includes books in upcoming events view
 * @param {Array} events - Array of event objects
 * @param {Object} books - Object containing book data by month
 */
const groupMonthItems = (events, books) => {
  // Sort events based on type (past events in reverse chronological order)
  const sortedEvents = [...events].sort((a, b) => {
    const comparison = dayjs(a.dateStart).valueOf() - dayjs(b.dateStart).valueOf();
    return props.type === 'past' ? -comparison : comparison;
  });

  // Group by year-month
  const groups = sortedEvents.reduce((groups, event) => {
    const yearMonth = getEventMonthKey(event.dateStart);
    if (!groups[yearMonth]) groups[yearMonth] = [];
    groups[yearMonth].push(event);
    return groups;
  }, {});

  // Only add books if we're showing upcoming events and books are enabled
  if (props.type === 'upcoming' && filtersStore.filters.showBooks) {
    Object.entries(books).forEach(([yearMonth, book]) => {
      if (!groups[yearMonth]) groups[yearMonth] = [];
      groups[yearMonth] = groups[yearMonth].filter((item) => !item.isBook);
      groups[yearMonth].unshift({ ...book, isBook: true });
    });
  }

  // Sort months (reverse for past events)
  const sortedGroups = Object.fromEntries(
    Object.entries(groups).sort((a, b) => {
      const [yearA, monthA] = a[0].split('-').map(Number);
      const [yearB, monthB] = b[0].split('-').map(Number);
      const comparison = yearA - yearB || monthA - monthB;
      return props.type === 'past' ? -comparison : comparison;
    })
  );

  groupedEvents.value = sortedGroups;
};

/**
 * Fetches books and caches them
 * @returns {Promise<Object>} Grouped books by month
 */
const fetchAndCacheBooks = async () => {
  if (!cachedBooks.value) {
    const booksResponse = await fetch('/api/get-books');
    if (!booksResponse.ok) throw new Error('Failed to fetch books');
    cachedBooks.value = await booksResponse.json();
  }

  // Use UTC dates for books
  return cachedBooks.value.reduce((acc, book) => {
    const yearMonth = getBookMonthKey(book.date);
    acc[yearMonth] = book;
    return acc;
  }, {});
};

/**
 * Component initialization
 * - Fetches and sets user timezone if needed
 * - Loads events from store based on type (past/upcoming)
 * - Fetches books only for upcoming events view
 * - Handles loading states and errors
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
    const events =
      props.type === 'past'
        ? filtersStore.pastEvents
        : filtersStore.filteredEvents;

    // Only fetch books for upcoming events
    let groupedBooks = {};
    if (props.type === 'upcoming') {
      groupedBooks = await fetchAndCacheBooks();
    }

    // Process events if we have them
    if (events && events.length > 0) {
      groupMonthItems(events, groupedBooks);
    }
  } catch (e) {
    error.value = `Unable to load ${props.type} events. Please try again later.`;
    console.error('Error:', e);
  } finally {
    loading.value = false;
    if (props.type === 'upcoming') {
      booksLoading.value = false;
    }
  }
});

/**
 * Watches for event filter changes
 * - Updates displayed events when filters change
 * - Refetches books for upcoming events view
 * - Maintains correct loading states
 */
watch(
  [
    () =>
      props.type === 'past'
        ? filtersStore.pastEvents
        : filtersStore.filteredEvents,
    () => filtersStore.filters.showBooks,
  ],
  async ([newEvents]) => {
    error.value = null;

    try {
      if (newEvents && newEvents.length > 0) {
        let groupedBooks = {};

        if (props.type === 'upcoming' && filtersStore.filters.showBooks && cachedBooks.value) {
          // Use UTC dates for books
          groupedBooks = cachedBooks.value.reduce((acc, book) => {
            const yearMonth = getBookMonthKey(book.date);
            acc[yearMonth] = book;
            return acc;
          }, {});
        }

        groupMonthItems(newEvents, groupedBooks);
      } else {
        groupedEvents.value = {};
      }
    } catch (e) {
      error.value = `Error updating ${props.type} events.`;
      console.error('Error:', e);
    }
  }
);
</script>

<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading || booksLoading" class="flow flow-xl">
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

    <!-- Events and books list -->
    <div :id="`${type}-events`" v-else>
      <div v-for="(events, yearMonth) in groupedEvents" :key="yearMonth">
        <section :id="'section-' + yearMonth" class="month flow">
          <h2 :id="'heading-' + yearMonth" class="month__heading">
            {{ formatDate(yearMonth) }}
          </h2>
          <ul
            role="list"
            class="flow flow-m"
            :aria-labelledby="'heading-' + yearMonth"
          >
            <li v-for="item in events" :key="item._id">
              <Event v-if="!item.isBook" :event="item" />
              <p v-else class="event event--book">
                <span class="text-muted text-small"
                  >Accessibility Book Club is reading</span
                >
                <a
                  class="book__title"
                  :href="item.link"
                  target="_blank"
                  rel="noopener"
                >
                  {{ item.title }}
                </a>
              </p>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<style>
h2 {
  font-size: var(--p-step-4);
}
.event--book {
  align-items: flex-start;
  border: none;
  padding: 0 var(--p-space-xs-m);
}
.book__title {
  font-family: var(--c-headings-font-family);
}
</style>
