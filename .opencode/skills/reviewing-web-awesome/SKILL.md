---
name: reviewing-web-awesome
description: Accessible usage patterns for Web Awesome 3 (wa-*) web components used in Eventua11y, including shadow DOM testing caveats
---

## Components in use

This project cherry-picks these Web Awesome 3 components in `src/layouts/default.astro`:

`wa-button`, `wa-badge`, `wa-callout`, `wa-card`, `wa-dialog`, `wa-divider`, `wa-drawer`, `wa-dropdown`, `wa-dropdown-item`, `wa-icon`, `wa-option`, `wa-radio`, `wa-radio-group`, `wa-select`, `wa-switch`, `wa-progress-bar`, `wa-input`.

## Accessible name patterns

### wa-button

- **With visible text**: slotted text content provides the accessible name. Example: `<wa-button>Filter</wa-button>`.
- **Icon-only**: add `label` or `aria-label` on the host, or put a `label` attribute on the child `wa-icon`. Example: `<wa-button><wa-icon name="gear" label="Settings"></wa-icon></wa-button>`.
- The accessible name comes from the shadow DOM `<button>` — Playwright's `toHaveAccessibleName()` cannot read it. Assert on host attributes or text content instead.

### wa-icon

- **Meaningful icons**: must have `label="Description"` — this sets `role="img"` and `aria-label` in shadow DOM.
- **Decorative icons**: use `label=""` or omit `label` — the icon gets `aria-hidden="true"`.

### wa-drawer

- Requires `label="..."` attribute on the host for the accessible name (used as `aria-label` on the internal `<dialog>`).
- Uses `<dialog showModal()>` internally — provides native focus trapping and inert background.
- Events: `wa-show`, `wa-after-show`, `wa-hide`, `wa-after-hide`.
- Close with Escape key is built-in.
- This project uses `<wa-drawer id="filter-drawer" label="Filters">`.

### wa-dialog

- Same pattern as `wa-drawer` — requires `label` attribute on the host.
- Uses `<dialog showModal()>` internally.

### wa-select

- Needs an associated label. Use `<label>` wrapping or `label` attribute on the host.
- Contains `<wa-option>` children. Each option's text content provides its accessible name.

### wa-radio-group

- Requires a label: use the `label` attribute on the host or wrap with `<fieldset>` + `<legend>`.
- Contains `<wa-radio>` children with `value` attributes.
- Navigated with arrow keys (built-in).

### wa-switch

- Needs an associated label via `label` attribute or external `<label>`.
- Toggled with Space key (built-in).
- Check that the label describes the state being toggled, not just the control name.

### wa-input

- Needs `label` attribute or an associated `<label>` element.
- Error states: use `help-text` slot or attribute for validation messages.

### wa-callout

- Has an implicit `role="alert"` or `role="status"` depending on variant.
- Check that dynamic callouts use appropriate `aria-live` if they appear after page load.

## Shadow DOM testing caveats

- **Playwright's `toHaveAccessibleName()`** cannot pierce shadow DOM. It returns the accessible name as computed from the light DOM only.
- **axe-core** can pierce shadow DOM and validates the actual computed accessible name. The project's `runAxeScan()` helper handles this.
- **Testing strategy**: use axe for accessible name validation; use Playwright assertions for host-element attributes (`label`, `aria-label`), text content, and attribute presence.
- **Example pattern** (from the existing test suite):

  ```typescript
  // wa-button with icon — check the icon's label attribute
  const icon = page.locator('#theme-selector-button wa-icon');
  await expect(icon).toHaveAttribute('label', /.+/);

  // wa-button with text — check text content
  const filterButton = page.locator('#open-filter-drawer');
  await expect(filterButton).toContainText('Filter');
  ```

## CSS custom property theming

Web Awesome components are styled via design tokens (CSS custom properties). The project overrides these in `src/styles/styles.css`. When reviewing contrast:

- Check both the project's custom property overrides and Web Awesome's defaults.
- Theme switching changes the `<html>` class and uses `prefers-color-scheme` media queries.
- Focus ring tokens: `--wa-focus-ring-color`, `--wa-focus-ring-width`, `--wa-focus-ring-offset`. The project may override these with its own `--c-focus-ring-*` properties.
