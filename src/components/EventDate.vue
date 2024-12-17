<template>
  <div class="event__dates text-muted">
    <span class="event__dateStart">
      <span class="sr-only">Starts</span>
      <time
        :datetime="formatDate(dateStart, 'YYYY-MM-DDTHH:mm:ssZ')"
        itemprop="startDate"
      >
        {{ formatDate(dateStart, getStartDateFormat()) }}
        <template v-if="!dateEnd">
          <span> </span>
          <abbr :title="getFullTimezoneName(currentTimezone) || undefined">
            {{ currentTimezone }}
          </abbr>
        </template>
      </time>
      <template v-if="isDeadline">
        <sl-badge variant="danger" pill>Deadline</sl-badge>
      </template>
    </span>

    <span v-if="dateEnd" class="event__dateEnd">
      <span class="sr-only">Ends</span>
      <i class="fa-solid fa-arrow-right-long"></i>
      <time
        :datetime="formatDate(dateEnd, 'YYYY-MM-DDTHH:mm:ssZ')"
        itemprop="endDate"
      >
        {{ formatDate(dateEnd, getEndDateFormat()) }}
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
  dateStart: {
    type: String,
    required: true,
  },
  dateEnd: {
    type: String,
    required: false,
  },
  timezone: {
    type: String,
    required: false,
    default: 'UTC',
  },
  day: {
    type: Boolean,
    required: false,
    default: false,
  },
  isDeadline: {
    type: Boolean,
    required: false,
    default: false,
  },
  type: {
    type: String,
    required: false,
    default: 'event',
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
  const tz = userStore.useLocalTimezone
    ? userStore.timezone || 'UTC'
    : props.timezone || 'UTC';
  const locale = userStore.locale || 'en';
  return utcDate.tz(tz).locale(locale).format(format);
}

/**
 * Checks if two dates fall on the same day, accounting for timezones
 * @param {string|Date} date1 - First date to compare
 * @param {string|Date} date2 - Second date to compare
 * @returns {boolean} True if dates are on the same day
 */
function isSameDay(date1, date2) {
  const tz = userStore.useLocalTimezone
    ? userStore.timezone || 'UTC'
    : props.timezone || 'UTC';
  return dayjs(date1).tz(tz).isSame(dayjs(date2).tz(tz), 'day');
}

/**
 * Determines date format for start date based on event type:
 * - Single date: Full date with year (MMM D, YYYY)
 * - Multi-day: Month and day only (MMM D)
 * - Same-day: Full date and time (LLL)
 * @returns {string} Format pattern for dayjs
 */
function getStartDateFormat() {
  if (props.type === 'theme') return 'LL';
  if (props.isDeadline) return 'LL';
  if (props.day) return 'LL';
  
  if (!props.dateEnd) return 'LLL';
  if (isSameDay(props.dateStart, props.dateEnd)) return 'HH:mm';
  return 'LLL';
}

/**
 * Determines date format for end date based on event type:
 * - Same-day event: Time only (LT)
 * - Multi-day event: Full date with year (MMM D, YYYY)
 * - Awareness day: Full date (LL)
 * @returns {string} Format pattern for dayjs
 */
function getEndDateFormat() {
  if (props.day) return 'LL';
  return isSameDay(props.dateStart, props.dateEnd) ? 'LT' : 'MMM D, YYYY'; // Show full date for multi-day events
}

/**
 * Computes current timezone abbreviation based on user preferences
 * @returns {string} Timezone abbreviation (e.g., 'UTC', 'EST')
 */
const currentTimezone = computed(() => {
  const date = dayjs.utc(props.dateStart);
  const tz = userStore.useLocalTimezone
    ? userStore.timezone || 'UTC'
    : props.timezone || 'UTC';
  return date.tz(tz).format('z');
});
</script>
