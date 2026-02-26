<template>
  <div class="event__dates">
    <!-- Machine-readable start date for Schema.org -->
    <time
      :datetime="formatDate(dateStart, 'YYYY-MM-DDTHH:mm:ssZ')"
      itemprop="startDate"
      hidden
    ></time>

    <!-- Machine-readable end date for Schema.org -->
    <time
      v-if="dateEnd"
      :datetime="formatDate(dateEnd, 'YYYY-MM-DDTHH:mm:ssZ')"
      itemprop="endDate"
      hidden
    ></time>

    <!-- Human-readable date range with locale-aware deduplication -->
    <span class="event__dateRange">
      {{ formattedRange[0]
      }}<template v-if="formattedRange[1]"
        ><span aria-hidden="true"> &ndash; </span><span class="sr-only">to</span
        >{{ formattedRange[1] }}</template
      ><template v-if="!isInternational"
        >{{ ' '
        }}<abbr :title="getFullTimezoneName(currentTimezone) || undefined">{{
          currentTimezone
        }}</abbr></template
      ><template v-if="isDeadline"
        >{{ ' ' }}<wa-badge variant="danger" pill>Deadline</wa-badge></template
      >
    </span>

    <EventProgress
      :dateStart="dateStart"
      :dateEnd="dateEnd"
      :timezone="timezone"
      :day="day"
      :type="type"
      :showCountdown="showCountdown"
      :showEnded="showEnded"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import EventProgress from './EventProgress.vue';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezonePlugin from 'dayjs/plugin/timezone';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import userStore from '../store/userStore';
import { formatEventDate, formatDateRange } from '../utils/dateUtils';
import 'dayjs/locale/en';
import 'dayjs/locale/es';
import 'dayjs/locale/fr';
import 'dayjs/locale/de';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);
dayjs.extend(localizedFormat);
dayjs.extend(advancedFormat);

const locale = userStore.locale || 'en';
dayjs.locale(locale);

const props = withDefaults(
  defineProps<{
    dateStart: string;
    dateEnd?: string;
    timezone?: string;
    day?: boolean;
    isDeadline?: boolean;
    type?: string;
    showCountdown?: boolean;
    showEnded?: boolean;
  }>(),
  {
    timezone: '',
    day: false,
    isDeadline: false,
    type: 'event',
    showCountdown: false,
    showEnded: false,
  }
);

// Maps timezone abbreviations to their full names
const timezoneFullNames: Record<string, string> = {
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
  'GMT+2': 'Greenwich Mean Time +2',
  'GMT+3': 'Greenwich Mean Time +3',
  'GMT+4': 'Greenwich Mean Time +4',
  'GMT+5': 'Greenwich Mean Time +5',
  'GMT+6': 'Greenwich Mean Time +6',
  'GMT+7': 'Greenwich Mean Time +7',
  'GMT+8': 'Greenwich Mean Time +8',
  'GMT+9': 'Greenwich Mean Time +9',
  'GMT+10': 'Greenwich Mean Time +10',
  'GMT+11': 'Greenwich Mean Time +11',
  'GMT+12': 'Greenwich Mean Time +12',
  'GMT+13': 'Greenwich Mean Time +13',
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
function getFullTimezoneName(abbreviation: string): string | null {
  return timezoneFullNames[abbreviation] || null;
}

/** Delegates to the shared formatEventDate utility (used for machine-readable datetimes) */
function formatDate(date: string | Date, format: string): string {
  return formatEventDate(date, format, {
    timezone: props.timezone,
    useLocalTimezone: userStore.useLocalTimezone,
    userTimezone: userStore.timezone || undefined,
    locale: userStore.locale || 'en',
  });
}

/** Locale-aware formatted date range, reactive to timezone preference */
const formattedRange = computed(() =>
  formatDateRange({
    dateStart: props.dateStart,
    dateEnd: props.dateEnd,
    timezone: props.timezone,
    useLocalTimezone: userStore.useLocalTimezone,
    userTimezone: userStore.timezone || undefined,
    locale: userStore.locale || 'en',
    day: props.day,
    type: props.type,
    isDeadline: props.isDeadline,
  })
);

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

/**
 * Computes if the event is international based on the absence of timezone
 * @returns {boolean} True if the event is international
 */
const isInternational = computed(() => !props.timezone);
</script>
