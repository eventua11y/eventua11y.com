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
  }>(),
  {
    attendanceMode: 'none',
    location: 'International',
    website: undefined,
    headingId: undefined,
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
      itemprop="eventAttendanceMode"
      content="https://schema.org/OnlineEventAttendanceMode"
    >
      <span class="event__online">
        <wa-icon name="laptop" auto-width></wa-icon>
        Online
      </span>
    </div>

    <div
      v-else-if="attendanceMode === ATTENDANCE_MODES.OFFLINE"
      itemprop="eventAttendanceMode"
      content="https://schema.org/OfflineEventAttendanceMode"
    >
      <span class="event__location">
        <wa-icon name="location-dot"></wa-icon>
        <span itemprop="location" itemscope itemtype="https://schema.org/Place">
          {{ displayLocation }}
        </span>
      </span>
    </div>

    <div
      v-else-if="attendanceMode === ATTENDANCE_MODES.MIXED"
      itemprop="eventAttendanceMode"
      content="https://schema.org/MixedEventAttendanceMode"
    >
      <span class="event__location">
        <wa-icon name="location-dot"></wa-icon>
        <span itemprop="location" itemscope itemtype="https://schema.org/Place">
          {{ displayLocation }}
        </span>
      </span>
      <span class="text-muted">and</span>
      <span class="event__online">
        <wa-icon name="laptop" auto-width></wa-icon>
        Online
      </span>
    </div>

    <div v-else-if="attendanceMode === ATTENDANCE_MODES.NONE">
      <span class="event__location">
        <wa-icon :name="locationIcon"></wa-icon>
        <span itemprop="location" itemscope itemtype="https://schema.org/Place">
          {{ displayLocation }}
        </span>
      </span>
    </div>

    <template v-if="website">
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
