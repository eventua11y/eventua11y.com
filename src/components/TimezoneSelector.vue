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
const selectedTimezoneLabel = ref('Event local times');
const useLocalTimezone = ref(false);

function updateTimezone(event) {
  const timezone = event.detail.item.value;
  useLocalTimezone.value = timezone === userTimezone.value;
  selectedTimezoneLabel.value = useLocalTimezone.value ? userTimezoneLabel.value : 'Event local times';
  userStore.timezone = useLocalTimezone.value ? userTimezone.value : 'event';
  localStorage.setItem('useLocalTimezone', useLocalTimezone.value);
}

onMounted(() => {
  // Update userTimezone and userTimezoneLabel on page refresh
  userTimezone.value = userStore.geo.timezone;
  userTimezoneLabel.value = dayjs.tz.guess();

  const savedUseLocalTimezone = localStorage.getItem('useLocalTimezone');
  if (savedUseLocalTimezone !== null) {
    useLocalTimezone.value = savedUseLocalTimezone === 'true';
    selectedTimezoneLabel.value = useLocalTimezone.value ? userTimezoneLabel.value : 'Event local times';
    userStore.timezone = useLocalTimezone.value ? userTimezone.value : 'event';
  }
});
</script>