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
    website?: string;
    headingId?: string;
    showWebsiteLink?: boolean;
  }>(),
  {
    attendanceMode: 'none',
    location: 'International',
    website: undefined,
    headingId: undefined,
    showWebsiteLink: true,
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
  displayLocation.value === 'International' ? 'globe' : 'location-dot'
);
</script>

<template>
  <div class="event__delivery text-small">
    <div
      v-if="attendanceMode === ATTENDANCE_MODES.ONLINE"
      class="event__attendance-mode"
    >
      <span class="event__online">
        <wa-icon name="laptop" auto-width></wa-icon>
        Online
      </span>
    </div>

    <div
      v-else-if="attendanceMode === ATTENDANCE_MODES.OFFLINE"
      class="event__attendance-mode"
    >
      <span class="event__location">
        <wa-icon name="location-dot"></wa-icon>
        <span>{{ displayLocation }}</span>
      </span>
    </div>

    <div
      v-else-if="attendanceMode === ATTENDANCE_MODES.MIXED"
      class="event__attendance-mode"
    >
      <span class="event__location">
        <wa-icon name="location-dot"></wa-icon>
        <span>{{ displayLocation }}</span>
      </span>
      <span class="text-muted">and</span>
      <span class="event__online">
        <wa-icon name="laptop" auto-width></wa-icon>
        Online
      </span>
    </div>

    <div
      v-else-if="attendanceMode === ATTENDANCE_MODES.NONE"
      class="event__attendance-mode"
    >
      <span class="event__location">
        <wa-icon :name="locationIcon"></wa-icon>
        <span>{{ displayLocation }}</span>
      </span>
    </div>

    <template v-if="website && showWebsiteLink">
      <span aria-hidden="true"> · </span>
      <a
        :href="website"
        rel="noopener noreferrer"
        class="event__website-link"
        :aria-describedby="headingId"
        >Event website<span class="sr-only"> (opens external site)</span></a
      >
    </template>
  </div>
</template>
