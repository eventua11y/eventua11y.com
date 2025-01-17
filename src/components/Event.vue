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
  showDate: {
    type: Boolean,
    default: true,
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

/**
 * Enumerates child event types and their counts
 * @returns {string} Formatted string of child event types and counts
 */
const enumeratedChildTypes = computed(() => {
  const counts = {};
  props.event.children.forEach((child) => {
    if (!child.format) return;
    if (!counts[child.format]) counts[child.format] = 0;
    counts[child.format]++;
  });
  return Object.entries(counts)
    .map(([format, count]) => `${count} ${format}${count > 1 ? 's' : ''}`)
    .join(', ');
});
</script>

<template>
  <div v-if="event.type === 'deadline'" class="event event--deadline">
    <EventDate
      v-if="showDate"
      :dateStart="event.dateStart"
      :timezone="event.timezone"
      :isDeadline="true"
    />
    <span class="event__title"
      >Submit proposals for <a :href="event.website">{{ event.title }}</a></span
    >
  </div>
  <article
    v-else
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

    <EventDate
      v-if="showDate"
      :dateStart="event.dateStart"
      :dateEnd="event.dateEnd"
      :timezone="event.timezone"
      :day="event.day"
      :type="event.type"
    />
    <EventDelivery
      :attendanceMode="event.attendanceMode"
      :location="event.location"
      v-if="event.type !== 'deadline'"
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

    <details v-if="hasChildren" class="event__children flow flow-m">
      <summary>
        <i class="icon fa-solid fa-caret-right"></i>
        Accessibility highlights: {{ enumeratedChildTypes }}
      </summary>
      <EventChild
        v-for="child in event.children"
        :key="child._id"
        :event="child"
      />
    </details>
    <details v-else-if="event.isParent" class="event__children flow">
      <summary>
        <i class="icon fa-solid fa-caret-right"></i>
        Schedule not yet announced
      </summary>
      <p>
        {{ event.title }} is expected to include one or more
        accessibility-themed sessions but the full schedule has not yet been
        announced. Details will be published here closer to the date of the
        event.
      </p>
    </details>

    <div
      class="event__badges"
      v-if="
        (!event.isParent && !event.hasChildren && event.type !== 'theme') ||
        isCallForSpeakersOpen
      "
    >
      <sl-badge
        pill
        variant="neutral"
        v-if="!event.isParent && !event.hasChildren && event.type !== 'theme'"
        >Dedicated to accessibility</sl-badge
      >
      <sl-badge variant="success" pill v-if="isCallForSpeakersOpen"
        >Call for speakers</sl-badge
      >
    </div>
  </article>
</template>

<style scoped>
.event__badges {
  display: flex;
  flex-wrap: wrap;
  column-gap: var(--p-space-3xs);
  row-gap: var(--p-space-3xs);
}
</style>
