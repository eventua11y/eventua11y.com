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
    required: true,
    validator: (value) => Object.values(ATTENDANCE_MODES).includes(value),
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
</script>

<template>
  <div class="event__delivery text-small">
    <span
      v-if="attendanceMode === ATTENDANCE_MODES.ONLINE"
      class="event__online"
      itemprop="eventAttendanceMode"
      content="https://schema.org/OnlineEventAttendanceMode"
    >
      <i class="fa-solid fa-laptop"></i>
      Online
    </span>

    <span
      v-else-if="attendanceMode === ATTENDANCE_MODES.OFFLINE"
      class="event__location"
      itemprop="eventAttendanceMode"
      content="https://schema.org/OfflineEventAttendanceMode"
    >
      <i class="fa-solid fa-fw fa-location-dot"></i>
      <span itemprop="location" itemscope itemtype="https://schema.org/Place">
        {{ displayLocation }}
      </span>
    </span>

    <div
      v-else-if="attendanceMode === ATTENDANCE_MODES.MIXED"
      itemprop="eventAttendanceMode"
      content="https://schema.org/MixedEventAttendanceMode"
    >
      <span class="event__location">
        <i class="fa-solid fa-fw fa-location-dot"></i>
        <span itemprop="location" itemscope itemtype="https://schema.org/Place">
          {{ displayLocation }}
        </span>
      </span>
      <span class="text-muted">and</span>
      <span class="event__online">
        <i class="fa-solid fa-laptop"></i>
        Online
      </span>
    </div>
  </div>
</template>
