<template>
  <div>
    <label class="sr-only" for="timezone-dropdown">Timezone</label>
    <sl-dropdown id="timezone-dropdown" distance="3" placement="bottom-end">
      <sl-button slot="trigger" caret>
        {{ selectedTimezoneLabel }}
      </sl-button>
      <sl-menu @sl-select="updateTimezone">
        <sl-menu-item type="checkbox" :value="userTimezone" :checked="isLocalTimezone">{{
          userTimezoneLabel
        }}</sl-menu-item>
        <sl-menu-item type="checkbox" value="event" :checked="isEventTimezone">Event local times</sl-menu-item>
      </sl-menu>
    </sl-dropdown>
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
 * Computed properties to determine which timezone is active
 */
 const isLocalTimezone = computed(() => userStore.useLocalTimezone);
const isEventTimezone = computed(() => !userStore.useLocalTimezone);

</script>
