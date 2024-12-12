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
const userTimezoneLabel = ref('');
const selectedTimezoneLabel = ref('Event local times');

function updateTimezone(event) {
  const isLocalTimezone = event.detail.item.value === userTimezone.value;
  selectedTimezoneLabel.value = isLocalTimezone ? userTimezoneLabel.value : 'Event local times';
  userStore.setTimezone(
    isLocalTimezone ? userTimezone.value : 'event',
    isLocalTimezone
  );
}

onMounted(() => {
  userTimezone.value = userStore.geo.timezone;
  userTimezoneLabel.value = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimezone.value,
    timeZoneName: 'long'
  }).format(new Date());

  if (userStore.useLocalTimezone) {
    selectedTimezoneLabel.value = userTimezoneLabel.value;
  }
});
</script>