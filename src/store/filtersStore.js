import { reactive, computed, watch } from 'vue';
import dayjs from 'dayjs';

const DEFAULT_FILTER_VALUES = {
  cfsOpen: false,
  cfsClosed: false,
  attendanceOnline: false,
  attendanceOffline: false,
  showAwarenessDays: true,
};

const defaultFilters = { ...DEFAULT_FILTER_VALUES };

const isCallForSpeakersOpen = (event) => {
  if (!event.callForSpeakers) return false;
  if (!event.callForSpeakersClosingDate) return true;
  return dayjs().isBefore(dayjs(event.callForSpeakersClosingDate));
};

// Create a reactive reference to defaultFilters
const initialFilters = reactive({ ...defaultFilters });

// Load filters from localStorage
const getStoredFilters = () => {
  if (typeof window === 'undefined' || !localStorage) return { ...defaultFilters };

  const saved = localStorage.getItem('filters');
  return saved ? JSON.parse(saved) : { ...defaultFilters };
};

const filtersStore = reactive({
  filters: getStoredFilters(),
  events: [],
  todayEvents: [],
  futureEvents: [],
  pastEvents: [],
  filteredEvents: [],

  async fetchEvents() {
    try {
      const response = await fetch('/api/get-events');
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
    // Reset filters by copying default values
    this.filters = { ...defaultFilters };
    localStorage.setItem('filters', JSON.stringify(this.filters));
    this.updateFilteredEvents();
  },

  isChanged: computed(() => {
    return Object.keys(defaultFilters).some(
      key => filtersStore.filters[key] !== defaultFilters[key]
    );
  }),

  filterEvents(events) {
    return events.filter((event) => {
      // Handle awareness days
      if (this.filters.showAwarenessDays && event.type === 'theme') return true;
      if (event.type === 'theme') return false;

      // Call for speakers filter
      const cfsStatus = isCallForSpeakersOpen(event);
      const matchesCfs =
        (!this.filters.cfsOpen && !this.filters.cfsClosed) ||
        (this.filters.cfsOpen && cfsStatus) ||
        (this.filters.cfsClosed && !cfsStatus);

      // Attendance mode filter
      const matchesAttendance =
        (!this.filters.attendanceOnline && !this.filters.attendanceOffline) ||
        (this.filters.attendanceOnline &&
          ['online', 'mixed'].includes(event.attendanceMode)) ||
        (this.filters.attendanceOffline &&
          ['offline', 'mixed'].includes(event.attendanceMode));

      // Themes filter
      const matchesThemes = this.filters.themes || event.type !== 'theme';

      return matchesCfs && matchesAttendance && matchesThemes;
    });
  },

  updateFilteredEvents() {
    this.filteredEvents = this.filterEvents(this.futureEvents);
  },

  showingAllEvents: computed(() => {
    return (
      filtersStore.filteredEvents.length === filtersStore.futureEvents.length
    );
  }),
});

// Watch filters for changes
if (typeof window !== 'undefined' && localStorage) {
  watch(
    () => filtersStore.filters,
    (newFilters) => {
      localStorage.setItem('filters', JSON.stringify(newFilters));
      filtersStore.updateFilteredEvents();
    },
    { deep: true }
  );
}

// Initial events fetch
if (typeof window !== 'undefined' && !filtersStore.events.length) {
  filtersStore.fetchEvents();
}

export default filtersStore;