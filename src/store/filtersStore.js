import { reactive, computed, watch } from 'vue';
import getEvents from '../getEvents.js';

// Define the default filters
const defaultFilters = {
  cfsOpen: false,
  cfsClosed: false,
  attendanceOnline: false,
  attendanceOffline: false,
  themes: true,
};

// Load filters from local storage or use default filters
let storedFilters = { ...defaultFilters };
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  const savedFilters = localStorage.getItem('filters');
  if (savedFilters) {
    storedFilters = JSON.parse(savedFilters);
  }
}

// Create a reactive store
const filtersStore = reactive({
  filters: { ...storedFilters },
  events: [],
  async fetchEvents() {
    const events = await getEvents();
    this.events = events.future();
  },
  resetFilters() {
    this.filters = { ...defaultFilters };
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('filters', JSON.stringify(this.filters));
    }
  },
  isChanged() {
    return JSON.stringify(this.filters) !== JSON.stringify(defaultFilters);
  },
  filterEvents(events) {
    return events.filter((event) => {
      // Call for speakers filter
      const matchesCfs =
        (!this.filters.cfsOpen && !this.filters.cfsClosed) ||
        (this.filters.cfsOpen && event.callForSpeakers) ||
        (this.filters.cfsClosed && !event.callForSpeakers);

      // Attendance mode filter
      const matchesAttendance =
        (!this.filters.attendanceOnline && !this.filters.attendanceOffline) ||
        (this.filters.attendanceOnline &&
          (event.attendanceMode === 'online' || event.attendanceMode === 'mixed')) ||
        (this.filters.attendanceOffline &&
          (event.attendanceMode === 'offline' || event.attendanceMode === 'mixed'));

      // Themes filter
      const matchesThemes = this.filters.themes || event.type !== 'theme';

      return matchesCfs && matchesAttendance && matchesThemes;
    });
  },
  filteredEventCount: computed(() => {
    return filtersStore.filterEvents(filtersStore.events).length;
  }),
  totalEventCount: computed(() => {
    return filtersStore.events.length;
  }),
});

// Watch for changes to the filters and save them to local storage
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  watch(
    () => filtersStore.filters,
    (newFilters) => {
      localStorage.setItem('filters', JSON.stringify(newFilters));
    },
    { deep: true }
  );
}

export default filtersStore;