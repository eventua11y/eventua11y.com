<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import Event from './Event.vue';
import Skeleton from './Skeleton.vue';
import userStore from '../store/userStore';
import filtersStore from '../store/filtersStore';

dayjs.extend(timezone);

/**
 * EventList component
 * Displays a grouped list of events by month
 * Handles both upcoming and past events with different sorting
 */

/**
 * @prop {string} type - Type of events to display ('past' or 'upcoming')
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
const groupedEvents = ref({});
const loading = ref(true);
const error = ref(null);

/**
 * Formats year-month string into readable date
 * @param {string} yearMonth - Format: "YYYY-M"
 * @returns {string} Formatted date (e.g., "January" or "January 2024")
 */
const formatDate = (yearMonth: string) => {
  const [year, month] = yearMonth.split('-');
  const date = dayjs()
    .year(parseInt(year))
    .month(parseInt(month) - 1);
  const today = dayjs().tz(userStore.timezone || dayjs.tz.guess());

  return date.format('YYYY-MM') === today.format('YYYY-MM')
    ? 'This month'
    : date.format('MMMM YYYY');
};

/**
 * Groups events by month and sorts them
 * - Past events: reverse chronological order
 * - Upcoming events: chronological order
 * @param {Array} events - Array of event objects
 */
const groupEvents = (events) => {
  // Sort events based on type (past events in reverse chronological order)
  const sortedEvents = [...events].sort((a, b) => {
    const comparison =
      new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime();
    return props.type === 'past' ? -comparison : comparison;
  });

  // Group by year-month
  const groups = sortedEvents.reduce((groups, event) => {
    const date = new Date(event.dateStart);
    const yearMonth = `${date.getFullYear()}-${date.getMonth() + 1}`;
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
 * Lifecycle hook: fetch user info and initialize events
 * Sets up initial component state and handles errors
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

    // Only process events and set loading to false if we have events
    if (events && events.length > 0) {
      groupEvents(events);
    }
  } catch (e) {
    error.value = `Unable to load ${props.type} events. Please try again later.`;
    console.error('Error:', e);
  } finally {
    // Only set loading to false if we have events or an error
    if (error.value || Object.keys(groupedEvents.value).length > 0) {
      loading.value = false;
    }
  }
});

/**
 * Watch for changes in filtered events
 * Updates grouped events when filters change
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
      if (newEvents && newEvents.length > 0) {
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
    <div :id="`${type}-events`" v-else>
      <div v-for="(events, yearMonth) in groupedEvents" :key="yearMonth">
        <section :id="'section-' + yearMonth" class="month">
          <h2 :id="'heading-' + yearMonth" class="month__heading">
            {{ formatDate(yearMonth) }}
          </h2>
          <ul
            role="list"
            class="flow flow-l"
            :aria-labelledby="'heading-' + yearMonth"
          >
            <li v-for="event in events" :key="event._id">
              <Event :event="event" />
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>
