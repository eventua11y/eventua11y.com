import { reactive, computed, watch } from 'vue';
import { isCallForSpeakersOpen, compareByDateAsc } from '../utils/eventUtils';
import type { Event, Book } from '../types/event';

type ListItem = Event | Book;

/**
 * Filter options for event list display.
 */
interface Filters {
  cfs: 'any' | 'open' | 'closed';
  attendance: 'any' | 'online' | 'offline';
  cost: 'any' | 'free' | 'paid';
  showAwarenessDays: boolean;
  showBooks: boolean;
  showDeadlines: boolean;
}

/**
 * Reactive store type as seen by consumers.
 * Computed properties are listed as their unwrapped types because
 * `reactive()` automatically unwraps `ComputedRef<T>` to `T`.
 */
interface FiltersStore {
  filters: Filters;
  eventsStatus: 'loading' | 'success' | 'error';
  events: Event[];
  todayEvents: Event[];
  futureEvents: Event[];
  pastEvents: Event[];
  filteredEvents: ListItem[];
  books: Book[];
  fetchEvents: () => Promise<void>;
  fetchBooks: () => Promise<void>;
  setEvents: (
    futureEvents: Event[],
    todayEvents: Event[],
    pastEvents: Event[]
  ) => void;
  resetFilters: () => void;
  filterEvents: (events: Event[]) => Event[];
  updateFilteredEvents: () => void;
  // Computed properties (unwrapped by reactive)
  isChanged: boolean;
  showingAllEvents: boolean;
  nonDeadlineFutureCount: number;
  nonDeadlineFilteredCount: number;
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
 * Loads filters from localStorage.
 * @returns The stored filters or the default filters if none are stored.
 */
const getStoredFilters = (): Filters => {
  const filters = { ...defaultFilters };
  if (typeof window === 'undefined') return filters;

  try {
    const saved = window.localStorage.getItem('filters');
    if (!saved) return filters;
    const stored: unknown = JSON.parse(saved);
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
      console.warn('Saved filters are invalid; using defaults.');
      return filters;
    }

    const values = stored as Record<string, unknown>;
    if (
      values.cfs === 'any' ||
      values.cfs === 'open' ||
      values.cfs === 'closed'
    )
      filters.cfs = values.cfs;
    if (
      values.attendance === 'any' ||
      values.attendance === 'online' ||
      values.attendance === 'offline'
    )
      filters.attendance = values.attendance;
    if (
      values.cost === 'any' ||
      values.cost === 'free' ||
      values.cost === 'paid'
    )
      filters.cost = values.cost;
    if (typeof values.showAwarenessDays === 'boolean')
      filters.showAwarenessDays = values.showAwarenessDays;
    if (typeof values.showBooks === 'boolean')
      filters.showBooks = values.showBooks;
    if (typeof values.showDeadlines === 'boolean')
      filters.showDeadlines = values.showDeadlines;
    if (
      (Object.keys(filters) as (keyof Filters)[]).some(
        (key) => key in values && values[key] !== filters[key]
      )
    ) {
      console.warn('Some saved filters are invalid; using defaults for them.');
    }
  } catch {
    console.warn('Could not restore saved filters; using defaults.');
  }
  return filters;
};

function saveFilters(filters: Filters) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('filters', JSON.stringify(filters));
  } catch {
    console.warn('Could not save filters for future visits.');
  }
}

// Type assertion is needed because computed() returns ComputedRef<T>,
// but reactive() unwraps it to T at runtime. TypeScript cannot express
// this self-referential unwrapping without an explicit interface.
const filtersStore = reactive({
  filters: getStoredFilters(),
  eventsStatus: 'loading' as FiltersStore['eventsStatus'],
  events: [] as Event[],
  todayEvents: [] as Event[],
  futureEvents: [] as Event[],
  pastEvents: [] as Event[],
  filteredEvents: [] as ListItem[],
  books: [] as Book[],

  /**
   * Fetches events from the API and sets them in the store.
   */
  async fetchEvents() {
    this.eventsStatus = 'loading';
    void this.fetchBooks();
    try {
      const eventsResponse = await fetch('/api/get-events');
      if (!eventsResponse.ok) throw new Error('Failed to fetch events');
      const events = await eventsResponse.json();
      this.setEvents(events.future, events.today, events.past);
      this.eventsStatus = 'success';
    } catch (error) {
      this.eventsStatus = 'error';
      console.error('Error fetching events:', error);
    }
  },

  async fetchBooks() {
    try {
      const response = await fetch('/api/get-books');
      if (!response.ok) throw new Error('Failed to fetch books');
      const books = await response.json();
      this.books = books.map((book: Record<string, unknown>) => ({
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
    this.filters = { ...defaultFilters };
    saveFilters(this.filters);
    this.updateFilteredEvents();
  },

  /**
   * Whether any filter has changed from its default value.
   */
  isChanged: computed(() => {
    return Object.keys(defaultFilters).some(
      (key) =>
        filtersStore.filters[key as keyof Filters] !==
        defaultFilters[key as keyof Filters]
    );
  }),

  /**
   * Filters events based on current filter settings.
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
          ['online', 'mixed'].includes(event.attendanceMode || '')) ||
        (this.filters.attendance === 'offline' &&
          ['offline', 'mixed'].includes(event.attendanceMode || ''));

      // Cost filter
      const matchesCost =
        this.filters.cost === 'any' ||
        (this.filters.cost === 'free' && event.isFree) ||
        (this.filters.cost === 'paid' && !event.isFree);

      return matchesCfs && matchesAttendance && matchesCost;
    });
  },

  /**
   * Updates filtered events based on current filters.
   * Applies filters to future events, conditionally includes books,
   * and sorts combined results chronologically.
   */
  updateFilteredEvents() {
    const filteredBaseEvents = this.filterEvents(this.futureEvents);
    const relevantBooks = this.filters.showBooks ? this.books : [];
    this.filteredEvents = [...filteredBaseEvents, ...relevantBooks].sort(
      compareByDateAsc
    );
  },

  /**
   * Whether all future events are being shown (no filtering active).
   */
  showingAllEvents: computed(() => {
    return (
      filtersStore.nonDeadlineFilteredCount ===
      filtersStore.nonDeadlineFutureCount
    );
  }),

  /**
   * Count of non-deadline and non-book future events.
   */
  nonDeadlineFutureCount: computed(() => {
    return filtersStore.futureEvents.filter(
      (event: Event) => event.type !== 'deadline' && event._type !== 'book'
    ).length;
  }),

  /**
   * Count of non-deadline and non-book filtered events.
   */
  nonDeadlineFilteredCount: computed(() => {
    return filtersStore.filteredEvents.filter(
      (item: ListItem) =>
        item._type !== 'book' && 'type' in item && item.type !== 'deadline'
    ).length;
  }),
}) as unknown as FiltersStore;

// Watch filters for changes and update localStorage and filtered events
if (typeof window !== 'undefined') {
  watch(
    () => filtersStore.filters,
    (newFilters) => {
      saveFilters(newFilters);
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
