<template>
  <div id="filters" class="py-xs-s">
    <div class="container">
      <div class="filters__status">
        <p
          class="filters__count text-muted"
          aria-live="polite"
          aria-atomic="true"
        >
          <small v-if="filtersStore.showingAllEvents"
            >Showing all {{ filtersStore.futureEvents.length }} upcoming
            events</small
          >
          <small v-else>
            Showing {{ filtersStore.filteredEvents.length }} of
            {{ filtersStore.futureEvents.length }} upcoming events
          </small>
        </p>
        <sl-button
          v-if="filtersStore.isChanged"
          id="filter-reset"
          @click="resetFilters"
          type="primary"
          name="filter-reset"
        >
          <i class="fa-solid fa-filter-circle-xmark"></i> Reset Filters
        </sl-button>
      </div>
      <div class="filters__controls d-flex gap-xs items-center">
        <sl-switch
          :checked="filtersStore.filters.showAwarenessDays"
          @sl-change="toggleAwarenessDays"
          id="filter-show-awareness-days-bar"
          >Awareness days</sl-switch
        >
        <div class="group">
          <sl-button id="open-filter-drawer" @click="handleFilterClick">
            <i class="fa-solid fa-filter"></i> Filter
          </sl-button>
          <TimezoneSelector />
        </div>
      </div>
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
 * Reference to filter toolbar element for intersection observer
 * Used to add sticky positioning when scrolled
 */
const filterToolbar = ref(null);

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
 * Handles filter button click
 * Dispatches custom event to open filter drawer
 */
function handleFilterClick() {
  const event = new CustomEvent('filters:open');
  document.dispatchEvent(event);
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
 */
onMounted(async () => {
  await nextTick();
  if (filterToolbar.value) {
    const observer = new IntersectionObserver(
      ([e]) => e.target.classList.toggle('is-pinned', e.intersectionRatio < 1),
      { threshold: [1] }
    );
    observer.observe(filterToolbar.value);
  }
});
</script>
