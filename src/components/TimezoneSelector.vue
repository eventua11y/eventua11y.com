<template>
  <div>
    <label class="sr-only" for="timezone-dropdown">Timezone</label>
    <wa-dropdown
      id="timezone-dropdown"
      distance="3"
      placement="bottom-end"
      @wa-select="updateTimezone"
    >
      <wa-button slot="trigger" with-caret>
        {{ selectedTimezoneLabel }}
      </wa-button>
      <wa-dropdown-item
        type="checkbox"
        name="timezone"
        :value="userTimezone"
        :checked="isLocalTimezone"
        >{{ userTimezoneLabel }}</wa-dropdown-item
      >
      <wa-dropdown-item
        type="checkbox"
        name="timezone"
        value="event"
        :checked="!isLocalTimezone"
        >Event local times</wa-dropdown-item
      >
    </wa-dropdown>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import userStore from '../store/userStore';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

/**
 * TimezoneSelector component
 * Allows users to toggle between local and event timezones
 * Includes dropdown menu with timezone options
 */

// Set up dayjs timezone plugins
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
function updateTimezone(event) {
  if (!userStore.geo?.timezone) return;
  const isLocalTimezone = event.detail.item.value === userTimezone.value;
  userStore.setTimezone(
    isLocalTimezone ? userTimezone.value : 'event',
    isLocalTimezone
  );
}

/**
 * Initialize timezone on component mount
 * Sets user's detected timezone if useLocalTimezone is true
 */
onMounted(() => {
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
