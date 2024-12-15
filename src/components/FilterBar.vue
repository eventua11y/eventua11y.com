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
          id="filter-show-awareness-days"
          >Awareness days</sl-switch
        >
        <sl-button id="open-filter-drawer" @click="handleFilterClick">
          <i class="fa-solid fa-filter"></i> Filter
        </sl-button>
        <TimezoneSelector />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import filtersStore from '../store/filtersStore';
import TimezoneSelector from './TimezoneSelector.vue';

const filterToolbar = ref(null);
const isFiltersChanged = computed(() => filtersStore.isChanged);

watch(() => filtersStore.filters, () => {
  console.debug('Filters changed:', filtersStore.filters);
  console.debug('Is changed:', isFiltersChanged.value);
}, { deep: true });

function resetFilters() {
  filtersStore.resetFilters();
}

function handleFilterClick() {
  const event = new CustomEvent('filters:open');
  document.dispatchEvent(event);
}

function toggleAwarenessDays(event) {
  filtersStore.filters.showAwarenessDays = event.target.checked;
}

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
