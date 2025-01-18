<template>
  <sl-drawer id="filter-drawer" label="Filters" @sl-after-hide="emitCloseEvent">
    <div class="flow">
      <sl-radio-group
        label="Attendance mode"
        name="attendance"
        :value="filtersStore.filters.attendance"
        @sl-change="(e) => updateFilter('attendance', e)"
      >
        <sl-radio value="any">No preference</sl-radio>
        <sl-radio value="online">Online</sl-radio>
        <sl-radio value="offline">In-person</sl-radio>
      </sl-radio-group>

      <sl-radio-group
        label="Ticket cost"
        name="cost"
        :value="filtersStore.filters.cost"
        @sl-change="(e) => updateFilter('cost', e)"
      >
        <sl-radio value="any">No preference</sl-radio>
        <sl-radio value="free">Free</sl-radio>
        <sl-radio value="paid">Paid</sl-radio>
      </sl-radio-group>

      <sl-radio-group
        label="Call for speakers"
        name="cfs"
        :value="filtersStore.filters.cfs"
        @sl-change="(e) => updateFilter('cfs', e)"
      >
        <sl-radio value="any">No preference</sl-radio>
        <sl-radio value="open">Accepting talks</sl-radio>
        <sl-radio value="closed">Not accepting talks</sl-radio>
      </sl-radio-group>

      <sl-switch
        ref="awarenessDaysSwitch"
        :checked="filtersStore.filters.showAwarenessDays"
        @sl-change="toggleAwarenessDays"
        id="filter-show-awareness-days-drawer"
        >Show awareness days</sl-switch
      >
      <sl-switch
        ref="booksSwitch"
        :checked="filtersStore.filters.showBooks"
        @sl-change="toggleBooks"
        id="filter-show-books-drawer"
        >Show Book Club</sl-switch
      >
      <sl-switch
        ref="deadlinesSwitch"
        :checked="filtersStore.filters.showDeadlines"
        @sl-change="toggleDeadlines"
        id="filter-show-deadlines-drawer"
        >Show speaker deadlines</sl-switch
      >
      <div class="d-flex flex-col items-start gap-xs">
        <sl-button variant="primary" size="large" @click="closeDrawer"
          >Show {{ filtersStore.nonDeadlineFilteredCount }} of
          {{ filtersStore.nonDeadlineFutureCount }} events</sl-button
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

function emitCloseEvent() {
  const event = new CustomEvent('filters:close');
  document.dispatchEvent(event);
}

function closeDrawer() {
  emitCloseEvent();
}

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

<style scoped>
sl-radio-group {
  border: 1px solid var(--s-color-border);
  border-radius: var(--p-space-2xs);
  padding: var(--p-space-xs);
}
</style>
