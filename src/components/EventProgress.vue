<template>
  <!-- Countdown: event hasn't started yet (Today section only) -->
  <div v-if="isStartingSoon" class="event__progress">
    <span
      class="event__progress-label text-muted"
      v-html="countdownLabel"
    ></span>
  </div>
  <!-- Progress: event is in progress -->
  <div v-else-if="isHappeningNow" class="event__progress">
    <wa-progress-bar
      :value="progress"
      :label="accessibleLabel"
      class="event__progress-bar"
    ></wa-progress-bar>
    <span
      class="event__progress-label text-muted"
      v-html="timeRemaining"
    ></span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezonePlugin from 'dayjs/plugin/timezone';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import userStore from '../store/userStore';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

const props = withDefaults(
  defineProps<{
    dateStart: string;
    dateEnd?: string;
    timezone?: string;
    day?: boolean;
    type?: string;
    showCountdown?: boolean;
  }>(),
  {
    timezone: '',
    day: false,
    type: 'event',
    showCountdown: false,
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
 * Whether this is a multi-day all-day event (day flag set, with an end
 * date on a different calendar day than the start).
 */
const isMultiDayAllDay = computed(() => {
  if (!props.day || !props.dateEnd) return false;
  return !eventStart.value.isSame(eventEnd.value, 'day');
});

/**
 * Whether the event has a specific (non-all-day) end time.
 */
const hasSpecificEndTime = computed(() => {
  return !props.day && !!props.dateEnd;
});

/**
 * The effective end point used for progress calculation.
 *
 * - Timed events: use the actual end time.
 * - Multi-day all-day events: use end-of-today in the resolved timezone
 *   because we know the event ends today but not at what time.
 */
const effectiveEnd = computed(() => {
  if (isMultiDayAllDay.value) {
    const timezone = tz();
    return now.value.tz(timezone).endOf('day');
  }
  return eventEnd.value;
});

/**
 * Whether the event is actively in progress right now.
 *
 * Excluded:
 * - Theme/awareness days and deadlines (not meaningful)
 * - Single-day all-day events (we don't know when they end)
 *
 * Included:
 * - Timed events with an end time where now is between start and end
 * - Multi-day all-day events where today falls within the date range
 */
const isHappeningNow = computed(() => {
  if (props.type === 'theme') return false;
  if (props.type === 'deadline') return false;

  // Single-day all-day: can't show progress, we don't know the end time
  if (props.day && !isMultiDayAllDay.value) return false;

  // Must have an end date
  if (!props.dateEnd) return false;

  const current = now.value;
  return current.isAfter(eventStart.value) && current.isBefore(eventEnd.value);
});

/**
 * Whether the event hasn't started yet but starts later today.
 * Only active when showCountdown is true (Today section).
 * Excludes themes, deadlines, and all-day events (no specific start time).
 */
const isStartingSoon = computed(() => {
  if (!props.showCountdown) return false;
  if (props.type === 'theme') return false;
  if (props.type === 'deadline') return false;
  if (props.day) return false;

  return now.value.isBefore(eventStart.value);
});

/** Wraps time abbreviations in <abbr> elements. */
const HR = '<abbr title="hours">hr</abbr>';
const M = '<abbr title="minutes">m</abbr>';

/**
 * Countdown label for events that haven't started yet.
 * Uses the same hours/minutes format as timeRemaining.
 * Returns HTML with <abbr> elements for abbreviations.
 */
const countdownLabel = computed(() => {
  if (!isStartingSoon.value) return '';

  const minutesUntil = Math.max(0, eventStart.value.diff(now.value, 'minute'));

  if (minutesUntil < 1) return `Starts in less than 1${M}`;
  if (minutesUntil < 60) return `Starts in ${minutesUntil}${M}`;

  const hours = Math.floor(minutesUntil / 60);
  const mins = minutesUntil % 60;

  if (mins === 0) return `Starts in ${hours}${HR}`;
  return `Starts in ${hours}${HR} ${mins}${M}`;
});

/**
 * Percentage of the event's duration that has elapsed (0-100).
 * For multi-day all-day events, progress is measured against end-of-today.
 */
const progress = computed(() => {
  if (!isHappeningNow.value) return 0;

  const total = effectiveEnd.value.diff(eventStart.value);
  if (total <= 0) return 0;

  const elapsed = now.value.diff(eventStart.value);
  return Math.round(Math.min(100, Math.max(0, (elapsed / total) * 100)));
});

/**
 * Whether the event end falls on the same calendar day as right now
 * in the resolved timezone.
 */
const endsToday = computed(() => {
  const timezone = tz();
  const todayInTz = now.value.tz(timezone);
  return eventEnd.value.isSame(todayInTz, 'day');
});

/**
 * Human-readable time remaining label.
 *
 * - Multi-day all-day events: "Ends today"
 * - Timed events ending today: "Ends in 2hr 15m", "Ends in 45m"
 * - Timed events ending tomorrow: "Ends tomorrow"
 * - Timed events ending further out: "Ends in 3 days"
 */
const timeRemaining = computed(() => {
  if (!isHappeningNow.value) return '';

  if (isMultiDayAllDay.value) {
    return 'Ends today';
  }

  // For timed events ending today, show hours/minutes
  if (endsToday.value) {
    const minutesLeft = Math.max(0, eventEnd.value.diff(now.value, 'minute'));

    if (minutesLeft < 1) return `Ends in less than 1${M}`;
    if (minutesLeft < 60) return `Ends in ${minutesLeft}${M}`;

    const hours = Math.floor(minutesLeft / 60);
    const mins = minutesLeft % 60;

    if (mins === 0) return `Ends in ${hours}${HR}`;
    return `Ends in ${hours}${HR} ${mins}${M}`;
  }

  // For timed events ending on a future day, show days
  const timezone = tz();
  const todayStart = now.value.tz(timezone).startOf('day');
  const endDay = eventEnd.value.startOf('day');
  const daysAway = endDay.diff(todayStart, 'day');

  if (daysAway === 1) return 'Ends tomorrow';
  return `Ends in ${daysAway} days`;
});

/**
 * Accessible label for the progress bar.
 */
const accessibleLabel = computed(() => {
  return `${progress.value}% complete`;
});
</script>

<style scoped>
.event__progress {
  display: flex;
  align-items: center;
  gap: 0.5em;
  flex-basis: 100%;
}

@media (min-width: 580px) {
  .event__progress {
    margin-left: auto;
    flex-basis: auto;
  }
}

.event__progress-bar {
  --track-height: 0.35rem;
  --indicator-color: var(--wa-color-brand-fill-loud);
  --track-color: var(--wa-color-neutral-fill-normal);
  width: 4rem;
}

.event__progress-label {
  white-space: nowrap;
}
</style>
