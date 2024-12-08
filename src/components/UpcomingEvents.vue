<template>
  <div>
    <!-- If there are no upcoming events -->
    <sl-alert open v-if="events.length === 0" class="my-xl">
      <sl-icon slot="icon" name="info-circle"></sl-icon>
      For one reason or another, there are no events to display at the moment.
    </sl-alert>
    <!-- If there are upcoming events -->
    <div id="upcoming-events" v-else>
      <ul role="list" class="flow">
        <li v-for="event in events" :key="event._id">
          <Event :event="event" />
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { defineProps, onMounted } from 'vue';
import Event from '../components/Event.vue';

const props = defineProps({
  events: {
    type: Array,
    required: true,
  },
});

onMounted(() => {
  console.log('UpcomingEvents component mounted with events:', props.events);
});
</script>

<style scoped>
/* Add any scoped styles here */
</style>