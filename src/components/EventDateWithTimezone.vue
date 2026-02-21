<template>
  <div class="event-date-with-timezone">
    <EventDate
      :dateStart="dateStart"
      :dateEnd="dateEnd"
      :timezone="timezone"
      :day="day"
      :type="type"
    />
    <TimezoneSelector />
  </div>
</template>

<script setup lang="ts">
import EventDate from './EventDate.vue';
import TimezoneSelector from './TimezoneSelector.vue';

withDefaults(
  defineProps<{
    dateStart: string;
    dateEnd?: string;
    timezone?: string;
    day?: boolean;
    type?: string;
  }>(),
  {
    timezone: '',
    day: false,
    type: 'event',
  }
);
</script>

<style scoped>
.event-date-with-timezone {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--p-space-xs);
}
</style>
