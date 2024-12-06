<template>
  <div>
    <!-- If there are no upcoming events -->
    <p v-if="Object.keys(groupedEvents).length === 0">No upcoming events</p>

    <!-- If there are upcoming events -->
    <div v-else>
      <div v-for="(events, yearMonth) in groupedEvents" :key="yearMonth">
        <section :id="'section-' + yearMonth" class="month">
          <h2 :id="'heading-' + yearMonth" class="month__heading">{{ formatDate(yearMonth) }}</h2>
          <ul role="list" class="flow">
            <li v-for="event in events" :key="event._id">
              <Event :event="event" />
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import Event from '../components/Event.vue';
import getEvents from '../getEvents.js';
import filtersStore from '../store/filtersStore';

const groupedEvents = ref({});

const formatDate = (yearMonth) => {
  const [year, month] = yearMonth.split('-');
  const date = new Date(year, month - 1);
  return `${date.toLocaleString('default', { month: 'long' })} ${year}`;
};

const filterAndGroupEvents = (events) => {
  const filteredEvents = filtersStore.filterEvents(events);
  const groups = filteredEvents.reduce((groups, event) => {
    const date = new Date(event.dateStart);
    const yearMonth = `${date.getFullYear()}-${date.getMonth() + 1}`;

    if (!groups[yearMonth]) {
      groups[yearMonth] = [];
    }

    groups[yearMonth].push(event);

    return groups;
  }, {});
  groupedEvents.value = groups;
};

onMounted(async () => {
  const events = await getEvents();
  filterAndGroupEvents(events.future());
});

watch(filtersStore.filters, async () => {
  const events = await getEvents();
  filterAndGroupEvents(events.future());
});

</script>

<style scoped>
/* Add any scoped styles here */
</style>