<template>
  <div id="filters" class="wa-split wa-align-items-center">
    <!-- Left side: filter count and reset -->
    <div class="wa-cluster wa-gap-xs wa-align-items-center">
      <p aria-live="polite" aria-atomic="true">
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
        name="filter-reset"
        size="small"
      >
        <wa-icon name="filter-circle-xmark" variant="solid"></wa-icon> Reset
      </wa-button>
    </div>
    <!-- Right side: toggles and filter button -->
    <div class="wa-cluster wa-gap-xs wa-align-items-center">
      <wa-switch
        ref="awarenessDaysSwitch"
        :checked="filtersStore.filters.showAwarenessDays"
        @change="toggleAwarenessDays"
        id="filter-show-awareness-days-bar"
        >Awareness days</wa-switch
      >
      <wa-button id="open-filter-drawer" data-drawer="open filter-drawer">
        <wa-icon name="filter" variant="solid"></wa-icon> Filter
      </wa-button>
      <TimezoneSelector />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import filtersStore from '../store/filtersStore';
import TimezoneSelector from './TimezoneSelector.vue';

/**
 * FilterBar component
 * Displays filter controls and current filter status
 * Includes reset button, awareness days toggle, and filter drawer trigger
 */

/**
 * Reference to awareness days switch component
 * Used to ensure proper initialization of checked state
 */
const awarenessDaysSwitch = ref(null);

/**
 * Computed property to track filter changes
 * Used to show/hide reset button
 */
const isFiltersChanged = computed(() => filtersStore.isChanged);

/**
 * Watch filter changes for debugging
 * Logs current filters state and change status
 */
watch(
  () => filtersStore.filters,
  () => {
    console.debug('Filters changed:', filtersStore.filters);
    console.debug('Is changed:', isFiltersChanged.value);
  },
  { deep: true }
);

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
 * Initializes switch checked state from store
 */
onMounted(async () => {
  await nextTick();

  // Initialize switch state with setTimeout
  setTimeout(() => {
    if (awarenessDaysSwitch.value) {
      awarenessDaysSwitch.value.checked =
        filtersStore.filters.showAwarenessDays;
    }
  });
});
</script>
