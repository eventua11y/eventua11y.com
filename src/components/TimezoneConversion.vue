<script lang="ts">
let nextPopoverId = 0;
</script>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
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

onMounted(() => {
  deviceTimezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if ('showPopover' in HTMLElement.prototype) {
    popoverId.value = `timezone-conversion-${++nextPopoverId}`;
  }
});

function formattedTime(timezone: string): string {
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
      date: local.format(short ? 'LT' : 'LLLL'),
      zone: `${local.format('z')} (${name})`,
      local,
    };
  };
  const start = format(props.dateStart, false);
  if (!props.dateEnd) return `${start.date} ${start.zone}`;
  const endDate = dayjs.utc(props.dateEnd).tz(timezone);
  const end = format(props.dateEnd, start.local.isSame(endDate, 'day'));
  return start.zone === end.zone
    ? `${start.date} – ${end.date} ${end.zone}`
    : `${start.date} ${start.zone} – ${end.date} ${end.zone}`;
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

function dateDifference(value: string): number {
  if (!deviceTimezone.value) return 0;
  const date = dayjs.utc(value);
  const eventDay = date.tz(props.timezone).format('YYYY-MM-DD');
  const deviceDay = date.tz(deviceTimezone.value).format('YYYY-MM-DD');
  return dayjs.utc(deviceDay).diff(dayjs.utc(eventDay), 'day');
}

// fallow-ignore-next-line complexity -- Date-boundary cases are covered by browser tests.
const dayHint = computed(() => {
  const start = dateDifference(props.dateStart);
  const end = dateDifference(props.dateEnd ?? props.dateStart);
  if (start * end < 0) return 'Dates differ in your timezone';
  const difference = start || end;
  const labels: Record<number, string> = {
    1: 'Next day',
    '-1': 'Previous day',
    2: '2 days later',
    '-2': '2 days earlier',
  };
  return labels[difference] ? `${labels[difference]} in your timezone` : '';
});

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
    label: 'Event time',
    timezone: props.timezone,
    value: formattedTime(props.timezone),
    copyLabel: 'Copy event time',
  };
  if (sameTimezone.value) return [eventRow];
  return [
    eventRow,
    {
      label: 'Your time',
      timezone: deviceTimezone.value,
      value: deviceTimezone.value ? formattedTime(deviceTimezone.value) : '',
      copyLabel: 'Copy your time',
    },
  ];
});

function onToggle(event: Event) {
  expanded.value = (event as ToggleEvent).newState === 'open';
  if (expanded.value) now.value = Date.now();
}
</script>

<template>
  <template v-if="popoverId">
    <button
      type="button"
      class="timezone-trigger"
      :popovertarget="popoverId"
      :aria-expanded="expanded"
    >
      {{ abbreviation }}<span class="sr-only">: Show in your timezone</span>
    </button>
    <div :id="popoverId" class="timezone-popover" popover @toggle="onToggle">
      <p class="timezone-popover__relative">
        {{ dayjs.utc(dateStart).valueOf() < now ? 'Started' : 'Starts' }}
        {{ relativeTime }}
      </p>
      <div v-for="row in rows" :key="row.label" class="timezone-popover__row">
        <div>
          <strong>{{ row.label }}</strong>
          <div>{{ row.value }}</div>
          <div class="timezone-popover__zone">{{ row.timezone }}</div>
        </div>
        <wa-copy-button
          :value="row.value"
          :copy-label="row.copyLabel"
          tooltip="none"
        />
      </div>
      <p v-if="sameTimezone" class="timezone-popover__hint">
        Your device uses the event timezone.
      </p>
      <p v-else-if="dayHint" class="timezone-popover__hint">{{ dayHint }}</p>
    </div>
  </template>
  <abbr v-else>{{ abbreviation }}</abbr>
</template>

<style scoped>
.timezone-trigger {
  background: none;
  border: 0;
  color: inherit;
  cursor: pointer;
  font: inherit;
  min-height: 24px;
  min-width: 24px;
  padding: 0;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 0.2em;
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
  max-height: calc(100dvh - 2rem);
  max-width: min(24rem, calc(100vw - 2rem));
  overflow: auto;
  padding: var(--p-space-s);
  white-space: normal;
}

@supports (position-area: bottom) {
  @position-try --timezone-center {
    inset: 1rem;
    margin: auto;
    position-area: none;
  }

  .timezone-popover {
    inset: auto;
    margin: 0;
    position-area: bottom;
    position-try-fallbacks:
      flip-block,
      flip-inline,
      flip-block flip-inline,
      --timezone-center;
  }
}

.timezone-popover__row {
  align-items: start;
  display: flex;
  gap: var(--p-space-s);
  justify-content: space-between;
}

.timezone-popover__relative {
  margin: 0 0 var(--p-space-s);
}

.timezone-popover__hint {
  margin: var(--p-space-s) 0 0;
}

.timezone-popover__row + .timezone-popover__row {
  margin-top: var(--p-space-s);
}

.timezone-popover__zone {
  font-size: 0.875em;
  overflow-wrap: anywhere;
}
</style>
