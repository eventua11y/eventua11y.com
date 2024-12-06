<template>
  <article
    :class="`event event--${event.type}`"
    itemscope
    itemtype="https://schema.org/Event"
    data-event-type="normal"
  >
    <!-- <EventDebug :event="event" /> -->
    <h3 class="event__title">
      <a v-if="event.website" :href="event.website" itemprop="url">{{ event.title }}</a>
      <span v-else>{{ event.title }}</span>
    </h3>
    <EventDate :event="event" />
    <EventDelivery :attendanceMode="event.attendanceMode" :location="event.location" />
    <details v-if="event.description && event.type !== 'theme'" class="event__description flow">
      <summary>
        <i class="icon fa-solid fa-caret-right"></i>
        Description
      </summary>
      <p itemprop="description">
        {{ event.description }}
      </p>
    </details>
    <details class="event__children flow" v-if="event.children">
      <summary v-if="event.children && event.children.length">
        <i class="icon fa-solid fa-caret-right"></i>
        {{ event.children.length }} accessibility highlights
      </summary>
      <EventChild v-for="child in event.children" :key="child._id" :event="child" />
    </details>
  </article>
</template>

<script setup>
import { defineProps } from 'vue';
import EventDate from './EventDate.vue';
import EventDelivery from './EventDelivery.vue';
import EventChild from './EventChild.vue';
import EventDebug from './EventDebug.vue';

const props = defineProps({
  event: {
    type: Object,
    required: true,
  },
});
</script>

<style scoped>
/* Add any scoped styles here */
</style>