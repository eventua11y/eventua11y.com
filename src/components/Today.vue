<template>
  <section id="today">
    <div class="container flow">
      <hgroup role="group" aria-roledescription="Heading group">
        <h2>Today</h2>
        <p aria-roledescription="subtitle" class="today__subtitle">
          <time class="text-muted" :datetime="today.format('YYYY-MM-DD')">{{
            today.format('MMMM D, YYYY')
          }}</time>
          <span class="text-muted" aria-hidden="true">·</span>
          <time class="text-muted" :datetime="now.format('HH:mm')">{{
            currentTime
          }}</time>
        </p>
      </hgroup>

      <p v-if="today.format('MM-DD') === '01-01'">
        Happy New Year! Here's to an eventful {{ today.format('YYYY') }}. 🎉
      </p>

      <p v-if="todaysEvents.length === 0">
        Take it easy, there are no accessibility events today. Browse
        <a href="/past-events">past accessibility events</a> to see what you
        missed.
      </p>
      <div v-else class="events flow">
        <ul role="list" class="flow">
          <li v-for="event in todaysEvents" :key="event._id">
            <Event
              :event="event"
              class="readable"
              :showDate="shouldShowDate(event)"
              :showCountdown="true"
              :showEnded="true"
            />
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import userStore from '../store/userStore';
import dayjs from '../lib/dayjs';
import Event from './Event.vue';
import filtersStore from '../store/filtersStore';

// Get the start of the day using the timezone from the edge function
const today = computed(() => {
  const timezone = userStore.geo?.timezone || 'UTC';
  return dayjs().tz(timezone).startOf('day');
});

// Live-updating "now" so the displayed time stays current while the page is
// open. Mirrors the pattern used in EventProgress.vue.
const now = ref(dayjs());
let timer: ReturnType<typeof setInterval> | null = null;

// Current local time in the user's timezone, e.g. "9:41 AM GMT+1"
const currentTime = computed(() => {
  const timezone = userStore.geo?.timezone || 'UTC';
  return now.value.tz(timezone).format('h:mm A z');
});

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
  // Update "now" every minute so the displayed time advances in real time
  timer = setInterval(() => {
    now.value = dayjs();
  }, 60_000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

watch(
  () => filtersStore.todayEvents,
  () => {
    updateTodaysEvents();
  },
  { deep: true }
);
</script>

<style>
.today__subtitle {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5ch;
}

.events {
  border-top: 1px solid var(--s-color-border);
  padding-top: var(--p-space-s);
}
</style>
