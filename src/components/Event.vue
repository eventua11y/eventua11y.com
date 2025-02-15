<script setup>
import { computed } from 'vue';
import dayjs from 'dayjs';
import EventDate from './EventDate.vue';
import EventDelivery from './EventDelivery.vue';
import EventChild from './EventChild.vue';

/**
 * Event component displays a single event with its details
 * Props:
 * @prop {Object} event - Event object containing title, type, dates, and other metadata
 */
const props = defineProps({
  event: {
    type: Object,
    required: true,
    validator: (event) => {
      return event.title && event.type;
    },
  },
  showDate: {
    type: Boolean,
    default: true,
  },
});

/**
 * Checks if event has child events (e.g., conference tracks, sessions)
 * @returns {boolean} True if event has children
 */
const hasChildren = computed(
  () => Array.isArray(props.event.children) && props.event.children.length > 0
);

/**
 * Checks if call for speakers is currently open
 * Returns true if:
 * - Event has call for speakers enabled AND
 * - Either no closing date is set OR current date is before closing date
 * @returns {boolean} True if call for speakers is open
 */
const isCallForSpeakersOpen = computed(() => {
  if (!props.event.callForSpeakers) return false;
  if (!props.event.callForSpeakersClosingDate) return true;
  return dayjs().isBefore(dayjs(props.event.callForSpeakersClosingDate));
});

/**
 * Enumerates child event types and their counts
 * @returns {string} Formatted string of child event types and counts
 */
const enumeratedChildTypes = computed(() => {
  if (!props.event.children) return '';
  const counts = {};
  props.event.children.forEach((child) => {
    if (!child.format) return;
    if (!counts[child.format]) counts[child.format] = 0;
    counts[child.format]++;
  });
  return Object.entries(counts)
    .map(([format, count]) => `${count} ${format}${count > 1 ? 's' : ''}`)
    .join(', ');
});

/**
 * Gets all speakers from child events or the event itself
 * @returns {Array} Combined array of speakers from child events or the event itself
 */
const eventSpeakers = computed(() => {
  if (!props.event?.type) return [];

  // If event has children, collect and deduplicate speakers from all child events
  if (Array.isArray(props.event.children) && props.event.children.length > 0) {
    return props.event.children
      .flatMap((child) =>
        Array.isArray(child?.speakers) ? child.speakers : []
      )
      .filter((speaker) => speaker?.name && speaker?._id)
      .filter(
        (speaker, index, self) =>
          // Remove duplicates by _id
          index === self.findIndex((s) => s?._id === speaker?._id)
      );
  }

  // Otherwise return the event's own speakers (if any)
  return Array.isArray(props.event.speakers)
    ? props.event.speakers.filter((speaker) => speaker?.name && speaker?._id)
    : [];
});

const MAX_DISPLAYED_SPEAKERS = 3;

/**
 * Formats speaker list for display
 * If more than 3 speakers, shows first 3 and count of remaining
 * @returns {string} Formatted speaker list with HTML
 */
const speakerDisplay = computed(() => {
  if (!eventSpeakers.value) return '';
  const speakers = eventSpeakers.value.filter(
    (s) => s && typeof s === 'object' && s.name
  );
  if (speakers.length === 0) return '';

  if (speakers.length === 1) {
    return `<span itemprop="performer" itemscope itemtype="https://schema.org/Person"><span itemprop="name">${speakers[0].name}</span></span>`;
  }

  if (speakers.length === 2) {
    return speakers
      .map(
        (speaker) =>
          `<span itemprop="performer" itemscope itemtype="https://schema.org/Person"><span itemprop="name">${speaker.name}</span></span>`
      )
      .join(' and ');
  }

  if (speakers.length === MAX_DISPLAYED_SPEAKERS) {
    const first = speakers
      .slice(0, MAX_DISPLAYED_SPEAKERS - 1)
      .map(
        (speaker) =>
          `<span itemprop="performer" itemscope itemtype="https://schema.org/Person"><span itemprop="name">${speaker.name}</span></span>`
      )
      .join(', ');
    return `${first} and <span itemprop="performer" itemscope itemtype="https://schema.org/Person"><span itemprop="name">${speakers[MAX_DISPLAYED_SPEAKERS - 1].name}</span></span>`;
  }

  const firstSpeakers = speakers
    .slice(0, MAX_DISPLAYED_SPEAKERS)
    .map(
      (speaker) =>
        `<span itemprop="performer" itemscope itemtype="https://schema.org/Person"><span itemprop="name">${speaker.name}</span></span>`
    )
    .join(', ');

  return `${firstSpeakers}, and ${speakers.length - MAX_DISPLAYED_SPEAKERS} other speaker${speakers.length - MAX_DISPLAYED_SPEAKERS > 1 ? 's' : ''}`;
});
</script>

