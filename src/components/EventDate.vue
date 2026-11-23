<template>
  <div class="event__dates">
    <!-- Human-readable date range with machine-readable <time> elements -->
    <span class="event__dateRange">
      <time :datetime="machineStart">{{ formattedRange[0] }}</time
      ><template v-if="formattedRange[1]"
        ><span aria-hidden="true"> &ndash; </span
        ><span class="sr-only">until</span></template
      ><span class="event__time-tz"
        ><time v-if="formattedRange[1]" :datetime="machineEnd">{{
          formattedRange[1]
        }}</time
        ><template v-if="showTimezone"
          >{{ ' '
          }}<TimezoneConversion
            v-if="timezone && !isDateOnly"
            :dateStart="dateStart"
            :dateEnd="dateEnd"
            :timezone="timezone"
            :abbreviation="currentTimezone"
          /><abbr
            v-else
            :title="getFullTimezoneName(currentTimezone) || undefined"
            >{{ currentTimezone }}</abbr
          ></template
        ></span
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
import { computed, onMounted, ref } from 'vue';
import EventProgress from './EventProgress.vue';
import TimezoneConversion from './TimezoneConversion.vue';
import dayjs from '../lib/dayjs';
import userStore from '../store/userStore';
import {
  formatEventDate,
  formatDateRange,
  resolveTimezone,
} from '../utils/dateUtils';
import 'dayjs/locale/en';
import 'dayjs/locale/es';
import 'dayjs/locale/fr';
import 'dayjs/locale/de';

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
    isPast?: boolean;
    showCountdown?: boolean;
    showEnded?: boolean;
  }>(),
  {
    timezone: '',
    day: false,
    isDeadline: false,
    type: 'event',
    isPast: false,
    showCountdown: false,
    showEnded: false,
  }
);

const deviceTimezone = ref('');
onMounted(() => {
  deviceTimezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
});

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
    timezone: displayTimezone.value,
    useLocalTimezone: isDateOnly.value && userStore.useLocalTimezone,
    userTimezone: userStore.timezone || undefined,
    locale: userStore.locale || 'en',
  });
}

/** Locale-aware formatted date range */
const formattedRange = computed(() =>
  formatDateRange({
    dateStart: props.dateStart,
    dateEnd: props.dateEnd,
    timezone: displayTimezone.value,
    useLocalTimezone: isDateOnly.value && userStore.useLocalTimezone,
    userTimezone: userStore.timezone || undefined,
    locale: userStore.locale || 'en',
    day: props.day,
    type: props.type,
    isDeadline: props.isDeadline,
    isPast: props.isPast,
  })
);

const currentTimezone = computed(() => {
  const date = dayjs.utc(props.dateStart);
  const tz = resolveTimezone({
    timezone: displayTimezone.value,
    useLocalTimezone: isDateOnly.value && userStore.useLocalTimezone,
    userTimezone: userStore.timezone || undefined,
  });
  return date.tz(tz).format('z');
});

const displayTimezone = computed(
  () => props.timezone || (!isDateOnly.value ? deviceTimezone.value : '')
);

const showTimezone = computed(() => !!displayTimezone.value);

/** Whether the event uses date-only display (no times shown) */
const isDateOnly = computed(
  () => props.day || props.type === 'theme' || props.isDeadline
);

/** Machine-readable datetime format for the <time> element */
const machineFormat = computed(() =>
  isDateOnly.value ? 'YYYY-MM-DD' : 'YYYY-MM-DDTHH:mm:ssZ'
);

/** Machine-readable start date for the start <time> element */
const machineStart = computed(() =>
  formatDate(props.dateStart, machineFormat.value)
);

/** Machine-readable end date for the end <time> element */
const machineEnd = computed(() =>
  props.dateEnd ? formatDate(props.dateEnd, machineFormat.value) : undefined
);
</script>
