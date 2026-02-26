<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import dayjs from 'dayjs';
import EventDate from './EventDate.vue';
import EventDuration from './EventDuration.vue';
import type { ChildEvent } from '../types/event';
import { isHappeningNow } from '../utils/progressUtils';

const props = defineProps<{
  event: ChildEvent;
}>();

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

/** Whether the child event is currently in progress (hides duration). */
const inProgress = computed(() =>
  isHappeningNow(now.value, {
    dateStart: props.event.dateStart || '',
    dateEnd: props.event.dateEnd,
    timezone: props.event.timezone,
    day: props.event.day,
    type: props.event.type,
  })
);

/** Mapping of event format codes to display strings. */
const formatStrings: Record<string, string> = {
  talk: 'Talk',
  tutorial: 'Tutorial',
  workshop: 'Workshop',
  webinar: 'Webinar',
  panel: 'Panel',
  meetup: 'Meetup',
  interview: 'Interview',
  qna: 'Q&A',
  keynote: 'Keynote',
  roundtable: 'Roundtable',
};

/**
 * Computes display format string from event format
 * Falls back to raw format value if no mapping exists
 * @returns {string} Human-readable format string
 */
const displayFormat = computed(
  () => formatStrings[props.event.format] || props.event.format
);

const formatPreposition = computed(() => {
  const prepositions: Record<string, string> = {
    talk: 'by',
    tutorial: 'by',
    workshop: 'with',
    webinar: 'with',
    panel: 'with',
    meetup: 'with',
    interview: 'with',
    qna: 'with',
    keynote: 'by',
    roundtable: 'with',
  };
  return (props.event.format && prepositions[props.event.format]) || 'by';
});

const speakersList = computed(() => {
  if (!props.event.speakers?.length) return '';
  return props.event.speakers
    .map(
      (speaker) =>
        `<span itemprop="performer" itemscope itemtype="https://schema.org/Person"><span itemprop="name">${speaker.name}</span></span>`
    )
    .join(', ');
});
</script>

<template>
  <article
    class="child-event"
    itemprop="subEvent"
    itemscope
    itemtype="https://schema.org/Event"
  >
    <span class="child-event__title" itemprop="name">
      <a v-if="event.website" :href="event.website">{{ event.title }}</a>
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
        />
        <template v-if="event.dateEnd && !inProgress">
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
