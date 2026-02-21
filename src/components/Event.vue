<script setup lang="ts">
import { computed } from 'vue';
import { isCallForSpeakersOpen, getEventUrl } from '../utils/eventUtils';
import Icon from './Icon.vue';
import EventDate from './EventDate.vue';
import EventDelivery from './EventDelivery.vue';
import EventChild from './EventChild.vue';
import type { Event as EventType, Speaker } from '../types/event';

const props = withDefaults(
  defineProps<{
    event: EventType;
    showDate?: boolean;
  }>(),
  {
    showDate: true,
  }
);

/**
 * Checks if event has child events (e.g., conference tracks, sessions)
 * @returns {boolean} True if event has children
 */
const hasChildren = computed(
  () => Array.isArray(props.event.children) && props.event.children.length > 0
);

/**
 * Checks if call for speakers is currently open
 * @returns {boolean} True if call for speakers is open
 */
const callForSpeakersOpen = computed(() => isCallForSpeakersOpen(props.event));

/**
 * Enumerates child event types and their counts
 * @returns {string} Formatted string of child event types and counts
 */
const enumeratedChildTypes = computed(() => {
  if (!props.event.children) return '';
  const counts: Record<string, number> = {};
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
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array} array - The array to shuffle
 * @returns {Array} The shuffled array (same reference)
 */
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Determines if an event is dedicated to accessibility
 * True if event is not marked as a parent and is not a child event
 */
const isDedicatedToAccessibility = computed(() => {
  return (
    !props.event.isParent &&
    props.event.parent === undefined &&
    props.event.type !== 'theme'
  );
});

/**
 * Internal URL for the event detail page, or undefined if no slug.
 */
const eventUrl = computed(() => getEventUrl(props.event));

/**
 * Formats speaker list for display
 * If more than 3 speakers, randomly selects 3 to display and shows count of remaining.
 * This avoids giving preferential visibility to any particular speaker.
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

  // Randomise which speakers are shown to avoid favouring any individual
  const shuffled = shuffleArray([...speakers]);

  const firstSpeakers = shuffled
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
      v-if="showDate && event.dateStart"
      :dateStart="event.dateStart"
      :timezone="event.timezone"
      :isDeadline="true"
    />
    <span class="event__title"
      >Submit proposals for
      <a :href="eventUrl || event.website">{{ event.title }}</a></span
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
      <a v-if="eventUrl" :href="eventUrl">{{ event.title }}</a>
      <span v-else>{{ event.title }}</span>
    </h3>
    <meta v-if="event.website" itemprop="url" :content="event.website" />

    <EventDate
      v-if="showDate && event.dateStart"
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
      class="event__children flow"
    >
      <summary>
        <Icon name="caret-right" />
        Description
      </summary>
      <p class="event__description" itemprop="description">
        {{ event.description }}
      </p>
    </details>

    <template v-if="!isDedicatedToAccessibility">
      <details v-if="hasChildren" class="event__children flow flow-xs">
        <summary>
          <Icon name="caret-right" />
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
      <details v-else-if="event.isParent" class="event__children flow">
        <summary>
          <Icon name="caret-right" />
          Schedule not yet announced
        </summary>
        <p>
          {{ event.title }} is expected to include one or more
          accessibility-themed sessions but the full schedule has not yet been
          announced. Details will be published here closer to the date of the
          event.
        </p>
      </details>
    </template>

    <div
      class="event__badges"
      v-if="isDedicatedToAccessibility || callForSpeakersOpen"
    >
      <sl-badge pill variant="neutral" v-if="isDedicatedToAccessibility"
        >Dedicated to accessibility</sl-badge
      >
      <sl-badge variant="success" pill v-if="callForSpeakersOpen"
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
