<template>
  <section id="today">
    <div class="container flow">
      <hgroup role="group" aria-roledescription="Heading group">
        <h2>Today</h2>
        <p aria-roledescription="subtitle">
          <time class="text-muted" :datetime="today.format('YYYY-MM-DD')">{{
            today.format('MMMM D, YYYY')
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
            <Event :event="event" class="readable" />
          </li>
        </ul>
      </div>
    </div>
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
  todaysEvents.value = filtersStore.todayEvents;
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
