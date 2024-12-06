<template>
  <div id="filters" class="no-js">
    <div class="container">
      <div class="content" data-testid="button-filter">
        <div class="status">
          <p class="filters__count text-muted" aria-live="polite" aria-atomic="true">
            <small v-if="filtersStore.showingAllEvents">
              Showing all {{ filtersStore.totalEventCount }} events
            </small>
            <small v-else>
              Showing {{ filtersStore.filteredEventCount }} of {{ filtersStore.totalEventCount }} events
            </small>
          </p>
          <sl-button v-if="filtersStore.isChanged()" id="filter-reset" @click="resetFilters" type="primary"
            name="filter-reset"><i class="fa-solid fa-filter-circle-xmark"></i> Reset Filters</sl-button>
        </div>
        <!-- End status -->
        <div class="filters__controls d-flex gap-xs items-center">
          <sl-switch :checked="filtersStore.filters.showAwarenessDays" @sl-change="toggleAwarenessDays" id="filter-show-awareness-days">Awareness days</sl-switch>
          <sl-dropdown>
            <sl-button slot="trigger" caret>Your timezone (GMT)</sl-button>
            <sl-menu>
              <sl-menu-item>Your timezone (GMT)</sl-menu-item>
              <sl-menu-item>Event timezone</sl-menu-item>
            </sl-menu>
          </sl-dropdown>
          <sl-button id="open-filter-drawer" @click="openFilterDrawer">
            <i class="fa-solid fa-filter"></i> Filter
          </sl-button>
        </div>
        <!-- End filters__controls -->
      </div>
      <!-- End content -->
    </div>
    <!-- End container -->
  </div>
  <!-- end Filter Bar -->
</template>

<script setup lang="ts">

import { onMounted } from 'vue';
import filtersStore from '../store/filtersStore';
import uiStore from '../store/uiStore';

// Function to reset filters
function resetFilters() {
  filtersStore.resetFilters();
}

// Function to open the filter drawer
function openFilterDrawer() {
  uiStore.openFilterDrawer();
}

// Function to toggle awareness days filter
function toggleAwarenessDays(event) {
  filtersStore.filters.showAwarenessDays = event.target.checked;
}

// Fetch events on component mount
onMounted(async () => {
  await filtersStore.fetchEvents();
});

</script>