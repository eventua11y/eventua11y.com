<template>
  <div class="event__delivery text-small">
    <span class="sr-only">Location:</span>
    <span
      v-if="attendanceMode === 'online'"
      class="event__online"
      itemprop="eventAttendanceMode"
      content="https://schema.org/OnlineEventAttendanceMode"
    >
      <i class="fa-solid fa-laptop"></i>
      Online
    </span>
    <span
      v-else-if="attendanceMode === 'offline'"
      class="event__location"
      itemprop="eventAttendanceMode"
      content="https://schema.org/OfflineEventAttendanceMode"
    >
      <i class="fa-solid fa-fw fa-location-dot"></i>
      <span itemprop="location" itemscope itemtype="https://schema.org/Place">
        {{ location || 'International' }}
      </span>
    </span>
    <div
      v-else-if="attendanceMode === 'mixed'"
      itemprop="eventAttendanceMode"
      content="https://schema.org/MixedEventAttendanceMode"
    >
      <span class="event__location">
        <i class="fa-solid fa-fw fa-location-dot"></i>
        <span itemprop="location" itemscope itemtype="https://schema.org/Place">
          {{ location || 'International' }}
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

<script setup>
import { defineProps } from 'vue';

const props = defineProps({
  attendanceMode: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    default: '',
  },
});
</script>

<style scoped>
/* Add any scoped styles here */
</style>