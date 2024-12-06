<template>
  <sl-drawer id="filter-drawer" label="Filters" :open="uiStore.isFilterDrawerOpen" @sl-after-hide="uiStore.closeFilterDrawer">
    <div class="flow">
      <fieldset class="checkbox-group filter flow flow-tight">
        <legend class="text-muted">Call for speakers</legend>
        <div class="checkbox">
          <input type="checkbox" v-model="filtersStore.filters.cfsOpen" id="filter-cfs-open" class="filter-option" />
          <label for="filter-cfs-open">Accepting talks</label>
        </div>
        <div class="checkbox">
          <input type="checkbox" v-model="filtersStore.filters.cfsClosed" id="filter-cfs-closed"
            class="filter-option" />
          <label for="filter-cfs-closed">Closed</label>
        </div>
      </fieldset>
      <fieldset class="checkbox-group filter flow flow-tight">
        <legend class="text-muted">Attendance mode</legend>
        <div class="checkbox">
          <input type="checkbox" v-model="filtersStore.filters.attendanceOnline" id="filter-attendance-online"
            class="filter-option" />
          <label for="filter-attendance-online">Online</label>
        </div>
        <div class="checkbox">
          <input type="checkbox" v-model="filtersStore.filters.attendanceOffline" id="filter-attendance-offline"
            class="filter-option" />
          <label for="filter-attendance-offline">Offline</label>
        </div>
      </fieldset>
      <div class="d-flex flex-col items-start gap-xs">
        <sl-button variant="primary" size="large" @click="closeDrawer">Show {{ filtersStore.filteredEventCount }} of {{ filtersStore.totalEventCount }} events</sl-button>
        <sl-button v-if="filtersStore.isChanged()" id="filter-reset" @click="resetFilters" type="primary" name="filter-reset">
          <i class="fa-solid fa-filter-circle-xmark"></i> Reset Filters
        </sl-button>
      </div>
    </div>
  </sl-drawer>
</template>

<script setup lang="ts">

import filtersStore from '../store/filtersStore';
import uiStore from '../store/uiStore';

// Function to close the drawer
function closeDrawer() {
  uiStore.closeFilterDrawer();
}

// Function to reset filters and close the drawer
function resetFilters() {
  filtersStore.resetFilters();
}

</script>

<style scoped>
/* Add any scoped styles here */
</style>