<template>
  <div v-if="event && event.type === 'deadline'" class="event event--deadline">
    <EventDate
      v-if="showDate"
      :dateStart="event.dateStart"
      :timezone="event.timezone"
      :isDeadline="true"
    />
    <span class="event__title"
      >Submit proposals for <a :href="event.website">{{ event.title }}</a></span
    >
  </div>
  <article
    v-else-if="event && event.type"
    :class="`event event--${event.type}`"
    itemscope
    itemtype="https://schema.org/Event"
    :data-event-type="event.type"
  >
    <h3 class="event__title" itemprop="name">
      <a v-if="event.website" :href="event.website" itemprop="url">{{
        event.title
      }}</a>
      <span v-else>{{ event.title }}</span>
    </h3>

    <EventDate
      v-if="showDate"
      :dateStart="event.dateStart"
      :dateEnd="event.dateEnd"
      :timezone="event.timezone"
      :day="event.day"
      :type="event.type"
    />

    <div v-if="speakerDisplay" class="event__speakers text-small text-muted">
      featuring <span v-html="speakerDisplay"></span>
    </div>

    <EventDelivery
      :attendanceMode="event.attendanceMode"
      :location="event.location"
      v-if="event.type !== 'deadline'"
    />

    <details
      v-if="event.description && event.type !== 'theme'"
      class="event__description flow"
    >
      <summary>
        <i class="icon fa-solid fa-caret-right"></i>
        Description
      </summary>
      <p itemprop="description">{{ event.description }}</p>
    </details>

    <details
      v-if="hasChildren && event.type !== 'theme'"
      class="event__children flow flow-xs"
    >
      <summary>
        <i class="icon fa-solid fa-caret-right"></i>
        Accessibility highlights: {{ enumeratedChildTypes }}
      </summary>
      <ol
        role="list"
        class="flow flow-xs"
        :aria-label="`Accessibility highlights for ${event.title}`"
      >
        <li v-for="child in event.children" :key="child._id">
          <EventChild :event="child" />
        </li>
      </ol>
    </details>
    <details
      v-else-if="event.parent === undefined && event.type !== 'theme'"
      class="event__children flow"
    >
      <summary>
        <i class="icon fa-solid fa-caret-right"></i>
        Schedule not yet announced
      </summary>
      <p>
        {{ event.title }} is expected to include one or more
        accessibility-themed sessions but the full schedule has not yet been
        announced. Details will be published here closer to the date of the
        event.
      </p>
    </details>

    <div
      class="event__badges"
      v-if="
        (!event.parent && !hasChildren && event.type !== 'theme') ||
        isCallForSpeakersOpen
      "
    >
      <sl-badge
        pill
        variant="neutral"
        v-if="!event.parent && !hasChildren && event.type !== 'theme'"
        >Dedicated to accessibility</sl-badge
      >
      <sl-badge variant="success" pill v-if="isCallForSpeakersOpen"
        >Call for speakers</sl-badge
      >
    </div>
  </article>
  <div v-else class="event event--loading">Loading...</div>
</template>

<style scoped>
.event__badges {
  display: flex;
  flex-wrap: wrap;
  column-gap: var(--p-space-3xs);
  row-gap: var(--p-space-3xs);
}
</style>
