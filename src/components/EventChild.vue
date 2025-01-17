<script setup>
import { computed } from 'vue';
import EventDate from './EventDate.vue';
import EventDuration from './EventDuration.vue';

/**
 * Child event component (e.g., conference session, workshop)
 * Renders a sub-event with its title, format, date and duration
 */

const props = defineProps({
  event: {
    type: Object,
    required: true,
    validator: (event) => {
      return event.title;
    },
  },
});

/**
 * Mapping of event format codes to display strings
 * Used to convert format property to human-readable text
 */
const formatStrings = {
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
  const prepositions = {
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
  return prepositions[props.event.format] || 'by'; // fallback to 'by' if format not found
});

const speakersList = computed(() => {
  if (!props.event.speakers?.length) return '';
  return props.event.speakers
    .map((speaker) => `<span itemprop="name">${speaker.name}</span>`)
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

    <div class="event__speakers text-muted text-small">
      {{ displayFormat }}
      <template v-if="event.speakers?.length">
        {{ formatPreposition }}
        <span
          itemprop="performer"
          itemscope
          itemtype="https://schema.org/Person"
          v-html="speakersList"
        ></span>
      </template>
    </div>

    <div class="event__meta text-muted">
      <template v-if="event.scheduled">
        <EventDate
          :dateStart="event.dateStart"
          :dateEnd="event.dateEnd"
          :timezone="event.timezone"
          :day="event.day"
          :type="event.type"
        />
        ·
        <EventDuration :event="event" />
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
