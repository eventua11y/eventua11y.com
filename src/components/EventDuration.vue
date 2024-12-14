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

const props = defineProps({
  event: {
    type: Object,
    required: true,
  },
});

const dateStart = props.event.dateStart;
const dateEnd = props.event.dateEnd;

// Compute the duration of the event in minutes
const duration = computed(() =>
  dayjs(dateEnd).diff(dayjs(dateStart), 'minutes')
);

// Format the duration
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
