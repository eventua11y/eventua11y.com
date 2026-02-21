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
        <sl-button
          v-if="filtersStore.isChanged"
          id="filter-reset"
          @click="resetFilters"
          type="primary"
          name="filter-reset"
        >
          <Icon name="filter-circle-xmark" /> Reset Filters
        </sl-button>
      </div>
      <div class="filters__controls d-flex gap-xs items-center">
        <sl-switch
          ref="awarenessDaysSwitch"
          :checked="filtersStore.filters.showAwarenessDays"
          @sl-change="toggleAwarenessDays"
          id="filter-show-awareness-days-bar"
          >Awareness days</sl-switch
        >
        <div class="group">
          <sl-button id="open-filter-drawer" @click="handleFilterClick">
            <Icon name="filter" /> Filter
          </sl-button>
          <TimezoneSelector />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import Icon from './Icon.vue';
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
