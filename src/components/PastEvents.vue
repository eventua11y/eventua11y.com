<script setup>
import { ref, onMounted, watch } from 'vue';
import Event from './Event.vue';
import Skeleton from './Skeleton.vue';
import userStore from '../store/userStore';
import filtersStore from '../store/filtersStore';

const groupedEvents = ref({});
const loading = ref(true);
const error = ref(null);

const formatDate = (yearMonth) => {
  const [year, month] = yearMonth.split('-');
  const date = new Date(year, month - 1);
  return `${date.toLocaleString('default', { month: 'long' })} ${year}`;
};

const groupEvents = (events) => {
  // Sort events in reverse chronological order
  const sortedEvents = [...events].sort((a, b) => 
    new Date(b.dateStart).getTime() - new Date(a.dateStart).getTime()
  );

  // Group sorted events by month
  const groups = sortedEvents.reduce((groups, event) => {
    const date = new Date(event.dateStart);
    const yearMonth = `${date.getFullYear()}-${date.getMonth() + 1}`;

    if (!groups[yearMonth]) {
      groups[yearMonth] = [];
    }
    groups[yearMonth].push(event);
    return groups;
  }, {});

  // Sort months in reverse chronological order
  const sortedGroups = Object.fromEntries(
    Object.entries(groups).sort((a, b) => {
      const [yearA, monthA] = a[0].split('-').map(Number);
      const [yearB, monthB] = b[0].split('-').map(Number);
      return yearB - yearA || monthB - monthA;
    })
  );

  groupedEvents.value = sortedGroups;
};

onMounted(async () => {
  loading.value = true;
  error.value = null;

  try {
    if (!userStore.userInfoFetched) {
      const response = await fetch('/api/get-user-info');
      if (!response.ok) throw new Error('Failed to fetch user info');
      const data = await response.json();
      userStore.setUserInfo(data.timezone, data.acceptLanguage, data.geo);
    }
    
    groupEvents(filtersStore.pastEvents);
  } catch (e) {
    error.value = 'Unable to load past events. Please try again later.';
    console.error('Error:', e);
  } finally {
    loading.value = false;
  }
});

watch(
  () => filtersStore.pastEvents,
  (newEvents) => {
    loading.value = true;
    error.value = null;
    try {
      groupEvents(newEvents);
    } catch (e) {
      error.value = 'Error updating past events.';
      console.error('Error:', e);
    } finally {
      loading.value = false;
    }
  }
);
</script>

<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="flow flow-xl">
      <Skeleton />
      <Skeleton />
      <Skeleton />
    </div>

    <!-- Error state -->
    <sl-alert 
      v-else-if="error" 
      open 
      variant="danger" 
      class="my-xl"
    >
      <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
      {{ error }}
    </sl-alert>

    <!-- No events state -->
    <sl-alert 
      v-else-if="!loading && Object.keys(groupedEvents).length === 0" 
      open 
      class="my-xl"
    >
      <sl-icon slot="icon" name="info-circle"></sl-icon>
      There are no past events to display.
    </sl-alert>

    <!-- Events list -->
    <div id="past-events" v-else>
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