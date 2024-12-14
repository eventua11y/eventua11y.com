<script setup>
import { computed } from 'vue';
import EventDate from './EventDate.vue';
import EventDuration from './EventDuration.vue';

const props = defineProps({
  event: {
    type: Object,
    required: true,
    validator: (event) => {
      return event.title;
    },
  },
});

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
