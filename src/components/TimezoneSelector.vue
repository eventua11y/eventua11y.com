<template>
  <div>
    <label class="sr-only" for="timezone-dropdown">Timezone</label>
    <sl-dropdown id="timezone-dropdown" distance="3" placement="bottom-end">
      <sl-button slot="trigger" size="small" caret>
        {{ selectedTimezoneLabel }}
      </sl-button>
      <sl-menu @sl-select="updateTimezone">
        <sl-menu-item
          type="radio"
          name="timezone"
          :value="userTimezone"
          :selected="isLocalTimezone"
          >{{ userTimezoneLabel }}</sl-menu-item
        >
        <sl-menu-item
          type="radio"
          name="timezone"
          value="event"
          :selected="!isLocalTimezone"
          >Event local times</sl-menu-item
        >
      </sl-menu>
    </sl-dropdown>
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
 * Shows currently selected timezone option
 * Either user's local timezone or event local times
 * @returns {string} Selected timezone label
 */
const selectedTimezoneLabel = computed(() => {
  if (!userStore.geo?.timezone) return 'Loading timezone...';
  return userStore.useLocalTimezone
    ? userTimezoneLabel.value
    : 'Event local times';
});

/**
 * Updates timezone preference when user selects an option
 * @param {CustomEvent} event - Menu select event
 */
function updateTimezone(event: CustomEvent) {
  if (!userStore.geo?.timezone) return;
  const isLocalTimezone = event.detail.item.value === userTimezone.value;
  userStore.setTimezone(
    isLocalTimezone ? userTimezone.value : 'event',
    isLocalTimezone
  );
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

/**
 * Determines which timezone option is active
 * Only one option should be checked at a time
 * @returns {boolean} True if using local timezone
 */
const isLocalTimezone = computed(() => userStore.useLocalTimezone === true);
</script>
