<template>
  <sl-drawer id="filter-drawer" label="Filters" @sl-after-hide="emitCloseEvent">
    <div class="flow">
      <fieldset class="checkbox-group filter flow flow-tight">
        <legend class="text-muted">Call for speakers</legend>
        <div class="checkbox">
          <input
            type="checkbox"
            v-model="filtersStore.filters.cfsOpen"
            id="filter-cfs-open"
            class="filter-option"
          />
          <label for="filter-cfs-open">Accepting talks</label>
        </div>
        <div class="checkbox">
          <input
            type="checkbox"
            v-model="filtersStore.filters.cfsClosed"
            id="filter-cfs-closed"
            class="filter-option"
          />
          <label for="filter-cfs-closed">Not accepting talks</label>
        </div>
      </fieldset>
      <fieldset class="checkbox-group filter flow flow-tight">
        <legend class="text-muted">Attendance mode</legend>
        <div class="checkbox">
          <input
            type="checkbox"
            v-model="filtersStore.filters.attendanceOnline"
            id="filter-attendance-online"
            class="filter-option"
          />
          <label for="filter-attendance-online">Online</label>
        </div>
        <div class="checkbox">
          <input
            type="checkbox"
            v-model="filtersStore.filters.attendanceOffline"
            id="filter-attendance-offline"
            class="filter-option"
          />
          <label for="filter-attendance-offline">Offline</label>
        </div>
      </fieldset>
      <sl-switch
        :checked="filtersStore.filters.showAwarenessDays"
        @sl-change="toggleAwarenessDays"
        id="filter-show-awareness-days"
        >Show awareness days</sl-switch
      >
      <div class="d-flex flex-col items-start gap-xs">
        <sl-button variant="primary" size="large" @click="closeDrawer"
          >Show {{ filtersStore.filteredEvents.length }} of
          {{ filtersStore.futureEvents.length }} events</sl-button
        >
        <sl-button
          v-if="filtersStore.isChanged"
          id="filter-reset"
          @click="resetFilters"
          type="primary"
          name="filter-reset"
          data-testid="drawer-reset"
        >
          <i class="fa-solid fa-filter-circle-xmark"></i> Reset Filters
        </sl-button>
      </div>
    </div>
  </sl-drawer>
</template>

<script setup lang="ts">
import { onMounted, computed, watch } from 'vue';
import filtersStore from '../store/filtersStore';

const isFiltersChanged = computed(() => filtersStore.isChanged);

watch(() => filtersStore.filters, () => {
  console.debug('Filters changed:', filtersStore.filters);
  console.debug('Is changed:', isFiltersChanged.value);
}, { deep: true });

function emitCloseEvent() {
  const event = new CustomEvent('filters:close');
  document.dispatchEvent(event);
}

function closeDrawer() {
  emitCloseEvent();
}

function resetFilters() {
  filtersStore.resetFilters();
}

function toggleAwarenessDays(event) {
  filtersStore.filters.showAwarenessDays = event.target.checked;
}
</script>
