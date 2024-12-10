<template>
  <div>
    <label class="sr-only" for="timezone-dropdown">Timezone</label>
    <sl-dropdown id="timezone-dropdown" distance="3" placement="bottom-end">
      <sl-button slot="trigger" caret>
        {{ selectedTimezone }}
      </sl-button>
      <sl-menu @sl-select="updateTimezone">
        <sl-menu-item 
          v-for="timezone in timezones" 
          :key="timezone" 
          :value="timezone" 
          type="checkbox" 
          :checked="timezone === selectedTimezone"
        >
          {{ timezone }}
        </sl-menu-item>
      </sl-menu>
    </sl-dropdown>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import userStore from '../store/userStore';

const selectedTimezone = ref(userStore.timezone);
const timezones = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow', 'Asia/Tokyo', 
  'Asia/Shanghai', 'Asia/Kolkata', 'Australia/Sydney', 'Australia/Melbourne'
  // Add more timezones as needed
];

function updateTimezone(event) {
  const timezone = event.detail.item.value;
  selectedTimezone.value = timezone;
  userStore.timezone = timezone;
  localStorage.setItem('userTimezone', timezone);
}

onMounted(() => {
  const savedTimezone = localStorage.getItem('userTimezone');
  if (savedTimezone) {
    selectedTimezone.value = savedTimezone;
    userStore.timezone = savedTimezone;
  }
});
</script>