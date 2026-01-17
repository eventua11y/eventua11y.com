<template>
  <section id="today" class="wa-padding-m wa-stack wa-gap-m">
    <hgroup role="group" aria-roledescription="Heading group">
      <h2>Today</h2>
      <p aria-roledescription="subtitle">
        <time :datetime="today.format('YYYY-MM-DD')">{{
          today.format('MMMM D, YYYY')
        }}</time>
      </p>
    </hgroup>

    <p v-if="today.format('MM-DD') === '01-01'">
      Happy New Year! Here's to an eventful {{ today.format('YYYY') }}.
    </p>

    <p v-if="todaysEvents.length === 0">
      Take it easy, there are no accessibility events today. Browse
      <a href="/past-events">past accessibility events</a> to see what you
      missed.
    </p>
    <ul v-else role="list" class="wa-stack wa-gap-m">
      <li v-for="event in todaysEvents" :key="event._id">
        <Event :event="event" :showDate="shouldShowDate(event)" />
      </li>
    </ul>
    <wa-divider></wa-divider>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import userStore from '../store/userStore';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import Event from './Event.vue';
import filtersStore from '../store/filtersStore';

dayjs.extend(utc);
dayjs.extend(timezone);

// Get the start of the day using the timezone from the edge function
const today = computed(() => {
  const timezone = userStore.geo?.timezone || 'UTC';
  return dayjs().tz(timezone).startOf('day');
});
console.log('User timezone is:', userStore.timezone);
console.log('Today is:', today.value.format('YYYY-MM-DD'));
const todaysEvents = ref([]);

const updateTodaysEvents = () => {
  const events = filtersStore.todayEvents;
  // Reorder theme events to appear first
  todaysEvents.value = [
    ...events.filter((event) => event.type === 'theme'),
    ...events.filter((event) => event.type !== 'theme'),
  ];
};

/**
 * Determines if date should be shown for an event
 * Hides date for single-day international theme events
 */
const shouldShowDate = (event) => {
  return !(event.type === 'theme' && !event.dateEnd);
};

onMounted(async () => {
  updateTodaysEvents();
});

watch(
  () => filtersStore.todayEvents,
  () => {
    updateTodaysEvents();
  },
  { deep: true }
);
</script>
