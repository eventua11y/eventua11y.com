document.addEventListener("DOMContentLoaded", (event) => {

  if (window.location.pathname === "/") {

    // Get references to the necessary DOM elements
    const filterDrawer = document.getElementById("filter-drawer");
    const filterToolbar = document.querySelector('#filters');
    const openButton = document.getElementById("open-filter-drawer");
    const showEventsButton = document.getElementById("show-events");

    // Add an event listener to the open button to show the filter drawer when clicked
    openButton.addEventListener("click", () => filterDrawer.show());

    // Add an event listener to the show events button to hide the filter drawer when clicked
    showEventsButton.addEventListener("click", () => filterDrawer.hide());

    // Create an Intersection Observer to toggle the "is-pinned" class on the filter toolbar
    // when it intersects with the viewport
    const observer = new IntersectionObserver( 
    ([e]) => e.target.classList.toggle("is-pinned", e.intersectionRatio < 1),
    { threshold: [1] }
    );
    // Start observing the filter toolbar
    observer.observe(filterToolbar);

  }

  // Find all elements with the "no-js" class and remove that class
  const noJsElements = document.querySelectorAll(".no-js");
  noJsElements.forEach((element) => {
    element.classList.remove("no-js");
  });

});

if (window.location.pathname === "/") {

  document.addEventListener("alpine:init", () => {

    // Initialize the filters store with the initial state
    const initialFilters = {
      cfsOpen: false,
      cfsClosed: false,
      attendanceOnline: false,
      attendanceOffline: false,
      isFree: false,
      isPaid: false,
      themes: true,
    };

    // Load the persisted state from localStorage, if it exists
    const persistedFilters = JSON.parse(localStorage.getItem('filters')) || initialFilters;

    // Initialize the filters store with the persisted state
    Alpine.store("filters", {
      ...persistedFilters,
      initialFilters: initialFilters,
      totalEventCount: 0,
      visibleEventCount: 0,
    });

    // Persist the state to localStorage whenever it changes
    Alpine.effect(() => {
      const { initialFilters, totalEventCount, visibleEventCount, ...filters } = Alpine.store('filters');
      localStorage.setItem('filters', JSON.stringify(filters));
    });

    // Count the total number of events on the page
    const totalEvents = document.querySelectorAll(".event");
    Alpine.store("filters").totalEventCount = totalEvents.length;

    // Add a method to reset the filters to the initial state
    Alpine.store("filters").reset = () => {
      const initialFilters = Alpine.store("filters").initialFilters;
      Object.keys(initialFilters).forEach((key) => {
        Alpine.store("filters")[key] = initialFilters[key];
      });
      // After resetting the filters, re-filter the events
      Alpine.store("filters").filterEvents();
    };

    // Add a method to filter the events
    Alpine.store("filters").filterEvents = () => {
      // Select all events on the page
      const events = document.querySelectorAll(".event");
      const monthSections = document.querySelectorAll(".month");

      // Loop over the events
      events.forEach((event) => {
        // Get the event type, attendance mode, and cfs status
        const eventType = event.getAttribute("data-event-type");
        const eventAttendanceMode = event.getAttribute("data-event-attendancemode");
        const eventCfsStatus = event.getAttribute("data-event-cfs") !== null;
        const eventIsFree = event.getAttribute("data-event-isfree") !== null;

        // If the 'themes' filter is false and the event type is 'theme', hide the event
        // If the 'themes' filter is true and the event type is 'theme', show the event
        if (eventType === "theme") {
          event.hidden = !Alpine.store("filters").themes;
                } else {
          // Check if the event matches the attendance mode filter
          const matchesAttendanceMode =
            (!Alpine.store("filters").attendanceOnline &&
              !Alpine.store("filters").attendanceOffline) ||
            (Alpine.store("filters").attendanceOnline &&
              (eventAttendanceMode === "online" ||
                eventAttendanceMode === "mixed")) ||
            (Alpine.store("filters").attendanceOffline &&
              (eventAttendanceMode === "offline" ||
                eventAttendanceMode === "mixed"));
        
          // Check if the event matches the cfs filter
          const matchesCfs =
            (!Alpine.store("filters").cfsOpen &&
              !Alpine.store("filters").cfsClosed) ||
            (Alpine.store("filters").cfsOpen && eventCfsStatus) ||
            (Alpine.store("filters").cfsClosed && !eventCfsStatus);
        
          // Check if the event matches the isFree filter
          const matchesIsFree =
            !Alpine.store("filters").isFree || event.isFree;
        
          // If the event matches all filter criteria, show the event; otherwise, hide it
          event.hidden = !(matchesAttendanceMode && matchesCfs && matchesIsFree);
        }

        // After filtering the events, check each month section
        monthSections.forEach((section) => {
          // Select all visible events in the section
          const visibleEvents = section.querySelectorAll(".event:not([hidden])");

          // If there are no visible events in the section, hide the section
          section.hidden = visibleEvents.length === 0;
        });

        // Select the .events div in #Today
        const todayEvents = document.querySelector('#today .events');

        // Only execute the rest of the code if todayEvents exists
        if (todayEvents) {
          // Select all visible events in the .events div
          const visibleTodayEvents = todayEvents.querySelectorAll(".event:not([hidden])");
          // If there are no visible events in the .events div, hide the div
          todayEvents.hidden = visibleTodayEvents.length === 0;
        }

      });

      // After filtering the events, count the visible events
      const visibleEvents = document.querySelectorAll(".event:not([hidden])");
      Alpine.store("filters").visibleEventCount = visibleEvents.length;

    };

    // Add a method to check if the filters have changed
    Alpine.store("filters").isChanged = function() {
      return Object.keys(this.initialFilters).some(key => this[key] !== this.initialFilters[key]);
    };

    // Filter the events immediately after initializing the store
    Alpine.store("filters").filterEvents();

  });

}