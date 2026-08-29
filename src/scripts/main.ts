document.addEventListener('DOMContentLoaded', () => {
  // Find all elements with the "no-js" class and remove that class
  const noJsElements = document.querySelectorAll<HTMLElement>('.no-js');
  noJsElements.forEach((element) => {
    element.classList.remove('no-js');
  });
  // Theme switching. Three states are stored - "light", "dark", or nothing at
  // all, meaning follow the device - but only two are offered, because the
  // toggle clears the override when the state you're switching to is the one
  // the device already asks for. See https://lea.verou.me/blog/2026/dark-mode-toggles/
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

  // Check whether localStorage is available (it can be null in restricted
  // browsing contexts such as some bots, iframes, or privacy-focused browsers).
  function storageAvailable(): boolean {
    try {
      return typeof localStorage !== 'undefined' && localStorage !== null;
    } catch {
      return false;
    }
  }

  /**
   * Reads the stored override. Anything unrecognised means no override, which
   * is also how the pre-paint script in the layouts reads a missing value.
   */
  function storedTheme(): 'light' | 'dark' | null {
    if (!storageAvailable()) return null;
    const stored = localStorage.getItem('theme');
    return stored === 'light' || stored === 'dark' ? stored : null;
  }

  function systemTheme(): 'light' | 'dark' {
    return prefersDarkScheme.matches ? 'dark' : 'light';
  }

  /**
   * Paints a resolved theme and points the toggle at the other one. Storage is
   * written by toggleTheme(), never here, so this stays safe to call from the
   * system preference listener.
   * @param theme - The theme to paint ('light' or 'dark').
   */
  function applyTheme(theme: 'light' | 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('wa-dark', theme === 'dark');

    // Absent on the error layout, which has a logo-only masthead.
    const icon = document
      .getElementById('theme-selector-button')
      ?.querySelector('wa-icon');
    if (!icon) return;

    if (theme === 'dark') {
      icon.setAttribute('name', 'sun-bright');
      icon.setAttribute('label', 'Switch to light mode');
    } else {
      icon.setAttribute('name', 'moon');
      icon.setAttribute('label', 'Switch to dark mode');
    }
  }

  /**
   * Stores the opposite of what's on screen, unless that opposite is what the
   * device already asks for, in which case the override is cleared so the
   * device setting is followed again rather than pinned to a matching value.
   */
  function toggleTheme() {
    const next = (storedTheme() ?? systemTheme()) === 'dark' ? 'light' : 'dark';
    if (storageAvailable()) {
      if (next === systemTheme()) {
        localStorage.removeItem('theme');
      } else {
        localStorage.setItem('theme', next);
      }
    }
    applyTheme(next);
  }

  applyTheme(storedTheme() ?? systemTheme());

  document
    .getElementById('theme-selector-button')
    ?.addEventListener('click', toggleTheme);

  // A device that switches at sunset moves the page only when no override is
  // stored. It never clears one, so a deliberate choice survives.
  prefersDarkScheme.addEventListener('change', () => {
    if (!storedTheme()) applyTheme(systemTheme());
  });
});
