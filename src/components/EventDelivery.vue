<script lang="ts">
/**
 * Enum for event attendance modes.
 * Maps to schema.org event attendance modes.
 */
const ATTENDANCE_MODES = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  MIXED: 'mixed',
  NONE: 'none',
} as const;
</script>

<script setup lang="ts">
import { computed } from 'vue';

type AttendanceMode = (typeof ATTENDANCE_MODES)[keyof typeof ATTENDANCE_MODES];

const props = withDefaults(
  defineProps<{
    attendanceMode?: AttendanceMode;
    location?: string;
  }>(),
  {
    attendanceMode: 'none',
    location: 'International',
  }
);

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

    <div v-else-if="attendanceMode === ATTENDANCE_MODES.NONE">
      <span class="event__location">
        <i :class="locationIcon"></i>
        <span itemprop="location" itemscope itemtype="https://schema.org/Place">
          {{ displayLocation }}
        </span>
      </span>
    </div>
  </div>
</template>
