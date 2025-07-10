import { reactive, computed, watch } from 'vue';
import dayjs from 'dayjs';

interface Event {
  callForSpeakers?: boolean;
  callForSpeakersClosingDate?: string;
  type: string;
  attendanceMode: string;
  _type?: string;
  dateStart: string;
}

/**
 * Interface defining filter options
 * - CFS filters (open/closed)
 * - Attendance mode filters (online/offline)
 * - Content type filters (awareness days, books, deadlines)
 */
interface Filters {
  cfs: 'any' | 'open' | 'closed';
  attendance: 'any' | 'online' | 'offline';
  cost: 'any' | 'free' | 'paid';
  // Remove old boolean properties
  cfsOpen?: never;
  cfsClosed?: never;
  attendanceOnline?: never;
  attendanceOffline?: never;
  showFreeEvents?: never;
  showPaidEvents?: never;
  showAwarenessDays: boolean;
  showBooks: boolean;
  showDeadlines: boolean;
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
  books: Event[];
  fetchBooks: () => Promise<void>;
}

const DEFAULT_FILTER_VALUES: Filters = {
  cfs: 'any',
  attendance: 'any',
  cost: 'any',
  showAwarenessDays: true,
  showBooks: true,
  showDeadlines: true,
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
  books: [],

  /**
   * Fetches events from the API and sets them in the store.
   */
  async fetchEvents() {
    try {
      const [eventsResponse] = await Promise.all([
        fetch('/api/get-events'),
        this.fetchBooks(),
      ]);
      const events = await eventsResponse.json();
      this.setEvents(events.future, events.today, events.past);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  },

  async fetchBooks() {
    try {
      const response = await fetch('/api/get-books');
      if (!response.ok) throw new Error('Failed to fetch books');
      const books = await response.json();
      this.books = books.map((book) => ({
        ...book,
        _type: 'book',
        dateStart: book.date, // date is already in UTC ISO format
      }));
      this.updateFilteredEvents();
    } catch (error) {
      console.error('Error fetching books:', error);
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
   * Filters events based on current filter settings
   * - Handles deadlines visibility
   * - Handles awareness days visibility
   * - Applies CFS status filters
   * - Applies attendance mode filters
   * @param events - Array of events to filter
   * @returns Filtered array of events
   */
  filterEvents(events: Event[]): Event[] {
    return events.filter((event) => {
      // Handle deadlines
      if (event.type === 'deadline') return this.filters.showDeadlines;

      // Handle awareness days
      if (this.filters.showAwarenessDays && event.type === 'theme') return true;
      if (event.type === 'theme') return false;

      // Call for speakers filter
      const cfsStatus = isCallForSpeakersOpen(event);
      const matchesCfs =
        this.filters.cfs === 'any' ||
        (this.filters.cfs === 'open' && cfsStatus) ||
        (this.filters.cfs === 'closed' && !cfsStatus);

      // Attendance mode filter
      const matchesAttendance =
        this.filters.attendance === 'any' ||
        (this.filters.attendance === 'online' &&
          ['online', 'mixed'].includes(event.attendanceMode)) ||
        (this.filters.attendance === 'offline' &&
          ['offline', 'mixed'].includes(event.attendanceMode));

      // Cost filter
      const matchesCost =
        this.filters.cost === 'any' ||
        (this.filters.cost === 'free' && event.isFree) ||
        (this.filters.cost === 'paid' && !event.isFree);

      return matchesCfs && matchesAttendance && matchesCost;
    });
  },

  /**
   * Updates filtered events based on current filters
   * - Applies filters to future events
   * - Conditionally includes books based on showBooks filter
   * - Sorts combined results chronologically
   */
  updateFilteredEvents() {
    const filteredBaseEvents = this.filterEvents(this.futureEvents);
    // Only include books if the filter is enabled
    const relevantBooks = this.filters.showBooks ? this.books : [];
    this.filteredEvents = [...filteredBaseEvents, ...relevantBooks].sort(
      (a, b) =>
        new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime()
    );
  },

  /**
   * Computed property to check if all future events are being shown.
   */
  showingAllEvents: computed(() => {
    return (
      filtersStore.nonDeadlineFilteredCount ===
      filtersStore.nonDeadlineFutureCount
    );
  }),

  /**
   * Count of non-deadline and non-book future events
   * Used for filter status display
   */
  nonDeadlineFutureCount: computed(() => {
    return filtersStore.futureEvents.filter(
      (event) => event.type !== 'deadline' && event._type !== 'book'
    ).length;
  }),

  /**
   * Count of non-deadline and non-book filtered events
   * Used for filter status display
   */
  nonDeadlineFilteredCount: computed(() => {
    return filtersStore.filteredEvents.filter(
      (event) => event.type !== 'deadline' && event._type !== 'book'
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
