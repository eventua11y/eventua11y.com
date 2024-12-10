<template>
  <div>
    <label for="timezone">Select Timezone:</label>
    <select id="timezone" v-model="selectedTimezone" @change="updateTimezone">
      <option v-for="timezone in timezones" :key="timezone" :value="timezone">
        {{ timezone }}
      </option>
    </select>
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

function updateTimezone() {
  userStore.timezone = selectedTimezone.value;
  localStorage.setItem('userTimezone', selectedTimezone.value);
}

onMounted(() => {
  if (!userStore.timezone) {
    const savedTimezone = localStorage.getItem('userTimezone');
    if (savedTimezone) {
      selectedTimezone.value = savedTimezone;
      userStore.timezone = savedTimezone;
    }
  }
});
</script>