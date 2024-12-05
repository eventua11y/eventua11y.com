<template>
  <div class="flow">
    <fieldset class="checkbox-group filter flow flow-tight">
      <legend class="text-muted">Call for speakers</legend>
      <div class="checkbox">
        <input type="checkbox" v-model="filtersStore.filters.cfsOpen" id="filter-cfs-open" class="filter-option" />
        <label for="filter-cfs-open">Accepting talks</label>
      </div>
      <div class="checkbox">
        <input type="checkbox" v-model="filtersStore.filters.cfsClosed" id="filter-cfs-closed" class="filter-option" />
        <label for="filter-cfs-closed">Closed</label>
      </div>
    </fieldset>
    <fieldset class="checkbox-group filter flow flow-tight">
      <legend class="text-muted">Attendance mode</legend>
      <div class="checkbox">
        <input type="checkbox" v-model="filtersStore.filters.attendanceOnline" id="filter-attendance-online" class="filter-option" />
        <label for="filter-attendance-online">Online</label>
      </div>
      <div class="checkbox">
        <input type="checkbox" v-model="filtersStore.filters.attendanceOffline" id="filter-attendance-offline" class="filter-option" />
        <label for="filter-attendance-offline">Offline</label>
      </div>
    </fieldset>
    <button @click="applyFilters">Apply Filters</button>
  </div>
</template>

<script setup lang="ts">

import filtersStore from '../store/filtersStore';

// Function to apply filters
function applyFilters() {
  // Emit an event with the current filters
  emit('apply-filters', filtersStore.filters);
}

</script>

<style scoped>
/* Add any scoped styles here */
</style>