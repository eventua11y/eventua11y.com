# Review Checklist

A prioritised checklist for post-implementation accessibility reviews. Each item references the WCAG 2.2 success criterion it relates to. Items are grouped by concern area and ordered within each group by typical severity.

Use this as a systematic walkthrough. Skip items that do not apply to the change being reviewed.

## Semantic HTML (1.3.1, 2.4.6)

- [ ] Correct native elements used (`button` not `div[role="button"]`, `nav` not `div.nav`)
- [ ] Single `h1` per page
- [ ] Heading levels follow a logical hierarchy (no skipped levels)
- [ ] Unique, descriptive `<title>` per route (2.4.2)
- [ ] Related items use `ul`/`ol`/`dl`, not styled divs
- [ ] Data tables have `th` elements and `caption` or `aria-label`
- [ ] Landmarks present: `main`, `nav`, `banner`, `contentinfo` as appropriate
- [ ] `lang` attribute on `<html>` (3.1.1); `lang` overrides on foreign-language content

## Keyboard (2.1.1, 2.1.2, 2.4.1, 2.4.3)

- [ ] Every interactive element operable with keyboard alone
- [ ] No keyboard traps (can navigate away from every element)
- [ ] Tab order follows logical reading sequence
- [ ] Skip link present and targets `main` content
- [ ] Custom keyboard handlers do not suppress default browser behaviour unintentionally
- [ ] Escape key closes modals, drawers, and overlays

## Focus (2.4.7, 2.4.11, 3.2.1)

- [ ] Visible focus indicator on every interactive element
- [ ] Focus indicator has sufficient contrast and area (2.4.11 Focus Appearance)
- [ ] Focus trapped in modals/dialogs while open
- [ ] Focus returned to trigger element when modal/dialog closes
- [ ] Focus managed after dynamic content changes (item creation, deletion, filtering)
- [ ] Focus managed on route/page changes (moved to main content or heading)
- [ ] Elements receiving programmatic `.focus()` have `tabindex="-1"` if not natively focusable

## Labels and Names (1.1.1, 1.3.1, 3.3.2, 4.1.2)

- [ ] Every form input has a visible, programmatically associated `<label>`
- [ ] Labels are persistent (not placeholder-only)
- [ ] Every interactive element has a meaningful accessible name
- [ ] Accessible names are actual text, not template variables, code syntax, or empty strings
- [ ] Images have descriptive `alt` text; decorative images have `alt=""` or `role="presentation"`
- [ ] Icon-only buttons have accessible names (`aria-label` or visually hidden text)
- [ ] Links have descriptive text (not "click here" or "read more" without context) (2.4.4)

## ARIA (4.1.2)

- [ ] ARIA used only when native HTML cannot express the semantics
- [ ] All ARIA roles, states, and properties are valid and complete
- [ ] `aria-live` regions used for dynamic content announcements (filtering results, status messages)
- [ ] `aria-current="page"` used on active navigation items
- [ ] `aria-expanded` reflects current state on disclosure triggers
- [ ] `aria-invalid="true"` set on fields in error state, cleared when corrected
- [ ] Loading states announced to screen readers (`aria-busy` or live region)

## Forms (1.3.5, 3.3.1, 3.3.2, 3.3.3)

- [ ] Required fields indicated visually and programmatically (`required` or `aria-required`)
- [ ] Error messages associated with fields via `aria-describedby`
- [ ] Error announcements use `role="alert"` or `aria-live="assertive"`
- [ ] Success feedback uses `role="status"` or `aria-live="polite"`
- [ ] Appropriate `autocomplete` values on personal data fields (`email`, `current-password`, `new-password`, etc.)
- [ ] Appropriate `type` attributes on inputs (`email`, `password`, `url`, `tel`)
- [ ] Password requirements communicated before submission (via hint with `aria-describedby`)
- [ ] Focus moved to error summary or first invalid field after failed submission
- [ ] Focus moved to success message or next logical element after successful submission

## Visual (1.4.1, 1.4.3, 1.4.11, 2.3.1, 2.5.8)

- [ ] Text contrast at least 4.5:1 (normal text) / 3:1 (large text) in all themes
- [ ] Non-text contrast (UI components, graphical objects) at least 3:1 in all themes
- [ ] CSS custom property contrast chains verified in both light and dark modes
- [ ] No information conveyed by colour alone (status indicators, active states, errors)
- [ ] Animations and transitions respect `prefers-reduced-motion`
- [ ] No content flashes more than 3 times per second
- [ ] Interactive target sizes at least 24x24 CSS pixels

## Dialogs and Overlays

- [ ] `dialog` element used (or equivalent with `role="dialog"` / `role="alertdialog"`)
- [ ] Accessible name present (`aria-labelledby` or `aria-label`)
- [ ] Focus trapped while open
- [ ] Background content is inert
- [ ] Escape key closes the overlay
- [ ] Focus returns to trigger on close
