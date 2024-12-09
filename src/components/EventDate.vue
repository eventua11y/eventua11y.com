<template>
  <div class="event__dates text-muted">
    <!-- Display the start date of the event -->
    <span class="event__dateStart">
      <span class="sr-only">Starts</span>
      <!-- Format the start date for the datetime attribute and display it in a human-readable format -->
      <time :datetime="formatDate(event.dateStart, 'YYYY-MM-DDTHH:mm:ssZ')" itemprop="startDate">
        {{ formatDate(event.dateStart, event.day ? 'LL' : 'LLL') }}
        <!-- If the event is not a full day event, display the timezone abbreviation -->
        <abbr v-if="!event.day" :title="getFullTimezoneName(formatDate(event.dateStart, 'z')) || undefined">{{ formatDate(event.dateStart, 'z') }}</abbr>
      </time>
    </span>
    <!-- If the event has an end date, display it -->
    <span v-if="event.dateEnd" class="event__dateEnd">
      <span class="sr-only">Ends</span>
      <i class="fa-solid fa-arrow-right-long"></i>
      <!-- Format the end date for the datetime attribute and display it in a human-readable format -->
      <time :datetime="formatDate(event.dateEnd, 'YYYY-MM-DDTHH:mm:ssZ')" itemprop="endDate">
        <!-- If the start and end date are on the same day, display only the time for the end date -->
        {{ formatDate(event.dateEnd, event.day ? 'LL' : isSameDay(event.dateStart, event.dateEnd) ? 'LT' : 'LLL') }}
        <!-- If the event is not a full day event, display the timezone abbreviation -->
        <abbr v-if="!event.day" :title="getFullTimezoneName(formatDate(event.dateEnd, 'z')) || undefined">{{ formatDate(event.dateEnd, 'z') }}</abbr>
      </time>
    </span>
  </div>
</template>

<script setup>
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
  'AKST': 'Alaska Standard Time',
  'AKDT': 'Alaska Daylight Time',
  'HST': 'Hawaii Standard Time',
  'HDT': 'Hawaii Daylight Time',
  'AST': 'Atlantic Standard Time',
  'ADT': 'Atlantic Daylight Time',

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
  const userTimezone = userStore.timezone || 'UTC'; // Default to 'UTC' if timezone is not set
  const userLocale = userStore.locale || 'en'; // Default to 'en' if locale is not set

  return dayjs(date).tz(userTimezone).locale(userLocale).format(format);
}

// Helper function to check if two dates are on the same day
function isSameDay(date1, date2) {
  const userTimezone = userStore.timezone || 'UTC'; // Default to 'UTC' if timezone is not set
  return dayjs(date1).tz(userTimezone).isSame(dayjs(date2).tz(userTimezone), 'day');
}
</script>