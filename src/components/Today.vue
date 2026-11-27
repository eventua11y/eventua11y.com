<template>
  <section
    v-show="filtersStore.eventsStatus !== 'error'"
    id="today"
    ref="todaySection"
  >
    <div class="container flow">
      <hgroup role="group" aria-roledescription="Heading group">
        <h2>Today</h2>
        <p aria-roledescription="subtitle">
          <time
            class="text-muted"
            :datetime="localNow.format('YYYY-MM-DDTHH:mmZ')"
            >{{ localNow.format('MMMM D, h:mm A z') }}</time
          >
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
import dayjs from '../lib/dayjs';
import Event from './Event.vue';
import type { Event as EventType } from '../types/event';
import filtersStore from '../store/filtersStore';
import { focusEventRegionIfNeeded } from '../utils/focusEventRegion';

const todaySection = ref<HTMLElement | null>(null);

watch(
  () => filtersStore.eventsStatus,
  (status) => {
    if (status === 'error') {
      focusEventRegionIfNeeded([todaySection.value], '#upcoming-events');
    }
  },
  { flush: 'sync' }
);

const deviceTimezone = ref('UTC');

// Live-updating "now" so the displayed date and time stay current while the
// page is open. Mirrors the pattern used in EventProgress.vue.
const now = ref(dayjs());
let timer: ReturnType<typeof setInterval> | null = null;

// "now" in the user's timezone, used for the subtitle date and time,
// e.g. "June 26, 2026, 9:41 AM GMT+1"
const localNow = computed(() => now.value.tz(deviceTimezone.value));
const today = computed(() => localNow.value.startOf('day'));

const todaysEvents = ref<EventType[]>([]);

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
const shouldShowDate = (event: EventType) => {
  return !(event.type === 'theme' && !event.dateEnd);
};

onMounted(() => {
  deviceTimezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
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
.events {
  border-top: 1px solid var(--s-color-border);
  padding-top: var(--p-space-s);
}
</style>
