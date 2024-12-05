<template>
  <div class="event__dates text-muted">
    <!-- Display the start date of the event -->
    <span class="event__dateStart">
      <span class="sr-only">Starts</span>
      <!-- Format the start date for the datetime attribute and display it in a human-readable format -->
      <time :datetime="formatDate(event.dateStart, 'YYYY-MM-DDTHH:mm:ssZ')" itemprop="startDate">
        {{ formatDate(event.dateStart, event.day ? 'MMMM D' : 'MMMM D, h:mm') }}
        <!-- If the event is not a full day event, display the timezone abbreviation -->
        <abbr v-if="!event.day" :title="formatDate(event.dateStart, 'z')">{{ formatDate(event.dateStart, 'z') }}</abbr>
      </time>
    </span>
    <!-- If the event has an end date, display it -->
    <span v-if="event.dateEnd" class="event__dateEnd">
      <span class="sr-only">Ends</span>
      <i class="fa-solid fa-arrow-right-long"></i>
      <!-- Format the end date for the datetime attribute and display it in a human-readable format -->
      <time :datetime="formatDate(event.dateEnd, 'YYYY-MM-DDTHH:mm:ssZ')" itemprop="endDate">
        {{ formatDate(event.dateEnd, event.day ? 'MMMM D' : 'MMMM D, h:mm') }}
        <!-- If the event is not a full day event, display the timezone abbreviation -->
        <abbr v-if="!event.day" :title="formatDate(event.dateEnd, 'z')">{{ formatDate(event.dateEnd, 'z') }}</abbr>
      </time>
    </span>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';
import dayjs from 'dayjs';

const props = defineProps({
  event: {
    type: Object,
    required: true,
  },
});

// Helper function to format date and time
function formatDate(date, format) {
  return dayjs(date).format(format);
}
</script>

<style scoped>
/* Add any scoped styles here */
</style>