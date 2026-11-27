<template>
  <wa-drawer
    v-if="filtersStore.eventsStatus !== 'error'"
    id="filter-drawer"
    label="Filters"
  >
    <div class="flow flow-l">
      <div class="flow flow-xs">
        <wa-radio-group
          label="Attendance mode"
          name="attendance"
          size="medium"
          :value="filtersStore.filters.attendance"
          @change="(e) => updateFilter('attendance', e)"
        >
          <wa-radio value="any">No preference</wa-radio>
          <wa-radio value="online">Online</wa-radio>
          <wa-radio value="offline">In-person</wa-radio>
        </wa-radio-group>

        <wa-radio-group
          label="Ticket cost"
          name="cost"
          size="medium"
          :value="filtersStore.filters.cost"
          @change="(e) => updateFilter('cost', e)"
        >
          <wa-radio value="any">No preference</wa-radio>
          <wa-radio value="free">Free</wa-radio>
          <wa-radio value="paid">Paid</wa-radio>
        </wa-radio-group>

        <wa-radio-group
          label="Call for speakers"
          name="cfs"
          size="medium"
          :value="filtersStore.filters.cfs"
          @change="(e) => updateFilter('cfs', e)"
        >
          <wa-radio value="any">No preference</wa-radio>
          <wa-radio value="open">Accepting talks</wa-radio>
          <wa-radio value="closed">Not accepting talks</wa-radio>
        </wa-radio-group>
      </div>

      <div class="flow flow-xs">
        <wa-switch
          ref="awarenessDaysSwitch"
          :checked="filtersStore.filters.showAwarenessDays"
          @change="toggleAwarenessDays"
          id="filter-show-awareness-days-drawer"
          >Show awareness days</wa-switch
        >
        <wa-switch
          ref="booksSwitch"
          :checked="filtersStore.filters.showBooks"
          @change="toggleBooks"
          id="filter-show-books-drawer"
          >Show Book Club</wa-switch
        >
        <wa-switch
          ref="deadlinesSwitch"
          :checked="filtersStore.filters.showDeadlines"
          @change="toggleDeadlines"
          id="filter-show-deadlines-drawer"
          >Show speaker deadlines</wa-switch
        >
      </div>
      <div class="d-flex flex-col items-start gap-xs">
        <wa-button variant="brand" size="large" data-drawer="close"
          >Show {{ filtersStore.nonDeadlineFilteredCount }} of
          {{ filtersStore.nonDeadlineFutureCount }} events</wa-button
        >
        <wa-button
          v-if="filtersStore.isChanged"
          id="filter-reset"
          @click="resetFilters"
          variant="brand"
          name="filter-reset"
          data-testid="drawer-reset"
        >
          <wa-icon slot="start" name="filter-circle-xmark" auto-width></wa-icon>
          Reset Filters
        </wa-button>
      </div>
    </div>
  </wa-drawer>
</template>

<script setup lang="ts">
import type WaRadioGroup from '@awesome.me/webawesome/dist/components/radio-group/radio-group.js';
import type WaSwitch from '@awesome.me/webawesome/dist/components/switch/switch.js';
import { ref, onMounted } from 'vue';
import { capture } from '../lib/analytics';
import filtersStore from '../store/filtersStore';

const awarenessDaysSwitch = ref<WaSwitch | null>(null);
const booksSwitch = ref<WaSwitch | null>(null);
const deadlinesSwitch = ref<WaSwitch | null>(null);

onMounted(() => {
  // Only handle switch initialization
  setTimeout(() => {
    if (awarenessDaysSwitch.value) {
      awarenessDaysSwitch.value.checked =
        filtersStore.filters.showAwarenessDays;
    }
    if (booksSwitch.value) {
      booksSwitch.value.checked = filtersStore.filters.showBooks;
    }
    if (deadlinesSwitch.value) {
      deadlinesSwitch.value.checked = filtersStore.filters.showDeadlines;
    }
  });
});

function captureFilterChange(filterName: string, value: string | boolean) {
  capture('filters_changed', { filter_name: filterName, filter_value: value });
}

function resetFilters() {
  filtersStore.resetFilters();
  capture('filters_reset');
}

function toggleAwarenessDays(event: Event) {
  const { checked } = event.target as WaSwitch;
  filtersStore.filters.showAwarenessDays = checked;
  captureFilterChange('show_awareness_days', checked);
}

function toggleBooks(event: Event) {
  const { checked } = event.target as WaSwitch;
  filtersStore.filters.showBooks = checked;
  captureFilterChange('show_books', checked);
}

function toggleDeadlines(event: Event) {
  const { checked } = event.target as WaSwitch;
  filtersStore.filters.showDeadlines = checked;
  captureFilterChange('show_deadlines', checked);
}

function updateFilter<Key extends 'cfs' | 'attendance' | 'cost'>(
  filterName: Key,
  event: Event
) {
  const group = event.currentTarget as WaRadioGroup;
  // The options above define the allowed values for each filter.
  filtersStore.filters[filterName] =
    group.value as (typeof filtersStore.filters)[Key];
  captureFilterChange(filterName, filtersStore.filters[filterName]);
}
</script>

<style scoped>
wa-radio-group {
  border: 1px solid var(--s-color-border);
  border-radius: var(--p-space-2xs);
  padding: var(--p-space-xs);
  padding-top: var(--p-space-2xs);
}
</style>
