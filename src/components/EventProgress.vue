<template>
  <div v-if="isHappeningNow" class="event__progress">
    <wa-progress-bar
      :value="progress"
      :label="`${Math.round(progress)}% elapsed`"
      class="event__progress-bar"
    ></wa-progress-bar>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezonePlugin from 'dayjs/plugin/timezone';
import userStore from '../store/userStore';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

const props = withDefaults(
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

const now = ref(dayjs());
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  // Update "now" every minute so the bar advances in real time
  timer = setInterval(() => {
    now.value = dayjs();
  }, 60_000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

/**
 * Resolves the effective timezone for date comparisons.
 * Matches the logic used elsewhere in the app (dateUtils resolveTimezone).
 */
function tz(): string {
  if (userStore.useLocalTimezone) {
    return userStore.timezone || 'UTC';
  }
  return props.timezone || 'UTC';
}

/**
 * Returns the event start as a dayjs instance in the resolved timezone.
 */
const eventStart = computed(() => {
  if (!props.timezone) {
    return dayjs.utc(props.dateStart);
  }
  return dayjs.utc(props.dateStart).tz(tz());
});

/**
 * Returns the event end as a dayjs instance in the resolved timezone.
 */
const eventEnd = computed(() => {
  if (props.dateEnd) {
    if (!props.timezone) {
      return dayjs.utc(props.dateEnd);
    }
    return dayjs.utc(props.dateEnd).tz(tz());
  }
  return eventStart.value.endOf('day');
});

/**
 * Whether the event is actively in progress right now.
 * Excludes all-day events, theme/awareness days, and deadlines
 * since a progress bar would not be meaningful for those.
 */
const isHappeningNow = computed(() => {
  if (props.day) return false;
  if (props.type === 'theme') return false;
  if (props.type === 'deadline') return false;
  if (!props.dateEnd) return false;

  const current = now.value;
  return current.isAfter(eventStart.value) && current.isBefore(eventEnd.value);
});

/**
 * Percentage of the event's duration that has elapsed (0-100).
 */
const progress = computed(() => {
  if (!isHappeningNow.value) return 0;

  const total = eventEnd.value.diff(eventStart.value);
  if (total <= 0) return 0;

  const elapsed = now.value.diff(eventStart.value);
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
});
</script>

<style scoped>
.event__progress {
  margin-left: auto;
  width: 5rem;
  align-self: center;
}

.event__progress-bar {
  --track-height: 0.35rem;
  --indicator-color: var(--wa-color-brand-fill-loud);
  --track-color: var(--wa-color-neutral-fill-normal);
}
</style>
