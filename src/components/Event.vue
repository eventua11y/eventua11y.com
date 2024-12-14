<script setup>
import { computed } from 'vue';
import EventDate from './EventDate.vue';
import EventDelivery from './EventDelivery.vue';
import EventChild from './EventChild.vue';

const props = defineProps({
  event: {
    type: Object,
    required: true,
    validator: (event) => {
      return event.title && event.type;
    }
  }
});

const hasChildren = computed(() =>
  props.event.children && props.event.children.length > 0
);

const childrenCount = computed(() =>
  hasChildren.value ? props.event.children.length : 0
);

const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    return date.toLocaleDateString('en-GB', {
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Date unavailable';
  }
};
</script>

<template>
  <article :class="`event event--${event.type}`" itemscope itemtype="https://schema.org/Event"
    :data-event-type="event.type">
    <h3 class="event__title">
      <a v-if="event.website" :href="event.website" itemprop="url">{{ event.title }}</a>
      <span v-else>{{ event.title }}</span>
    </h3>

    <EventDate :event="event" />
    <EventDelivery :attendanceMode="event.attendanceMode" :location="event.location" />

    <details v-if="event.description && event.type !== 'theme'" class="event__description flow">
      <summary>
        <i class="icon fa-solid fa-caret-right"></i>
        Description
      </summary>
      <p itemprop="description">{{ event.description }}</p>
    </details>

    <details v-if="hasChildren" class="event__children flow">
      <summary>
        <i class="icon fa-solid fa-caret-right"></i>
        {{ childrenCount }} accessibility highlights
      </summary>
      <EventChild v-for="child in event.children" :key="child._id" :event="child" />
    </details>

    <div v-if="event.callForSpeakers" class="event__badges">
      <sl-badge variant="success" pill pulse>
        Call for speakers
      </sl-badge>
      <small v-if="event.callForSpeakersClosingDate" class="text-muted">
        Closes: {{ formatDate(event.callForSpeakersClosingDate) }}
      </small>
    </div>
  </article>
</template>