<template>
  <section id="today">
    <div class="container readable flow">
      <hgroup class="content py-0" role="group" aria-roledescription="Heading group">
        <h2>Today</h2>
        <p aria-roledescription="subtitle">
          <time class="text-muted" :datetime="today.format('YYYY-MM-DD')">{{ today.format('MMMM D, YYYY') }}</time>
        </p>
      </hgroup>

      <p v-if="todaysEvents.length === 0" class="content">Take it easy, there are no events today.</p>
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

export default defineComponent({
  name: 'Today',
  components: {
    Event,
  },
  props: {
    events: {
      type: Array,
      required: true,
    },
  },
  setup(props) {
    const today = dayjs().startOf('day');
    const todaysEvents = ref([]);

    onMounted(() => {
      todaysEvents.value = props.events.filter(event => dayjs(event.date).isSame(today, 'day'));
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