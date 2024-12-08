<template>
  <section id="today">
    <div class="container flow">
      <hgroup role="group" aria-roledescription="Heading group">
        <h2>Today</h2>
        <p aria-roledescription="subtitle">
          <time class="text-muted" :datetime="today.format('YYYY-MM-DD')">{{ today.format('MMMM D, YYYY') }}</time>
        </p>
      </hgroup>

      <p v-if="todaysEvents.length === 0">Take it easy, there are no events today.</p>
      <div v-else class="events flow">
        <ul role="list" class="flow">
          <li v-for="event in todaysEvents" :key="event._id">
            <Event :event="event" />
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script>
import { ref, onMounted, defineComponent } from 'vue';
import dayjs from 'dayjs';
import Event from './Event.vue';
import filtersStore from '../store/filtersStore';

export default defineComponent({
  name: 'Today',
  components: {
    Event,
  },
  setup() {
    const today = dayjs().startOf('day');
    const todaysEvents = ref([]);

    onMounted(() => {
      console.log('Today component mounted with events:', filtersStore.filteredEvents.length);
      todaysEvents.value = filtersStore.filteredEvents.filter(event => dayjs(event.dateStart).isSame(today, 'day'));
    });

    return {
      today,
      todaysEvents,
    };
  },
});
</script>

<style scoped>
/* Add any scoped styles here */
</style>