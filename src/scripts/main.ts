document.addEventListener('DOMContentLoaded', () => {
  // Theme switching. Three states are stored - "light", "dark", or nothing at
  // all, meaning follow the device - but only two are offered, because the
  // toggle clears the override when the state you're switching to is the one
  // the device already asks for. See https://lea.verou.me/blog/2026/dark-mode-toggles/
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

  /**
   * Reads the stored override. Anything unrecognised means no override, which
   * is also how the pre-paint script in the layouts reads a missing value.
   * localStorage throws rather than returning null in some restricted
   * browsing contexts, so every access to it is guarded.
   */
  function storedTheme(): 'light' | 'dark' | null {
    try {
      const stored = localStorage.getItem('theme');
      return stored === 'light' || stored === 'dark' ? stored : null;
    } catch {
      return null;
    }
  }

  function systemTheme(): 'light' | 'dark' {
    return prefersDarkScheme.matches ? 'dark' : 'light';
  }

  /** The theme on screen: the override if there is one, the device if not. */
  function resolvedTheme(): 'light' | 'dark' {
    return storedTheme() ?? systemTheme();
  }

  const toggleButton = document.getElementById('theme-selector-button');

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
    const icon = toggleButton?.querySelector('wa-icon');
    if (!icon) return;

    const dark = theme === 'dark';
    icon.setAttribute('name', dark ? 'sun-bright' : 'moon');
    icon.setAttribute(
      'label',
      dark ? 'Switch to light mode' : 'Switch to dark mode'
    );
  }

  /**
   * Stores the opposite of what's on screen, unless that opposite is what the
   * device already asks for, in which case the override is cleared so the
   * device setting is followed again rather than pinned to a matching value.
   */
  function toggleTheme() {
    const next = resolvedTheme() === 'dark' ? 'light' : 'dark';
    try {
      if (next === systemTheme()) {
        localStorage.removeItem('theme');
      } else {
        localStorage.setItem('theme', next);
      }
    } catch {
      // Storage unavailable; the theme still applies for this page view.
    }
    applyTheme(next);
  }

  applyTheme(resolvedTheme());

  toggleButton?.addEventListener('click', toggleTheme);

  // A device that switches at sunset moves the page only when no override is
  // stored. It never clears one, so a deliberate choice survives.
  prefersDarkScheme.addEventListener('change', () => {
    if (!storedTheme()) applyTheme(systemTheme());
  });
});
