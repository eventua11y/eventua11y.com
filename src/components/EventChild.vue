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
  workshop: 'Workshop',
  webinar: 'Webinar',
  panel: 'Panel',
  meetup: 'Meetup',
  interview: 'Interview',
  qna: 'Q&A',
  keynote: 'Keynote',
};

/**
 * Computes display format string from event format
 * Falls back to raw format value if no mapping exists
 * @returns {string} Human-readable format string
 */
const displayFormat = computed(
  () => formatStrings[props.event.format] || props.event.format
);
</script>

<template>
  <article
    class="flow-s"
    itemprop="subEvent"
    itemscope
    itemtype="https://schema.org/Event"
  >
    <span itemprop="name">
      <a v-if="event.website" :href="event.website">{{ event.title }}</a>
      <span v-else>{{ event.title }}</span>
    </span>

    <div class="event__meta text-muted">
      <template v-if="event.scheduled">
        {{ displayFormat }} <span>·</span> <EventDate :event="event" /> ·
        <EventDuration :event="event" />
      </template>
      <template v-else>
        {{ displayFormat }} <span>·</span> Not yet scheduled
      </template>
    </div>
  </article>
</template>
