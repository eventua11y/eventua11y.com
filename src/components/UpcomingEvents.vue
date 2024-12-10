<template>
  <div>
    <!-- If there are no upcoming events -->
    <sl-alert open v-if="Object.keys(groupedEvents).length === 0" class="my-xl">
      <sl-icon slot="icon" name="info-circle"></sl-icon>
      For one reason or another, there are no events to display at the moment.
    </sl-alert>
    <!-- If there are upcoming events -->
    <div id="upcoming-events" v-else>
      <div v-for="(events, yearMonth) in groupedEvents" :key="yearMonth">
        <section :id="'section-' + yearMonth" class="month">
          <h2 :id="'heading-' + yearMonth" class="month__heading">{{ formatDate(yearMonth) }}</h2>
          <ul role="list" class="flow">
            <li v-for="event in events" :key="event._id">
              <Event :event="event" />
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import Event from '../components/Event.vue';
import filtersStore from '../store/filtersStore';
import userStore from '../store/userStore';

const groupedEvents = ref({});

const formatDate = (yearMonth) => {
  const [year, month] = yearMonth.split('-');
  const date = new Date(year, month - 1);
  return `${date.toLocaleString('default', { month: 'long' })} ${year}`;
};

const groupEvents = (events) => {
  const groups = events.reduce((groups, event) => {
    const date = new Date(event.dateStart);
    const yearMonth = `${date.getFullYear()}-${date.getMonth() + 1}`;

    if (!groups[yearMonth]) {
      groups[yearMonth] = [];
    }

    groups[yearMonth].push(event);

    return groups;
  }, {});
  groupedEvents.value = groups;
};

onMounted(async () => {
  // Fetch user info when the component is mounted, only if not already populated
  if (!userStore.userInfoFetched) {
    try {
      console.log('Fetching user info...');
      const response = await fetch('/api/get-user-info');
      const data = await response.json();
      console.log('User info fetched:', data);
      userStore.setUserInfo(data.timezone, data.acceptLanguage, data.geo);
      console.log('User info set in store:', {
        timezone: userStore.timezone,
        locale: userStore.locale,
        geo: userStore.geo,
      });
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  } else {
    console.log('User info already set in store:', {
      timezone: userStore.timezone,
      locale: userStore.locale,
      geo: userStore.geo,
    });
  }

  groupEvents(filtersStore.filteredEvents);
});

watch(
  () => filtersStore.filteredEvents,
  (newFilteredEvents) => {
    groupEvents(newFilteredEvents);
  },
  { deep: true }
);
</script>

<style scoped>
/* Add any scoped styles here */
</style>