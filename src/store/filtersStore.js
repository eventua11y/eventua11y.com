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
});

export default filtersStore;