<script setup lang="ts">
import { computed } from 'vue';
import { getEventUrl } from '../utils/eventUtils';
import EventDate from './EventDate.vue';
import EventDuration from './EventDuration.vue';
import type { ChildEvent } from '../types/event';

const props = defineProps<{
  event: ChildEvent;
}>();

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

/**
 * Internal URL for the child event detail page, or undefined if no slug.
 */
const childEventUrl = computed(() => getEventUrl(props.event));

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
        />
        <template v-if="event.dateEnd">
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
