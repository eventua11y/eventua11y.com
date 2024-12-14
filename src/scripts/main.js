document.addEventListener('DOMContentLoaded', () => {
  // Find all elements with the "no-js" class and remove that class
  const noJsElements = document.querySelectorAll('.no-js');
  noJsElements.forEach((element) => {
    element.classList.remove('no-js');
  });

  // Theme selection functionality
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