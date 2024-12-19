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

      <p v-if="todaysEvents.length === 0">
        Take it easy, there are no events today. Browse
        <a href="/past-events">past events</a> to see what you missed.
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
import { ref, onMounted, watch } from 'vue';
import dayjs from 'dayjs';
import Event from './Event.vue';
import filtersStore from '../store/filtersStore';

const today = dayjs().startOf('day');
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

<!-- <style scoped>
</style> -->
