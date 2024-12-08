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
  todayEvents: [],
  futureEvents: [],
  pastEvents: [],
  filteredEvents: [],
  async fetchEvents() {
    try {
      const stackTrace = new Error().stack;
      console.log('Fetching events from the edge', stackTrace);
      const response = await fetch('/get-events');
      const events = await response.json();
      this.setEvents(events.future, events.today, events.past);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  },
  setEvents(futureEvents, todayEvents, pastEvents) {
    this.events = [...futureEvents, ...todayEvents, ...pastEvents];
    this.todayEvents = todayEvents;
    this.futureEvents = futureEvents;
    this.pastEvents = pastEvents;
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
    this.filteredEvents = this.filterEvents(this.futureEvents);
    console.log('Filtered events updated:', this.filteredEvents);
  },
  showingAllEvents: computed(() => {
    return filtersStore.filteredEvents.length === filtersStore.futureEvents.length;
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

// If events are not already loaded, fetch them
if (!filtersStore.events.length) {
  await filtersStore.fetchEvents();
}

export default filtersStore;