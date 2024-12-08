import { reactive, computed, watch } from 'vue';

// Define the default filters
const defaultFilters = {
  cfsOpen: false,
  cfsClosed: false,
  attendanceOnline: false,
  attendanceOffline: false,
  themes: true,
  showAwarenessDays: true, // New filter for awareness days
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
  todayEvents: [], // Add a separate property for today's events
  filteredEvents: [],
  async fetchEvents() {
    try {
      console.log('Fetching events from edge function...');
      const response = await fetch('/get-events');
      const events = await response.json();
      this.setEvents(events.future, events.today);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  },
  setEvents(futureEvents, todayEvents) {
    this.events = futureEvents;
    this.todayEvents = todayEvents; // Set today's events
    this.updateFilteredEvents();
  },
  resetFilters() {
    this.filters = { ...defaultFilters };
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('filters', JSON.stringify(this.filters));
    }
    this.updateFilteredEvents();
  },
  isChanged() {
    return JSON.stringify(this.filters) !== JSON.stringify(defaultFilters);
  },
  filterEvents(events) {
    return events.filter((event) => {
      // Always include awareness days if the filter is enabled
      if (this.filters.showAwarenessDays && event.type === 'theme') {
        return true;
      }

      // Exclude awareness days from other filters
      if (event.type === 'theme') {
        return false;
      }

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
  updateFilteredEvents() {
    this.filteredEvents = this.filterEvents(this.events);
    console.log('Filtered events updated:', this.filteredEvents);
  },
  filteredEventCount: computed(() => {
    return filtersStore.filteredEvents.length;
  }),
  totalEventCount: computed(() => {
    return filtersStore.events.length;
  }),
  showingAllEvents: computed(() => {
    return filtersStore.filteredEventCount === filtersStore.totalEventCount;
  }),
});

// Watch for changes to the filters and save them to local storage
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  watch(
    () => filtersStore.filters,
    (newFilters) => {
      localStorage.setItem('filters', JSON.stringify(newFilters));
      filtersStore.updateFilteredEvents(); // Trigger re-computation of events
    },
    { deep: true }
  );
}

export default filtersStore;