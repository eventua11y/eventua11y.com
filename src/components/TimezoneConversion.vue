<script lang="ts">
let nextPopoverId = 0;
</script>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import dayjs from '../lib/dayjs';
import userStore from '../store/userStore';

const props = defineProps<{
  dateStart: string;
  dateEnd?: string;
  timezone: string;
  abbreviation: string;
}>();

const popoverId = ref('');
const deviceTimezone = ref('');
const expanded = ref(false);
const now = ref(Date.now());
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

function formattedTime(timezone: string) {
  const locale = userStore.locale || 'en';
  const format = (date: string, short: boolean) => {
    const local = dayjs.utc(date).tz(timezone).locale(locale);
    const name =
      new Intl.DateTimeFormat(locale, {
        timeZone: timezone,
        timeZoneName: 'long',
      })
        .formatToParts(new Date(date))
        .find((part) => part.type === 'timeZoneName')?.value || timezone;
    return {
      date: short
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
  const start = format(props.dateStart, false);
  const parts = [
    { date: start.date, datetime: start.datetime, zone: start.zone },
  ];
  if (props.dateEnd) {
    const endDate = dayjs.utc(props.dateEnd).tz(timezone);
    const end = format(props.dateEnd, start.local.isSame(endDate, 'day'));
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

const relativeTime = computed(() => {
  const difference = dayjs.utc(props.dateStart).valueOf() - now.value;
  const minutes = Math.round(difference / 60_000);
  const relative = new Intl.RelativeTimeFormat(userStore.locale || 'en', {
    numeric: 'auto',
  });
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour');
  return relative.format(Math.round(hours / 24), 'day');
});

const rows = computed(() => {
  const eventRow = {
    label: 'Event local time',
    displayParts: formattedTime(props.timezone),
  };
  if (sameTimezone.value) return [eventRow];
  return [
    eventRow,
    {
      label: 'Your local time',
      displayParts: deviceTimezone.value
        ? formattedTime(deviceTimezone.value)
        : [],
    },
  ];
});

function onToggle(event: Event) {
  expanded.value = (event as ToggleEvent).newState === 'open';
  if (expanded.value) {
    now.value = Date.now();
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
      :class="arrowSide && `timezone-popover--arrow-${arrowSide}`"
      :style="{ '--arrow-offset': `${arrowOffset}px` }"
      popover
      @toggle="onToggle"
    >
      <div class="timezone-popover__content flow flow-xs">
        <p class="timezone-popover__relative">
          {{ dayjs.utc(dateStart).valueOf() < now ? 'Started' : 'Starts' }}
          {{ relativeTime }}
        </p>
        <div v-for="row in rows" :key="row.label" class="timezone-popover__row">
          <div>
            <strong>{{ row.label }}</strong>
            <div>
              <template v-for="(part, index) in row.displayParts" :key="index">
                <template v-if="index"
                  ><span aria-hidden="true"> – </span
                  ><span class="sr-only">until</span></template
                ><time :datetime="part.datetime">{{ part.date }}</time
                >{{ ' ' }}
                <span
                  v-if="part.zone"
                  class="timezone-popover__zone text-muted"
                  >{{ part.zone }}</span
                >
              </template>
            </div>
          </div>
        </div>
        <p v-if="sameTimezone" class="timezone-popover__hint">
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
  inset: 0;
  margin: auto;
  max-width: min(24rem, calc(100vw - 2rem));
  overflow: visible;
  white-space: normal;
}

.timezone-popover__content {
  max-height: calc(100dvh - 2rem);
  overflow: auto;
  padding: var(--p-space-xs);
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
}

.timezone-popover__zone {
  display: block;
  font-size: var(--p-step--2);
}
</style>
