<script setup>
import { computed } from 'vue';
import dayjs from 'dayjs';
import EventDate from './EventDate.vue';
import EventDelivery from './EventDelivery.vue';
import EventChild from './EventChild.vue';

/**
 * Event component displays a single event with its details
 * Props:
 * @prop {Object} event - Event object containing title, type, dates, and other metadata
 */
const props = defineProps({
  event: {
    type: Object,
    required: true,
    validator: (event) => {
      return event.title && event.type;
    },
  },
});

/**
 * Checks if event has child events (e.g., conference tracks, sessions)
 * @returns {boolean} True if event has children
 */
const hasChildren = computed(
  () => props.event.children && props.event.children.length > 0
);

/**
 * Gets count of child events
 * @returns {number} Number of child events or 0 if none
 */
const childrenCount = computed(() =>
  hasChildren.value ? props.event.children.length : 0
);

/**
 * Checks if call for speakers is currently open
 * Returns true if:
 * - Event has call for speakers enabled AND
 * - Either no closing date is set OR current date is before closing date
 * @returns {boolean} True if call for speakers is open
 */
const isCallForSpeakersOpen = computed(() => {
  if (!props.event.callForSpeakers) return false;
  if (!props.event.callForSpeakersClosingDate) return true;
  return dayjs().isBefore(dayjs(props.event.callForSpeakersClosingDate));
});

/**
 * Formats a date string to readable format (e.g., "January 1")
 * Used for call for speakers closing date display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date or error message if invalid
 */
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    return date.toLocaleDateString('en-GB', {
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Date unavailable';
  }
};
</script>

<template>
  <article
    :class="`event event--${event.type}`"
    itemscope
    itemtype="https://schema.org/Event"
    :data-event-type="event.type"
  >
    <h3 class="event__title" itemprop="name">
      <a v-if="event.website" :href="event.website" itemprop="url">{{
        event.title
      }}</a>
      <span v-else>{{ event.title }}</span>
    </h3>

    <EventDate :event="event" />
    <EventDelivery
      :attendanceMode="event.attendanceMode"
      :location="event.location"
    />

    <details
      v-if="event.description && event.type !== 'theme'"
      class="event__description flow"
    >
      <summary>
        <i class="icon fa-solid fa-caret-right"></i>
        Description
      </summary>
      <p itemprop="description">{{ event.description }}</p>
    </details>

    <details v-if="hasChildren" class="event__children flow">
      <summary>
        <i class="icon fa-solid fa-caret-right"></i>
        {{ childrenCount }} accessibility highlights
      </summary>
      <EventChild
        v-for="child in event.children"
        :key="child._id"
        :event="child"
      />
    </details>

    <div v-if="isCallForSpeakersOpen" class="event__badges">
      <sl-badge variant="success" pill pulse> Call for speakers </sl-badge>
      <small v-if="event.callForSpeakersClosingDate" class="text-muted">
        Closes: {{ formatDate(event.callForSpeakersClosingDate) }}
      </small>
    </div>
  </article>
</template>
