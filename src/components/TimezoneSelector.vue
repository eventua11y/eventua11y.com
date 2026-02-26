<template>
  <div>
    <wa-select
      id="timezone-select"
      label="Timezone"
      placement="bottom"
      appearance="outlined"
      class="wa-visually-hidden-label"
      :size="size"
      :value="selectedValue"
      @change="updateTimezone"
    >
      <wa-option :value="userTimezone">{{ userTimezoneLabel }}</wa-option>
      <wa-option value="event">Event local times</wa-option>
    </wa-select>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import userStore from '../store/userStore';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

withDefaults(
  defineProps<{
    size?: 'small' | 'medium' | 'large';
  }>(),
  {
    size: 'medium',
  }
);

// Default timezone if user's timezone cannot be detected
const defaultTimezone = 'UTC';

/**
 * Gets user's timezone from store or falls back to UTC
 * @returns {string} User's timezone or UTC
 */
const userTimezone = computed(() => userStore.geo?.timezone || defaultTimezone);

/**
 * Formats user's timezone for display
 * Shows city name and UTC offset
 * @returns {string} Formatted timezone string
 */
const userTimezoneLabel = computed(() => {
  if (!userStore.geo?.timezone) return 'Loading timezone...';
  const location = userTimezone.value.split('/').pop().replace('_', ' ');
  return `${location} (UTC ${dayjs().tz(userTimezone.value).format('Z')})`;
});

/**
 * The wa-select value: either the user's timezone IANA string or "event".
 * Derived from the store so wa-select always reflects the current preference.
 * @returns {string} Current select value
 */
const selectedValue = computed(() =>
  userStore.useLocalTimezone ? userTimezone.value : 'event'
);

/**
 * Updates timezone preference when the user picks an option.
 * Uses the :value + @change pattern recommended by the WA Vue docs
 * (not v-model, which has inconsistent support on custom elements).
 * @param {Event} event - Native change event from wa-select
 */
function updateTimezone(event: Event) {
  if (!userStore.geo?.timezone) return;
  const select = event.target as HTMLElement & { value: string };
  const isLocal = select.value !== 'event';
  userStore.setTimezone(isLocal ? userTimezone.value : 'event', isLocal);
}

/**
 * Initialize timezone on component mount.
 * Fetches user info from the edge function if not already available
 * (e.g. when landing directly on an event detail page).
 * Then restores the user's previous timezone preference if applicable.
 */
onMounted(async () => {
  if (!userStore.geo?.timezone && !userStore.userInfoFetched) {
    try {
      const response = await fetch('/api/get-user-info');
      if (response.ok) {
        const data = await response.json();
        userStore.setUserInfo(data.timezone, data.acceptLanguage, data.geo);
      }
    } catch {
      // Silently fall back to UTC if the fetch fails
    }
  }

  if (userStore.useLocalTimezone && userStore.geo?.timezone) {
    userStore.setTimezone(userTimezone.value, true);
  }
});
</script>
