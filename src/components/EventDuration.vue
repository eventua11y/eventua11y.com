<template>
  <span class="event__duration">
    <span class="sr-only">Duration</span>
    <time :datetime="`PT${duration}M`" itemprop="duration">
      <i class="fa-solid fa-timer"></i>
      {{ formattedDuration }}
    </time>
  </span>
</template>

<script setup>
import { defineProps, computed } from 'vue';
import dayjs from 'dayjs';

/**
 * Event duration component
 * Displays event duration in hours and minutes
 * Includes schema.org markup and screen reader text
 *
 * @prop {Object} event - Event object with start and end dates
 * @prop {string} event.dateStart - ISO date string for event start
 * @prop {string} event.dateEnd - ISO date string for event end
 */
const props = defineProps({
  event: {
    type: Object,
    required: true,
  },
});

// Extract dates for duration calculation
const dateStart = props.event.dateStart;
const dateEnd = props.event.dateEnd;

/**
 * Computes event duration in minutes
 * Uses dayjs for reliable date math across timezones
 * @returns {number} Duration in minutes
 */
const duration = computed(() =>
  dayjs(dateEnd).diff(dayjs(dateStart), 'minutes')
);

/**
 * Formats duration into human-readable string
 * - Under 1 hour: "X minutes"
 * - Whole hours: "X hours"
 * - Hours and minutes: "X hours Y minutes"
 * @returns {string} Formatted duration string
 */
const formattedDuration = computed(() => {
  const durationValue = duration.value;
  if (durationValue <= 60) {
    return `${durationValue} minutes`;
  } else {
    const hours = Math.floor(durationValue / 60);
    const minutes = durationValue % 60;
    return minutes > 0 ? `${hours} hours ${minutes} minutes` : `${hours} hours`;
  }
});
</script>

<!-- <style scoped>
</style> -->
