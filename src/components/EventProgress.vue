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
import userStore from '../store/userStore';
import {
  isHappeningNow as _isHappeningNow,
  isStartingSoon as _isStartingSoon,
  getProgress,
  getTimeRemaining,
  getCountdownLabel,
  type ProgressOptions,
} from '../utils/progressUtils';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

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

/** Builds the ProgressOptions from component props and user store. */
const options = computed<ProgressOptions>(() => ({
  dateStart: props.dateStart,
  dateEnd: props.dateEnd,
  timezone: props.timezone || undefined,
  day: props.day,
  type: props.type,
  showCountdown: props.showCountdown,
  useLocalTimezone: userStore.useLocalTimezone,
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
  getCountdownLabel(now.value, options.value)
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
