<template>
  <div class="event__dates text-muted">
    <!-- Display the start date of the event -->
    <span class="event__dateStart">
      <span class="sr-only">Starts</span>
      <time :datetime="formatDate(event.dateStart, 'YYYY-MM-DDTHH:mm:ssZ')" itemprop="startDate">
        {{ formatDate(event.dateStart, event.day ? 'LL' : 'LLL') }}
        <abbr v-if="!event.day" :title="getFullTimezoneName(formatDate(event.dateStart, 'z')) || undefined">{{ formatDate(event.dateStart, 'z') }}</abbr>
      </time>
    </span>
    <!-- If the event has an end date, display it -->
    <span v-if="event.dateEnd" class="event__dateEnd">
      <span class="sr-only">Ends</span>
      <i class="fa-solid fa-arrow-right-long"></i>
      <time :datetime="formatDate(event.dateEnd, 'YYYY-MM-DDTHH:mm:ssZ')" itemprop="endDate">
        {{ formatDate(event.dateEnd, event.day ? 'LL' : isSameDay(event.dateStart, event.dateEnd) ? 'LT' : 'LLL') }}
        <abbr v-if="!event.day" :title="getFullTimezoneName(formatDate(event.dateEnd, 'z')) || undefined">{{ formatDate(event.dateEnd, 'z') }}</abbr>
      </time>
    </span>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import userStore from '../store/userStore';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);
dayjs.extend(advancedFormat);

const props = defineProps({
  event: {
    type: Object,
    required: true,
  },
});

// Mapping of timezone abbreviations to their full names
const timezoneFullNames = {
  // US Timezones
  'EST': 'Eastern Standard Time',
  'EDT': 'Eastern Daylight Time',
  'CST': 'Central Standard Time',
  'CDT': 'Central Daylight Time',
  'MST': 'Mountain Standard Time',
  'MDT': 'Mountain Daylight Time',
  'PST': 'Pacific Standard Time',
  'PDT': 'Pacific Daylight Time',
  
  // European Timezones
  'GMT': 'Greenwich Mean Time',
  'BST': 'British Summer Time',
  'CET': 'Central European Time',
  'CEST': 'Central European Summer Time',
  'EET': 'Eastern European Time',
  'EEST': 'Eastern European Summer Time',
  'WET': 'Western European Time',
  'WEST': 'Western European Summer Time',
};

// Helper function to get the full timezone name from the abbreviation
function getFullTimezoneName(abbreviation) {
  return timezoneFullNames[abbreviation] || null;
}

// Helper function to format date and time
function formatDate(date, format) {
  const utcDate = dayjs.utc(date);
  
  if (userStore.useLocalTimezone) {
    const userTimezone = userStore.timezone || 'UTC';
    const userLocale = userStore.locale || 'en';
    return utcDate.tz(userTimezone).locale(userLocale).format(format);
  } else {
    // If event has no timezone, keep it in UTC
    const eventTimezone = props.event.timezone || 'UTC';
    return utcDate.tz(eventTimezone).format(format);
  }
}

// Helper function to check if two dates are on the same day
function isSameDay(date1, date2) {
  if (userStore.useLocalTimezone) {
    const userTimezone = userStore.timezone || 'UTC';
    return dayjs(date1).tz(userTimezone).isSame(dayjs(date2).tz(userTimezone), 'day');
  } else {
    return dayjs(date1).tz(props.event.timezone).isSame(dayjs(date2).tz(props.event.timezone), 'day');
  }
}
</script>