<template>
  <div id="filters" class="py-xs-s">
    <div class="container">
        <div class="filters__status">
          <p class="filters__count text-muted" aria-live="polite" aria-atomic="true">
            <small v-if="filtersStore.showingAllEvents">Showing all {{ filtersStore.futureEvents.length }} upcoming events</small>
            <small v-else>
              Showing {{ filtersStore.filteredEvents.length }} of {{ filtersStore.futureEvents.length }} upcoming events
            </small>
          </p>
          <sl-button v-if="filtersStore.isChanged()" id="filter-reset" @click="resetFilters" type="primary"
            name="filter-reset"><i class="fa-solid fa-filter-circle-xmark"></i> Reset Filters</sl-button>
        </div>
        <!-- End status -->
        <div class="filters__controls d-flex gap-xs items-center">
          <sl-switch :checked="filtersStore.filters.showAwarenessDays" @sl-change="toggleAwarenessDays" id="filter-show-awareness-days">Awareness days</sl-switch>
          <sl-button id="open-filter-drawer" @click="openFilterDrawer">
            <i class="fa-solid fa-filter"></i> Filter
          </sl-button>
          <TimezoneSelector />
        </div>
        <!-- End filters__controls -->
    </div>
    <!-- End container -->
  </div>
  <!-- end Filter Bar -->
</template>

<script setup lang="ts">

import { ref, onMounted, nextTick } from 'vue';
import filtersStore from '../store/filtersStore';
import uiStore from '../store/uiStore';
import TimezoneSelector from './TimezoneSelector.vue';

const filterToolbar = ref(null);

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

onMounted(async () => {
  await nextTick();
  if (filterToolbar.value) {
    // Create an Intersection Observer to toggle the "is-pinned" class on the filter toolbar
    // when it intersects with the viewport
    const observer = new IntersectionObserver(
      ([e]) => e.target.classList.toggle('is-pinned', e.intersectionRatio < 1),
      { threshold: [1] }
    );
    // Start observing the filter toolbar
    observer.observe(filterToolbar.value);
  }
});

</script>