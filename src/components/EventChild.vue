<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import dayjs from 'dayjs';
import {
  getEventUrl,
  FORMAT_LABELS,
  getFormatPreposition,
} from '../utils/eventUtils';
import EventDate from './EventDate.vue';
import EventDuration from './EventDuration.vue';
import type { ChildEvent } from '../types/event';
import { isHappeningNow, hasEnded as _hasEnded } from '../utils/progressUtils';

const props = withDefaults(
  defineProps<{
    event: ChildEvent;
    showEnded?: boolean;
  }>(),
  {
    showEnded: false,
  }
);

const now = ref(dayjs());
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  timer = setInterval(() => {
    now.value = dayjs();
  }, 60_000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

/** Common progress options for this child event. */
const progressOptions = computed(() => ({
  dateStart: props.event.dateStart || '',
  dateEnd: props.event.dateEnd,
  timezone: props.event.timezone,
  day: props.event.day,
  type: props.event.type,
  showEnded: props.showEnded,
}));

/** Whether the child event is currently in progress (hides duration). */
const inProgress = computed(() =>
  isHappeningNow(now.value, progressOptions.value)
);

/** Whether the child event has ended (hides duration in Today section). */
const ended = computed(() => _hasEnded(now.value, progressOptions.value));

/**
 * Computes display format string from event format
 * Falls back to raw format value if no mapping exists
 * @returns {string} Human-readable format string
 */
const displayFormat = computed(
  () => FORMAT_LABELS[props.event.format] || props.event.format
);

const formatPreposition = computed(() =>
  getFormatPreposition(props.event.format)
);

/**
 * Internal URL for the child event detail page, or undefined if no slug.
 */
const childEventUrl = computed(() => getEventUrl(props.event));

const speakersList = computed(() => {
  if (!props.event.speakers?.length) return '';
  return props.event.speakers
    .map((speaker) => `<span>${speaker.name}</span>`)
    .join(', ');
});
</script>

<template>
  <article class="child-event">
    <span class="child-event__title">
      <a v-if="childEventUrl" :href="childEventUrl">{{ event.title }}</a>
      <a v-else-if="event.website" :href="event.website">{{ event.title }}</a>
      <span v-else>{{ event.title }}</span>
    </span>

    <div class="event__speakers text-small">
      {{ displayFormat }}
      <template v-if="event.speakers?.length">
        {{ formatPreposition }}
        <span v-html="speakersList"></span>
      </template>
    </div>

    <div class="event__meta">
      <template v-if="event.scheduled">
        <EventDate
          v-if="event.dateStart"
          :dateStart="event.dateStart"
          :dateEnd="event.dateEnd"
          :timezone="event.timezone"
          :day="event.day"
          :type="event.type"
          :showEnded="showEnded"
        />
        <template v-if="event.dateEnd && !inProgress && !ended">
          · <EventDuration :event="event" />
        </template>
      </template>
      <template v-else> Not yet scheduled </template>
    </div>
  </article>
</template>

<style>
.child-event__title {
  margin-bottom: var(--p-space-3xs);
}
</style>
