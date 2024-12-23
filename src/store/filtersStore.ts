import { reactive, computed, watch } from 'vue';
import dayjs from 'dayjs';

interface Event {
  callForSpeakers?: boolean;
  callForSpeakersClosingDate?: string;
  type: string;
  attendanceMode: string;
}

interface Filters {
  cfsOpen: boolean;
  cfsClosed: boolean;
  attendanceOnline: boolean;
  attendanceOffline: boolean;
  showAwarenessDays: boolean;
}

interface FiltersStore {
  filters: Filters;
  events: Event[];
  todayEvents: Event[];
  futureEvents: Event[];
  pastEvents: Event[];
  filteredEvents: Event[];
  fetchEvents: () => Promise<void>;
  setEvents: (
    futureEvents: Event[],
    todayEvents: Event[],
    pastEvents: Event[]
  ) => void;
  resetFilters: () => void;
  isChanged: boolean;
  filterEvents: (events: Event[]) => Event[];
  updateFilteredEvents: () => void;
  showingAllEvents: boolean;
  nonDeadlineFutureCount: number;
  nonDeadlineFilteredCount: number;
}

const DEFAULT_FILTER_VALUES: Filters = {
  cfsOpen: false,
  cfsClosed: false,
  attendanceOnline: false,
  attendanceOffline: false,
  showAwarenessDays: true,
};

const defaultFilters: Filters = { ...DEFAULT_FILTER_VALUES };

/**
 * Checks if the call for speakers is open for a given event.
 * @param event - The event to check.
 * @returns True if the call for speakers is open, false otherwise.
 */
const isCallForSpeakersOpen = (event: Event): boolean => {
  if (!event.callForSpeakers) return false;
  if (!event.callForSpeakersClosingDate) return true;
  return dayjs().isBefore(dayjs(event.callForSpeakersClosingDate));
};

// Create a reactive reference to defaultFilters
const initialFilters = reactive({ ...defaultFilters });

/**
 * Loads filters from localStorage.
 * @returns The stored filters or the default filters if none are stored.
 */
const getStoredFilters = (): Filters => {
  if (typeof window === 'undefined' || !localStorage)
    return { ...defaultFilters };

  const saved = localStorage.getItem('filters');
  return saved ? JSON.parse(saved) : { ...defaultFilters };
};

const filtersStore: FiltersStore = reactive({
  filters: getStoredFilters(),
  events: [],
  todayEvents: [],
  futureEvents: [],
  pastEvents: [],
  filteredEvents: [],

  /**
   * Fetches events from the API and sets them in the store.
   */
  async fetchEvents() {
    try {
      const response = await fetch('/api/get-events?debug');
      const events = await response.json();
      this.setEvents(events.future, events.today, events.past);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  },

  /**
   * Sets the events in the store and updates the filtered events.
   * @param futureEvents - The future events.
   * @param todayEvents - The events happening today.
   * @param pastEvents - The past events.
   */
  setEvents(futureEvents: Event[], todayEvents: Event[], pastEvents: Event[]) {
    this.events = [...futureEvents, ...todayEvents, ...pastEvents];
    this.todayEvents = todayEvents;
    this.futureEvents = futureEvents;
    this.pastEvents = pastEvents;
    this.updateFilteredEvents();
  },

  /**
   * Resets the filters to their default values and updates the filtered events.
   */
  resetFilters() {
    // Reset filters by copying default values
    this.filters = { ...defaultFilters };
    localStorage.setItem('filters', JSON.stringify(this.filters));
    this.updateFilteredEvents();
  },

  /**
   * Computed property to check if the filters have changed from their default values.
   */
  isChanged: computed(() => {
    return Object.keys(defaultFilters).some(
      (key) =>
        filtersStore.filters[key as keyof Filters] !==
        defaultFilters[key as keyof Filters]
    );
  }),

  /**
   * Filters the events based on the current filters.
   * @param events - The events to filter.
   * @returns The filtered events.
   */
  filterEvents(events: Event[]): Event[] {
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

  /**
   * Updates the filtered events based on the current filters.
   */
  updateFilteredEvents() {
    this.filteredEvents = this.filterEvents(this.futureEvents);
  },

  /**
   * Computed property to check if all future events are being shown.
   */
  showingAllEvents: computed(() => {
    return (
      filtersStore.filteredEvents.length === filtersStore.futureEvents.length
    );
  }),

  nonDeadlineFutureCount: computed(() => {
    return filtersStore.futureEvents.filter(
      (event) => event.type !== 'deadline'
    ).length;
  }),

  nonDeadlineFilteredCount: computed(() => {
    return filtersStore.filteredEvents.filter(
      (event) => event.type !== 'deadline'
    ).length;
  }),
});

// Watch filters for changes and update localStorage and filtered events
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
