<template>
  <div>
    <label class="sr-only" for="timezone-dropdown">Timezone</label>
    <sl-dropdown id="timezone-dropdown" distance="3" placement="bottom-end">
      <sl-button slot="trigger" caret>
        {{ selectedTimezoneLabel }}
      </sl-button>
      <sl-menu @sl-select="updateTimezone">
        <sl-menu-item :value="userTimezone">{{
          userTimezoneLabel
        }}</sl-menu-item>
        <sl-menu-item value="event">Event local times</sl-menu-item>
      </sl-menu>
    </sl-dropdown>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import userStore from '../store/userStore';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const defaultTimezone = 'UTC';

const userTimezone = computed(() => userStore.geo?.timezone || defaultTimezone);
const userTimezoneLabel = computed(() => {
  if (!userStore.geo?.timezone) return 'Loading timezone...';
  const location = userTimezone.value.split('/').pop().replace('_', ' ');
  return `${location} (UTC ${dayjs().tz(userTimezone.value).format('Z')})`;
});

const selectedTimezoneLabel = computed(() => {
  if (!userStore.geo?.timezone) return 'Loading timezone...';
  return userStore.useLocalTimezone
    ? userTimezoneLabel.value
    : 'Event local times';
});

function updateTimezone(event) {
  if (!userStore.geo?.timezone) return;
  const isLocalTimezone = event.detail.item.value === userTimezone.value;
  userStore.setTimezone(
    isLocalTimezone ? userTimezone.value : 'event',
    isLocalTimezone
  );
}

onMounted(() => {
  if (userStore.useLocalTimezone && userStore.geo?.timezone) {
    userStore.setTimezone(userTimezone.value, true);
  }
});
</script>