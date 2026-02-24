<template>
  <div id="filters" ref="filterToolbar" class="py-xs-s">
    <div class="container">
      <div class="filters__status">
        <p
          class="filters__count text-muted"
          aria-live="polite"
          aria-atomic="true"
        >
          <small v-if="filtersStore.showingAllEvents"
            >Showing all {{ filtersStore.nonDeadlineFutureCount }} upcoming
            events</small
          >
          <small v-else>
            Showing {{ filtersStore.nonDeadlineFilteredCount }} of
            {{ filtersStore.nonDeadlineFutureCount }} upcoming events
          </small>
        </p>
        <wa-button
          v-if="filtersStore.isChanged"
          id="filter-reset"
          @click="resetFilters"
          variant="brand"
          name="filter-reset"
        >
          <wa-icon slot="start" name="filter-circle-xmark" auto-width></wa-icon>
          Reset Filters
        </wa-button>
      </div>
      <div class="filters__controls d-flex gap-xs items-center">
        <wa-switch
          ref="awarenessDaysSwitch"
          :checked="filtersStore.filters.showAwarenessDays"
          @change="toggleAwarenessDays"
          id="filter-show-awareness-days-bar"
          >Awareness days</wa-switch
        >
        <div class="group">
          <wa-button
            id="open-filter-drawer"
            appearance="outlined"
            data-drawer="open filter-drawer"
          >
            <wa-icon slot="start" name="filter" auto-width></wa-icon> Filter
          </wa-button>
          <TimezoneSelector />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import filtersStore from '../store/filtersStore';
import TimezoneSelector from './TimezoneSelector.vue';

/**
 * FilterBar component
 * Displays filter controls and current filter status
 * Includes reset button, awareness days toggle, and filter drawer trigger
 */

/**
 * Reference to filter toolbar element for intersection observer
 * Used to add sticky positioning when scrolled
 */
const filterToolbar = ref(null);

/**
 * Reference to awareness days switch component
 * Used to ensure proper initialization of checked state
 */
const awarenessDaysSwitch = ref(null);

/**
 * Resets all filters to default values
 * Triggers store reset and updates UI
 */
function resetFilters() {
  filtersStore.resetFilters();
}

/**
 * Toggles awareness days filter
 * Updates store when switch changes
 */
function toggleAwarenessDays(event) {
  filtersStore.filters.showAwarenessDays = event.target.checked;
}

/**
 * Sets up intersection observer for sticky positioning
 * Adds 'is-pinned' class when toolbar scrolls out of view
 * Initializes switch checked state from store
 */
onMounted(async () => {
  await nextTick();

  // Remove the static placeholder now that the real FilterBar is mounted
  document.getElementById('filters-placeholder')?.remove();

  // Initialize switch state with setTimeout
  setTimeout(() => {
    if (awarenessDaysSwitch.value) {
      awarenessDaysSwitch.value.checked =
        filtersStore.filters.showAwarenessDays;
    }
  });

  // Existing intersection observer code
  if (filterToolbar.value) {
    const observer = new IntersectionObserver(
      ([e]) => e.target.classList.toggle('is-pinned', e.intersectionRatio < 1),
      { threshold: [1] }
    );
    observer.observe(filterToolbar.value);
  }
});
</script>
