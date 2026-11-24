<script lang="ts">
let nextPopoverId = 0;
</script>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import dayjs from '../lib/dayjs';
import userStore from '../store/userStore';

const props = withDefaults(
  defineProps<{
    dateStart: string;
    dateEnd?: string;
    timezone: string;
    abbreviation: string;
    placement?: 'top' | 'bottom';
  }>(),
  { placement: 'top' }
);

const popoverId = ref('');
const deviceTimezone = ref('');
const expanded = ref(false);
const trigger = ref<HTMLButtonElement | null>(null);
const popover = ref<HTMLDivElement | null>(null);
const arrowSide = ref<'top' | 'bottom' | null>(null);
const arrowOffset = ref(0);

onMounted(() => {
  deviceTimezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if ('showPopover' in HTMLElement.prototype) {
    popoverId.value = `timezone-conversion-${++nextPopoverId}`;
  }
});

function formattedTime(timezone: string, includeDate: boolean) {
  const locale = userStore.locale || 'en';
  const format = (date: string, timeOnly: boolean) => {
    const local = dayjs.utc(date).tz(timezone).locale(locale);
    const name =
      new Intl.DateTimeFormat(locale, {
        timeZone: timezone,
        timeZoneName: 'long',
      })
        .formatToParts(new Date(date))
        .find((part) => part.type === 'timeZoneName')?.value || timezone;
    return {
      date: timeOnly
        ? local.format('LT')
        : new Intl.DateTimeFormat(locale, {
            timeZone: timezone,
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }).format(new Date(date)),
      zone: `${local.format('z')} (${name})`,
      datetime: local.format('YYYY-MM-DDTHH:mm:ssZ'),
      local,
    };
  };
  const start = format(props.dateStart, !includeDate);
  const parts = [
    { date: start.date, datetime: start.datetime, zone: start.zone },
  ];
  if (props.dateEnd) {
    const endDate = dayjs.utc(props.dateEnd).tz(timezone);
    const end = format(
      props.dateEnd,
      !includeDate || start.local.isSame(endDate, 'day')
    );
    if (start.zone === end.zone) {
      parts[0].zone = '';
    }
    parts.push({ date: end.date, datetime: end.datetime, zone: end.zone });
  }
  return parts;
}

const sameTimezone = computed(
  () =>
    !!deviceTimezone.value &&
    new Intl.DateTimeFormat('en', {
      timeZone: props.timezone,
    }).resolvedOptions().timeZone ===
      new Intl.DateTimeFormat('en', {
        timeZone: deviceTimezone.value,
      }).resolvedOptions().timeZone
);

const displayedTimezones = computed(() =>
  sameTimezone.value || !deviceTimezone.value
    ? [props.timezone]
    : [props.timezone, deviceTimezone.value]
);

// Dates only add meaning when the event crosses midnight in a shown timezone.
const includeDates = computed(() => {
  const endpoints = [props.dateStart, props.dateEnd ?? props.dateStart];
  const localDates = displayedTimezones.value.flatMap((timezone) =>
    endpoints.map((date) => dayjs.utc(date).tz(timezone).format('YYYY-MM-DD'))
  );
  return new Set(localDates).size > 1;
});

// The event's own time is already shown in-page, so only the conversion is listed.
const localTimeParts = computed(() =>
  sameTimezone.value || !deviceTimezone.value
    ? []
    : formattedTime(deviceTimezone.value, includeDates.value)
);

function onToggle(event: Event) {
  expanded.value = (event as ToggleEvent).newState === 'open';
  if (expanded.value) {
    requestAnimationFrame(updateArrow);
    window.addEventListener('resize', updateArrow);
    window.addEventListener('scroll', updateArrow, true);
  } else {
    removeArrowListeners();
  }
}

function updateArrow() {
  if (!trigger.value || !popover.value) return;
  const anchor = trigger.value.getBoundingClientRect();
  const panel = popover.value.getBoundingClientRect();
  const gap = 16;
  arrowSide.value =
    Math.abs(panel.top - anchor.bottom) <= gap
      ? 'top'
      : Math.abs(panel.bottom - anchor.top) <= gap
        ? 'bottom'
        : null;
  arrowOffset.value = Math.max(
    16,
    Math.min(panel.width - 16, anchor.left + anchor.width / 2 - panel.left)
  );
}

function removeArrowListeners() {
  window.removeEventListener('resize', updateArrow);
  window.removeEventListener('scroll', updateArrow, true);
}

onUnmounted(removeArrowListeners);
</script>

