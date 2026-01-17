<template>
  <wa-drawer id="filter-drawer" label="Filters" modal>
    <div class="wa-stack wa-gap-l">
      <!-- Radio group filters -->
      <div class="wa-stack wa-gap-m">
        <wa-radio-group
          label="Attendance mode"
          name="attendance"
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
          :value="filtersStore.filters.cfs"
          @change="(e) => updateFilter('cfs', e)"
        >
          <wa-radio value="any">No preference</wa-radio>
          <wa-radio value="open">Accepting talks</wa-radio>
          <wa-radio value="closed">Not accepting talks</wa-radio>
        </wa-radio-group>
      </div>

      <!-- Toggle switches -->
      <div class="wa-stack wa-gap-s">
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

      <!-- Action buttons -->
      <div class="wa-stack wa-gap-xs wa-align-items-start">
        <wa-button variant="brand" size="large" data-drawer="close"
          >Show {{ filtersStore.nonDeadlineFilteredCount }} of
          {{ filtersStore.nonDeadlineFutureCount }} events</wa-button
        >
        <wa-button
          v-if="filtersStore.isChanged"
          id="filter-reset"
          @click="resetFilters"
          name="filter-reset"
          data-testid="drawer-reset"
        >
          <wa-icon name="filter-circle-xmark" variant="solid"></wa-icon> Reset
          Filters
        </wa-button>
      </div>
    </div>
  </wa-drawer>
</template>

<script setup lang="ts">
import { computed, watch, ref, onMounted } from 'vue';
import filtersStore from '../store/filtersStore';

const isFiltersChanged = computed(() => filtersStore.isChanged);

watch(
  () => filtersStore.filters,
  () => {
    console.debug('Filters changed:', filtersStore.filters);
    console.debug('Is changed:', isFiltersChanged.value);
  },
  { deep: true }
);

const awarenessDaysSwitch = ref(null);
const booksSwitch = ref(null);
const deadlinesSwitch = ref(null);

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

function resetFilters() {
  filtersStore.resetFilters();
  filtersStore.filters.cfs = 'any';
  filtersStore.filters.attendance = 'any';
  filtersStore.filters.cost = 'any';
}

function toggleAwarenessDays(event) {
  filtersStore.filters.showAwarenessDays = event.target.checked;
}

function toggleBooks(event) {
  filtersStore.filters.showBooks = event.target.checked;
}

function toggleDeadlines(event) {
  filtersStore.filters.showDeadlines = event.target.checked;
}

// Add update handler for radio groups
function updateFilter(
  filterName: 'cfs' | 'attendance' | 'cost',
  event: CustomEvent
) {
  filtersStore.filters[filterName] = event.target.value;
}
</script>
