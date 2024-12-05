import { reactive } from 'vue';

// Define the default filters
const defaultFilters = {
  cfsOpen: false,
  cfsClosed: false,
  attendanceOnline: false,
  attendanceOffline: false,
  themes: true,
};

// Create a reactive store
const filtersStore = reactive({
  filters: { ...defaultFilters },
  resetFilters() {
    this.filters = { ...defaultFilters };
  },
  isChanged() {
    return JSON.stringify(this.filters) !== JSON.stringify(defaultFilters);
  },
});

export default filtersStore;