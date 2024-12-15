<template>
  <div class="event__dates text-muted">
    <span class="event__dateStart">
      <span class="sr-only">Starts</span>
      <time
        :datetime="formatDate(event.dateStart, 'YYYY-MM-DDTHH:mm:ssZ')"
        itemprop="startDate"
      >
        {{ formatDate(event.dateStart, getStartDateFormat()) }}
        <template v-if="!event.dateEnd">
          <span> </span>
          <abbr :title="getFullTimezoneName(currentTimezone) || undefined">
            {{ currentTimezone }}
          </abbr>
        </template>
      </time>
    </span>

    <span v-if="event.dateEnd" class="event__dateEnd">
      <span class="sr-only">Ends</span>
      <i class="fa-solid fa-arrow-right-long"></i>
      <time
        :datetime="formatDate(event.dateEnd, 'YYYY-MM-DDTHH:mm:ssZ')"
        itemprop="endDate"
      >
        {{ formatDate(event.dateEnd, getEndDateFormat()) }}
        <span> </span>
        <abbr :title="getFullTimezoneName(currentTimezone) || undefined">
          {{ currentTimezone }}
        </abbr>
      </time>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
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

// Maps timezone abbreviations to their full names
const timezoneFullNames = {
  UTC: 'Coordinated Universal Time',
  EST: 'Eastern Standard Time',
  EDT: 'Eastern Daylight Time',
  CST: 'Central Standard Time',
  CDT: 'Central Daylight Time',
  MST: 'Mountain Standard Time',
  MDT: 'Mountain Daylight Time',
  PST: 'Pacific Standard Time',
  PDT: 'Pacific Daylight Time',
  GMT: 'Greenwich Mean Time',
  'GMT+1': 'Greenwich Mean Time +1',
  BST: 'British Summer Time',
  CET: 'Central European Time',
  CEST: 'Central European Summer Time',
  EET: 'Eastern European Time',
  EEST: 'Eastern European Summer Time',
  WET: 'Western European Time',
  WEST: 'Western European Summer Time',
};

/**
 * Gets the full name of a timezone from its abbreviation
 * @param {string} abbreviation - Timezone abbreviation (e.g., 'UTC', 'EST')
 * @returns {string|null} Full timezone name or null if not found
 */
function getFullTimezoneName(abbreviation) {
  return timezoneFullNames[abbreviation] || null;
}

/**
 * Formats a date using dayjs with timezone support
 * @param {string|Date} date - The date to format
 * @param {string} format - The desired format pattern
 * @returns {string} Formatted date string
 */
function formatDate(date, format) {
  const utcDate = dayjs.utc(date);
  const timezone = userStore.useLocalTimezone
    ? userStore.timezone || 'UTC'
    : props.event.timezone || 'UTC';
  const locale = userStore.locale || 'en';
  return utcDate.tz(timezone).locale(locale).format(format);
}

/**
 * Checks if two dates fall on the same day, accounting for timezones
 * @param {string|Date} date1 - First date to compare
 * @param {string|Date} date2 - Second date to compare
 * @returns {boolean} True if dates are on the same day
 */
function isSameDay(date1, date2) {
  const timezone = userStore.useLocalTimezone
    ? userStore.timezone || 'UTC'
    : props.event.timezone || 'UTC';
  return dayjs(date1).tz(timezone).isSame(dayjs(date2).tz(timezone), 'day');
}

/**
 * Determines date format for start date based on event type:
 * - Single date: Full date with year (MMM D, YYYY)
 * - Multi-day: Month and day only (MMM D)
 * - Same-day: Full date and time (LLL)
 * @returns {string} Format pattern for dayjs
 */
function getStartDateFormat() {
  if (!props.event.dateEnd) return 'MMM D, YYYY';  // Show full date with year for single dates
  return isSameDay(props.event.dateStart, props.event.dateEnd) 
    ? 'LLL'  // Show full date for same-day events
    : 'MMM D';  // Show month/day only for multi-day events
}

/**
 * Determines date format for end date based on event type:
 * - Same-day event: Time only (LT)
 * - Multi-day event: Full date with year (MMM D, YYYY)
 * - Awareness day: Full date (LL)
 * @returns {string} Format pattern for dayjs
 */
function getEndDateFormat() {
  if (props.event.day) return 'LL';
  return isSameDay(props.event.dateStart, props.event.dateEnd) 
    ? 'LT'  // Show time only for same-day events
    : 'MMM D, YYYY';  // Show full date for multi-day events
}

/**
 * Computes current timezone abbreviation based on user preferences
 * @returns {string} Timezone abbreviation (e.g., 'UTC', 'EST')
 */
const currentTimezone = computed(() => {
  const date = dayjs.utc(props.event.dateStart);
  const timezone = userStore.useLocalTimezone
    ? userStore.timezone || 'UTC'
    : props.event.timezone || 'UTC';
  return date.tz(timezone).format('z');
});
</script>