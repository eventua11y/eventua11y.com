<script>
/**
 * Enum for event attendance modes
 * Maps to schema.org event attendance modes
 * @enum {string}
 */
const ATTENDANCE_MODES = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  MIXED: 'mixed',
  NONE: 'none',
};
</script>

<script setup>
import { computed } from 'vue';

/**
 * Event delivery component
 * Displays event attendance mode (online/offline/mixed) and location
 * Includes schema.org markup for event attendance mode
 *
 * @prop {string} attendanceMode - Event attendance mode (online/offline/mixed)
 * @prop {string} [location] - Event location, defaults to 'International'
 */
const props = defineProps({
  attendanceMode: {
    type: String,
    required: false,
    default: ATTENDANCE_MODES.NONE,
    validator: (value) =>
      !value || Object.values(ATTENDANCE_MODES).includes(value),
  },
  location: {
    type: String,
    default: 'International',
  },
});

/**
 * Computed property for event location display
 * Falls back to 'International' if no location provided
 * @returns {string} Location to display
 */
const displayLocation = computed(() => props.location || 'International');

/**
 * Determines which icon to show based on location
 * @returns {string} Icon class name
 */
const locationIcon = computed(() =>
  displayLocation.value === 'International'
    ? 'fa-solid fa-fw fa-globe'
    : 'fa-solid fa-fw fa-location-dot'
);
</script>

<template>
  <div class="wa-cluster wa-gap-2xs">
    <span
      v-if="attendanceMode === ATTENDANCE_MODES.ONLINE"
      itemprop="eventAttendanceMode"
      content="https://schema.org/OnlineEventAttendanceMode"
    >
      <wa-icon name="laptop" variant="solid"></wa-icon>
      Online
    </span>

    <span
      v-else-if="attendanceMode === ATTENDANCE_MODES.OFFLINE"
      itemprop="eventAttendanceMode"
      content="https://schema.org/OfflineEventAttendanceMode"
    >
      <wa-icon name="location-dot" variant="solid"></wa-icon>
      <span itemprop="location" itemscope itemtype="https://schema.org/Place">
        {{ displayLocation }}
      </span>
    </span>

    <div
      v-else-if="attendanceMode === ATTENDANCE_MODES.MIXED"
      class="wa-cluster wa-gap-2xs"
      itemprop="eventAttendanceMode"
      content="https://schema.org/MixedEventAttendanceMode"
    >
      <span>
        <wa-icon name="location-dot" variant="solid"></wa-icon>
        <span itemprop="location" itemscope itemtype="https://schema.org/Place">
          {{ displayLocation }}
        </span>
      </span>
      <span>and</span>
      <span>
        <wa-icon name="laptop" variant="solid"></wa-icon>
        Online
      </span>
    </div>

    <div v-else-if="attendanceMode === ATTENDANCE_MODES.NONE">
      <wa-icon
        :name="displayLocation === 'International' ? 'globe' : 'location-dot'"
        variant="solid"
      ></wa-icon>
      <span itemprop="location" itemscope itemtype="https://schema.org/Place">
        {{ displayLocation }}
      </span>
    </div>
  </div>
</template>
