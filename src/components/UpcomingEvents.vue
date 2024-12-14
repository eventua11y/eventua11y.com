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
      For one reason or another, there are no events to display at the moment. You may need to refresh.
    </sl-alert>

    <!-- Events list -->
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
import Skeleton from '../components/Skeleton.vue';
import filtersStore from '../store/filtersStore';
import userStore from '../store/userStore';

const groupedEvents = ref({});
const loading = ref(true);
const error = ref(null);

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
  loading.value = true;
  error.value = null;

  try {
    if (!userStore.userInfoFetched) {
      const response = await fetch('/api/get-user-info');
      if (!response.ok) throw new Error('Failed to fetch user info');
      const data = await response.json();
      userStore.setUserInfo(data.timezone, data.acceptLanguage, data.geo);
    }
    
    groupEvents(filtersStore.filteredEvents);
  } catch (e) {
    error.value = 'Unable to load events. Please try again later.';
    console.error('Error:', e);
  } finally {
    loading.value = false;
  }
});

watch(
  () => filtersStore.filteredEvents,
  (newFilteredEvents) => {
    loading.value = true;
    error.value = null;
    try {
      groupEvents(newFilteredEvents);
    } catch (e) {
      error.value = 'Error updating events.';
      console.error('Error:', e);
    } finally {
      loading.value = false;
    }
  },
  { deep: true }
);
</script>

<style scoped>
.mb-m {
  margin-bottom: 1rem;
}
</style>