<template>
  <!-- Countdown: event hasn't started yet (Today section only) -->
  <div v-if="isStartingSoon" class="event__progress">
    <span class="event__progress-label text-muted">{{ countdownLabel }}</span>
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
  <!-- Ended: event finished earlier today (Today section only) -->
  <div v-else-if="hasEnded" class="event__progress">
    <span
      class="event__progress-label text-muted"
      v-html="timeSinceEnded"
    ></span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import dayjs from '../lib/dayjs';
import { storedCalendarDate } from '../../netlify/edge-functions/lib/dateUtils';
import userStore from '../store/userStore';
import {
  isHappeningNow as _isHappeningNow,
  isStartingSoon as _isStartingSoon,
  hasEnded as _hasEnded,
  getProgress,
  getAllDayEventEnd,
  getTimeRemaining,
  getCountdownLabel,
  getTimeSinceEnded,
  type ProgressOptions,
} from '../utils/progressUtils';

const props = withDefaults(
  defineProps<{
    dateStart: string;
    dateEnd?: string;
    timezone?: string;
    useLocalTimezone?: boolean;
    preserveCalendarDate?: boolean;
    day?: boolean;
    type?: string;
    showCountdown?: boolean;
    showEnded?: boolean;
  }>(),
  {
    timezone: '',
    day: false,
    type: 'event',
    showCountdown: false,
    showEnded: false,
  }
);

const now = ref(dayjs());
const viewerTimezone = ref<string>();
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  viewerTimezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // Update "now" every minute so the bar advances in real time
  timer = setInterval(() => {
    now.value = dayjs();
  }, 60_000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

function allDayProgressDates(
  start: string,
  end: string | undefined,
  timezone: string
) {
  const dateStart = dayjs.tz(storedCalendarDate(start), timezone).toISOString();
  // The stored end date is inclusive, including when its timestamp is midnight.
  const dateEnd = end
    ? getAllDayEventEnd(end, timezone).toISOString()
    : undefined;
  return { dateStart, dateEnd, timezone };
}

const progressDates = computed(() => {
  if (!props.preserveCalendarDate) {
    return {
      dateStart: props.dateStart,
      dateEnd: props.dateEnd,
      timezone: props.timezone || undefined,
    };
  }

  return allDayProgressDates(
    props.dateStart,
    props.dateEnd,
    viewerTimezone.value || 'UTC'
  );
});

const options = computed<ProgressOptions>(() => ({
  ...progressDates.value,
  day: props.day,
  type: props.type,
  showCountdown: props.showCountdown,
  showEnded: props.showEnded,
  useLocalTimezone: !props.preserveCalendarDate && props.useLocalTimezone,
  userTimezone: userStore.timezone,
}));

const isHappeningNow = computed(() =>
  _isHappeningNow(now.value, options.value)
);
const isStartingSoon = computed(() =>
  _isStartingSoon(now.value, options.value)
);
const progress = computed(() => getProgress(now.value, options.value));
const timeRemaining = computed(() =>
  getTimeRemaining(now.value, options.value)
);
const countdownLabel = computed(() =>
  getCountdownLabel(
    now.value,
    options.value,
    viewerTimezone.value,
    userStore.locale || 'en'
  )
);
const hasEnded = computed(() => _hasEnded(now.value, options.value));
const timeSinceEnded = computed(() =>
  getTimeSinceEnded(now.value, options.value)
);
const accessibleLabel = computed(() => `${progress.value}% complete`);
</script>

<style scoped>
.event__progress {
  display: flex;
  align-items: center;
  gap: 0.5em;
  flex-basis: 100%;
}

@media (min-width: 768px) {
  .event__progress {
    margin-left: auto;
    flex-basis: auto;
  }
}

.event__progress-bar {
  --track-height: 0.35rem;
  --indicator-color: var(--c-progress-color-indicator);
  --track-color: var(--wa-color-neutral-fill-normal);
  width: 4rem;
  border-radius: var(--wa-border-radius-pill);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 var(--c-progress-color-indicator);
  }
  70% {
    box-shadow: 0 0 0 0.5rem transparent;
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  .event__progress-bar {
    animation: none;
  }
}

.event__progress-label {
  white-space: nowrap;
}
</style>
