<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  isCallForSpeakersOpen,
  getEventUrl,
  getFormatLabel,
} from '../utils/eventUtils';
import EventDate from './EventDate.vue';
import EventDelivery from './EventDelivery.vue';
import EventChild from './EventChild.vue';
import type { Event as EventType } from '../types/event';

const props = withDefaults(
  defineProps<{
    event: EventType;
    showDate?: boolean;
    showCountdown?: boolean;
    showEnded?: boolean;
  }>(),
  {
    showDate: true,
    showCountdown: false,
    showEnded: false,
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
    .map(([format, count]) => {
      const label = getFormatLabel(format) || format;
      return `${count} ${label}${count > 1 ? 's' : ''}`;
    })
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
 * Shuffles an array using the Fisher-Yates algorithm.
 * @returns A new shuffled copy of the array.
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Speakers in randomised order, shuffled once at setup time.
 * Ensures consistent display during the session while distributing
 * visibility fairly across page loads.
 */
const shuffledSpeakers = ref(shuffleArray(eventSpeakers.value));

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
 * Unique ID for the event heading, used by aria-describedby on the website link.
 */
const headingId = computed(() => `event-title-${props.event._id}`);

/**
 * Formats speaker list for display.
 * If more than 3 speakers, shows 3 from a pre-shuffled order
 * (randomised once per page load) to distribute visibility fairly.
 * @returns {string} Formatted speaker list
 */
const speakerDisplay = computed(() => {
  if (!eventSpeakers.value) return '';
  const speakers = eventSpeakers.value.filter(
    (s) => s && typeof s === 'object' && s.name
  );
  if (speakers.length === 0) return '';

  if (speakers.length === 1) {
    return speakers[0].name;
  }

  if (speakers.length === 2) {
    return speakers.map((speaker) => speaker.name).join(' and ');
  }

  if (speakers.length === MAX_DISPLAYED_SPEAKERS) {
    const first = speakers
      .slice(0, MAX_DISPLAYED_SPEAKERS - 1)
      .map((speaker) => speaker.name)
      .join(', ');
    return `${first} and ${speakers[MAX_DISPLAYED_SPEAKERS - 1].name}`;
  }

  // Use pre-shuffled order (randomised once at setup) to avoid favouring any individual
  const displayed = shuffledSpeakers.value
    .filter((s) => s && typeof s === 'object' && s.name)
    .slice(0, MAX_DISPLAYED_SPEAKERS);

  const firstSpeakers = displayed.map((speaker) => speaker.name).join(', ');

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
    :data-event-type="event.type"
  >
    <h3 :id="headingId" class="event__title">
      <a v-if="eventUrl" :href="eventUrl">{{ event.title }}</a>
      <span v-else>{{ event.title }}</span>
    </h3>

    <EventDate
      v-if="showDate && event.dateStart"
      :dateStart="event.dateStart"
      :dateEnd="event.dateEnd"
      :timezone="event.timezone"
      :day="event.day"
      :type="event.type"
      :showCountdown="showCountdown"
      :showEnded="showEnded"
    />

    <div v-if="speakerDisplay" class="event__speakers text-small text-muted">
      featuring <span v-html="speakerDisplay"></span>
    </div>

    <EventDelivery
      :attendanceMode="event.attendanceMode"
      :location="event.location"
      :website="event.type !== 'theme' ? event.website : undefined"
      :headingId="headingId"
      v-if="event.type !== 'deadline'"
    />

    <details
      v-if="event.description && event.type !== 'theme'"
      class="event__children flow"
    >
      <summary>
        <wa-icon name="caret-right" auto-width></wa-icon>
        Description
      </summary>
      <p class="event__description">
        {{ event.description }}
      </p>
    </details>

    <template v-if="!isDedicatedToAccessibility">
      <details v-if="hasChildren" class="event__children flow flow-xs">
        <summary>
          <wa-icon name="caret-right" auto-width></wa-icon>
          Accessibility highlights: {{ enumeratedChildTypes }}
        </summary>
        <ol
          role="list"
          class="flow flow-xs"
          :aria-label="`Accessibility highlights for ${event.title}`"
        >
          <li v-for="child in event.children" :key="child._id">
            <EventChild :event="child" :showEnded="showEnded" />
          </li>
        </ol>
      </details>
      <details v-else-if="event.isParent" class="event__children flow">
        <summary>
          <wa-icon name="caret-right" auto-width></wa-icon>
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
      v-if="
        isDedicatedToAccessibility ||
        callForSpeakersOpen ||
        (event.isFree && event.type !== 'theme')
      "
    >
      <wa-badge pill variant="neutral" v-if="isDedicatedToAccessibility"
        >Dedicated to accessibility</wa-badge
      >
      <wa-badge
        variant="success"
        pill
        attention="pulse"
        v-if="callForSpeakersOpen"
        >Call for speakers</wa-badge
      >
      <wa-badge
        variant="neutral"
        pill
        v-if="event.isFree && event.type !== 'theme'"
        >Free</wa-badge
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