<template>
  <template v-if="popoverId">
    <button
      type="button"
      ref="trigger"
      class="timezone-trigger"
      :popovertarget="popoverId"
      :aria-expanded="expanded"
    >
      <span class="timezone-trigger__label"
        >{{ abbreviation
        }}<span class="sr-only">: Show in your timezone</span></span
      >
      <wa-icon
        name="square-question"
        class="text-muted"
        variant="regular"
        canvas="auto"
        aria-hidden="true"
      ></wa-icon>
    </button>
    <div
      :id="popoverId"
      ref="popover"
      class="timezone-popover"
      :class="[
        arrowSide && `timezone-popover--arrow-${arrowSide}`,
        { 'timezone-popover--below': placement === 'bottom' },
      ]"
      :style="{ '--arrow-offset': `${arrowOffset}px` }"
      popover
      @toggle="onToggle"
    >
      <div
        class="timezone-popover__content flow flow-xs"
        tabindex="-1"
        autofocus
        role="group"
        :aria-labelledby="`${popoverId}-label`"
        :aria-describedby="
          localTimeParts.length ? `${popoverId}-time` : undefined
        "
      >
        <div v-if="localTimeParts.length" class="timezone-popover__row">
          <div>
            <strong :id="`${popoverId}-label`">Your local time</strong>
            <div :id="`${popoverId}-time`">
              <div v-for="(part, index) in localTimeParts" :key="index">
                <template v-if="index"
                  ><span aria-hidden="true">–&nbsp;</span
                  ><span class="sr-only">until </span></template
                ><time :datetime="part.datetime">{{ part.date }}</time
                >{{ ' ' }}
                <span
                  v-if="part.zone"
                  class="timezone-popover__zone text-muted"
                  >{{ part.zone }}</span
                >
              </div>
            </div>
          </div>
        </div>
        <p
          v-if="sameTimezone"
          :id="`${popoverId}-label`"
          class="timezone-popover__hint"
        >
          Your device uses the event timezone.
        </p>
      </div>
    </div>
  </template>
  <abbr v-else>{{ abbreviation }}</abbr>
</template>

<style scoped>
.timezone-trigger {
  align-items: center;
  background: none;
  border: 0;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  gap: var(--p-space-3xs);
  min-height: 24px;
  min-width: 24px;
  padding: 0;
}

.timezone-trigger__label {
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 0.2em;
}

.timezone-trigger:hover,
.timezone-trigger:hover wa-icon {
  color: var(--c-color-link-hover);
}

.timezone-trigger:focus-visible {
  outline: 2px solid var(--c-focus-ring-color);
  outline-offset: 2px;
}

.timezone-popover {
  background: var(--c-panel-color-bg);
  border: 1px solid var(--wa-color-surface-border);
  border-radius: var(--wa-border-radius-m);
  color: var(--c-body-color-fg);
  filter: drop-shadow(
    var(--wa-shadow-offset-x-l) var(--wa-shadow-offset-y-l)
      var(--wa-shadow-blur-l) var(--wa-color-shadow)
  );
  font-size: var(--p-step--1);
  inset: 0;
  margin: auto;
  max-width: min(24rem, calc(100vw - 2rem));
  overflow: visible;
  white-space: normal;
}

.timezone-popover__content {
  border-radius: inherit;
  max-height: calc(100dvh - 2rem);
  overflow: auto;
  padding: var(--p-space-xs);
}

.timezone-popover__content:focus {
  outline: none;
}

/* The panel's own edge, arrow included, is the keyboard focus indicator for its content. */
.timezone-popover:has(> .timezone-popover__content:focus-visible) {
  outline: 2px solid var(--c-focus-ring-color);
  outline-offset: -1px;
}

.timezone-popover:has(> .timezone-popover__content:focus-visible)::before {
  border-color: var(--c-focus-ring-color);
  border-width: 2px;
}

.timezone-popover--arrow-top::before,
.timezone-popover--arrow-bottom::before {
  background: var(--c-panel-color-bg);
  border: 1px solid var(--wa-color-surface-border);
  content: '';
  height: 12px;
  left: var(--arrow-offset);
  position: absolute;
  transform: translateX(-50%) rotate(45deg);
  width: 12px;
}

.timezone-popover--arrow-top::before {
  border-bottom: 0;
  border-right: 0;
  top: -7px;
}

.timezone-popover--arrow-bottom::before {
  border-left: 0;
  border-top: 0;
  bottom: -7px;
}

@supports (position-area: top) {
  @position-try --timezone-center {
    inset: 1rem;
    margin: auto;
    position-area: none;
  }

  .timezone-popover {
    inset: auto;
    margin: 0;
    margin-block-end: 10px;
    position-area: top;
    position-try-fallbacks:
      flip-block,
      flip-inline,
      flip-block flip-inline,
      --timezone-center;
  }

  .timezone-popover--below {
    margin-block-end: 0;
    margin-block-start: 10px;
    position-area: bottom;
  }
}

.timezone-popover__zone {
  display: block;
  font-size: var(--p-step--2);
}

@media (forced-colors: active) {
  .timezone-popover:has(> .timezone-popover__content:focus-visible) {
    outline-color: Highlight;
  }

  .timezone-popover:has(> .timezone-popover__content:focus-visible)::before {
    border-color: Highlight;
  }

  .timezone-popover {
    filter: none;
  }

  .timezone-popover,
  .timezone-popover::before {
    background: Canvas;
    border-color: CanvasText;
  }
}
</style>
