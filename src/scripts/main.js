document.addEventListener('DOMContentLoaded', () => {
  // Find all elements with the "no-js" class and remove that class
  const noJsElements = document.querySelectorAll('.no-js');
  noJsElements.forEach((element) => {
    element.classList.remove('no-js');
  });

  // Get references to the necessary DOM elements for the filter drawer
  const filterDrawer = document.getElementById('filter-drawer');
  const filterToolbar = document.querySelector('#filters');
  const openButton = document.getElementById('open-filter-drawer');
  const showEventsButton = document.getElementById('show-events');

  // Add an event listener to the open button to show the filter drawer when clicked
  openButton.addEventListener('click', () => filterDrawer.show());

  // Add an event listener to the show events button to hide the filter drawer when clicked
  showEventsButton.addEventListener('click', () => filterDrawer.hide());

  // Create an Intersection Observer to toggle the "is-pinned" class on the filter toolbar
  // when it intersects with the viewport
  const observer = new IntersectionObserver(
    ([e]) => e.target.classList.toggle('is-pinned', e.intersectionRatio < 1),
    { threshold: [1] }
  );
  // Start observing the filter toolbar
  observer.observe(filterToolbar);

  // Theme selection functionality

  /**
   * Applies the selected theme and updates the local storage and button text accordingly.
   * 
   * @param {string|null} theme - The selected theme ('light', 'dark', or null for system default).
   */

  const LIGHT_MODE_ICON = '<sl-icon label="Light mode" name="sun-fill"></sl-icon>';
  const DARK_MODE_ICON = '<sl-icon label="Dark mode" name="moon-fill"></sl-icon>';

  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');  

  function applyTheme(theme) {
    const themeSelectorButton = document.getElementById('theme-selector-button');

    if (!themeSelectorButton) {
      console.error('Theme selector button not found');
      return;
    }
    
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('sl-theme-dark');
      localStorage.setItem('theme', 'light');
      themeSelectorButton.innerHTML = LIGHT_MODE_ICON;
    } else if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('sl-theme-dark');
      localStorage.setItem('theme', 'dark');
      themeSelectorButton.innerHTML = DARK_MODE_ICON;
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.classList.remove('sl-theme-dark');
      localStorage.removeItem('theme');
      if (prefersDarkScheme.matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('sl-theme-dark');
        themeSelectorButton.innerHTML = DARK_MODE_ICON;
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        themeSelectorButton.innerHTML = LIGHT_MODE_ICON;
      }
    }
  }

  /**
   * Updates the checked state of the theme selection menu items based on the current theme.
   * 
   * @param {string|null} theme - The current theme ('light', 'dark', or null for system default).
   */
  function updateSelection(theme) {
    const lightModeItem = document.getElementById('light-mode');
    const darkModeItem = document.getElementById('dark-mode');
    const systemDefaultItem = document.getElementById('system-default');

    if (!lightModeItem || !darkModeItem || !systemDefaultItem) {
      console.error('Theme selection items not found');
      return;
    }

    lightModeItem.checked = theme === 'light';
    darkModeItem.checked = theme === 'dark';
    systemDefaultItem.checked = theme === null;
  }

  const storedTheme = localStorage.getItem('theme');
  if (storedTheme) {
    applyTheme(storedTheme);
    updateSelection(storedTheme);
  } else {
    applyTheme(null);
    updateSelection(null);
  }

  document.querySelector('sl-menu').addEventListener('sl-select', (event) => {
    const selectedItem = event.detail.item;
    const selectedTheme = selectedItem.value;
    if (selectedTheme === 'light') {
      applyTheme('light');
      updateSelection('light');
    } else if (selectedTheme === 'dark') {
      applyTheme('dark');
      updateSelection('dark');
    } else {
      applyTheme(null);
      updateSelection(null);
    }
  });

  // Listen for changes to the user's system preference and update the theme accordingly
  prefersDarkScheme.addEventListener('change', (event) => {
    if (!localStorage.getItem('theme')) {
      if (event.matches) {
        applyTheme('dark');
      } else {
        applyTheme('light');
      }
    }
  });
});

