<template>
  <div>
    <label class="sr-only" for="timezone-dropdown">Timezone</label>
    <sl-dropdown id="timezone-dropdown" distance="3" placement="bottom-end">
      <sl-button slot="trigger" caret>
        {{ selectedTimezoneLabel }}
      </sl-button>
      <sl-menu @sl-select="updateTimezone">
        <sl-menu-item :value="userTimezone">{{ userTimezoneLabel }}</sl-menu-item>
        <sl-menu-item value="event">Event local times</sl-menu-item>
      </sl-menu>
    </sl-dropdown>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import userStore from '../store/userStore';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const userTimezone = ref(userStore.geo.timezone);
const userTimezoneLabel = ref(dayjs.tz.guess());
const selectedTimezone = ref('event');
const selectedTimezoneLabel = ref('Event local times');

function updateTimezone(event) {
  const timezone = event.detail.item.value;
  selectedTimezone.value = timezone;
  selectedTimezoneLabel.value = timezone === userTimezone.value ? userTimezoneLabel.value : 'Event local times';
  userStore.timezone = timezone === userTimezone.value ? userTimezone.value : 'event';
  localStorage.setItem('selectedTimezone', selectedTimezone.value);
}

onMounted(() => {
  // Update userTimezone and userTimezoneLabel on page refresh
  userTimezone.value = userStore.geo.timezone;
  userTimezoneLabel.value = dayjs.tz.guess();

  const savedTimezone = localStorage.getItem('selectedTimezone');
  if (savedTimezone) {
    selectedTimezone.value = savedTimezone;
    selectedTimezoneLabel.value = savedTimezone === userTimezone.value ? userTimezoneLabel.value : 'Event local times';
    userStore.timezone = savedTimezone === userTimezone.value ? userTimezone.value : 'event';
  }
});
</script>