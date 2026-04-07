---
name: fixing-accessibility-issues
description: >
  Use this skill to fix accessibility issues in implemented UI code. Triggers
  when remediating WCAG violations, fixing audit findings, resolving axe-core
  errors, implementing accessible patterns for the first time, or when a coding
  agent needs guidance choosing between ARIA approaches, focus management
  strategies, or accessible markup patterns. For reviewing code without fixing
  it, use `reviewing-accessibility` instead.
---

Fix accessibility issues in implemented UI code. This skill takes findings from `reviewing-accessibility`, axe-core scans, or manual audits and produces code changes. It does not find new issues, estimate effort, prioritise, or write tests — use `reviewing-accessibility`, `estimating-accessibility-effort`, `prioritising-accessibility-fixes`, and `writing-accessibility-tests` for those.

## Accept findings

Each finding should include at minimum:

- What the issue is
- The WCAG success criterion (if known)
- The affected file and location (if known)

Findings may come from `reviewing-accessibility` output, axe-core violation reports, browser DevTools accessibility audits, or manual testing notes. If a finding lacks a file location, search the codebase to locate the affected code before proceeding.

## Read before fixing

Before changing anything, gather context:

1. **Read the affected code.** Open the file(s) and understand the current markup, component structure, and how the element is used.
2. **Identify the framework and component library.** The correct fix differs significantly between plain HTML, React, Vue, Svelte, Angular, and between apps using a design system vs. raw elements. Look at `package.json`, imports, and surrounding code.
3. **Check for existing accessible patterns.** Search the codebase for similar components that already handle accessibility correctly. Reuse established patterns rather than inventing new ones.
4. **Check the component library's API.** If the element comes from a component library (MUI, Radix, Headless UI, Ark UI, shadcn/ui, etc.), read the library's accessibility documentation first. The fix may be a prop or configuration change, not custom ARIA.

## Fix procedure

For each finding:

1. **Choose the fix pattern** using the defaults in the next section.
2. **Check for knock-on effects** — will this fix break something else? Common interactions:
   - Changing heading levels affects the page-wide hierarchy, not just the component.
   - Adding `role="dialog"` requires focus trapping, focus return, Escape handling, and `aria-modal`.
   - Adding `aria-live` to an element that updates frequently can overwhelm screen reader users.
   - Changing an element from `<div>` to `<button>` may change styling, event handling, and form submission behaviour.
3. **Implement the fix.** Make the smallest change that fully resolves the issue. Prefer semantic HTML over ARIA. Prefer visible content over invisible attributes.
4. **Validate** — see the validation section below.

## Pattern selection defaults

When multiple valid approaches exist, use these defaults. Alternatives are noted where they have a clear advantage.

### Accessible names

**Default: visible text content.** A `<button>` should contain text that names it.

Fall back to these in order, only when visible text is not viable:

1. `aria-labelledby` pointing to an existing visible text element — keeps the name in sync with what sighted users see.
2. Visually hidden text (e.g., a `sr-only` / `visually-hidden` CSS class) inside the element — translatable, discoverable in DOM.
3. `aria-label` — last resort. Invisible, easy to forget during updates, not translatable by default in many i18n setups.

For `<img>`, always use the `alt` attribute. For decorative images, use `alt=""`. For `<svg>`, use `<title>` with `aria-labelledby`, or `role="img"` with `aria-label` if no visible title is appropriate.

### Focus management

**Default: let the browser handle focus.** Only manage focus programmatically when the default behaviour is wrong.

Situations that require programmatic focus:

- **Modals/dialogs.** Move focus to the first focusable element (or the dialog itself if it has a label) on open. Trap focus inside. Return focus to the trigger on close.
- **Route changes in SPAs.** Move focus to the main content heading or a skip-link target after navigation.
- **Inline content changes.** When an action reveals new content (expanding an accordion, showing search results), move focus to the new content or announce it with a live region — not both.
- **Destructive actions.** After deleting an item from a list, move focus to the next item, the previous item, or the list container — not to the top of the page.

Use `tabindex="-1"` on non-interactive elements that need to receive programmatic focus. Remove it from elements that should not be in the tab order.

### ARIA states and properties

**Default: use semantic HTML that conveys state natively.** A `<details>` element conveys expanded/collapsed without ARIA. A `<button disabled>` conveys disabled state. A checked `<input type="checkbox">` conveys checked state.

When ARIA is needed:

- **`aria-expanded`** on the trigger element, not the content panel.
- **`aria-current="page"`** on navigation links pointing to the current page.
- **`aria-invalid="true"`** on form fields with validation errors, paired with `aria-describedby` pointing to the error message. Prefer `aria-describedby` over `aria-errormessage` — the latter has inconsistent assistive technology support.
- **`aria-live="polite"`** for status updates. Use `"assertive"` only for urgent errors. Never put `aria-live` on an element that updates more than once every few seconds.
- **`aria-modal="true"`** on dialog elements, paired with `role="dialog"`. The native `<dialog>` element with `showModal()` handles this automatically.

### Form errors

**Default: associate error messages with inputs using `aria-describedby`.**

1. Each input with an error should have `aria-invalid="true"`.
2. The error message element's `id` should be referenced by `aria-describedby` on the input.
3. Error messages should be visible, not only announced to screen readers.
4. On form submission failure, move focus to the first field with an error, or to an error summary at the top of the form that links to each invalid field.

### Colour contrast

Colour contrast fixes require changing either the foreground or background colour.

- Check the computed values in every theme (light, dark, high contrast) — fixing one theme can regress another.
- For text: minimum 4.5:1 for normal text, 3:1 for large text (18pt/24px regular, or 14pt/18.5px bold).
- For non-text elements (icons, borders, focus indicators): minimum 3:1 against adjacent colours.
- Do not rely on colour alone to convey information. Add text, icons, or patterns.

### Heading hierarchy

**Default: fix the heading to match the page-level hierarchy, not the component's internal view of itself.**

A component that renders an `<h2>` may need to become an `<h3>` when placed inside a section that already has an `<h2>`. If the component is used in multiple contexts, accept the heading level as a prop or use `aria-level` on a `<div role="heading">`.

Do not skip heading levels. Do not remove headings to "fix" hierarchy — add the missing intermediate levels instead, or adjust the existing ones.

### Keyboard interaction

**Default: use native interactive elements.** A `<button>` is keyboard accessible. A `<div onClick>` is not.

When replacing a non-interactive element with an interactive one:

- Prefer `<button>` for actions, `<a href>` for navigation.
- If `<div>` or `<span>` must remain (rare — usually because of styling constraints in a third-party system), add `role="button"`, `tabindex="0"`, and key handlers for Enter and Space.

For custom widgets (tabs, comboboxes, tree views, menus), follow the keyboard patterns in the [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/). Do not invent custom key bindings.

### Live regions

**Default: add an `aria-live` region to the DOM on page load, then update its content when the status changes.** An `aria-live` region added dynamically may not be tracked by all assistive technologies.

- Use `aria-live="polite"` for non-urgent updates (search result counts, save confirmations, filter feedback).
- Use `aria-live="assertive"` only for errors requiring immediate attention.
- Use `role="status"` (implicitly `aria-live="polite"`) for status messages.
- Use `role="alert"` (implicitly `aria-live="assertive"`) for error alerts.
- Clear the live region before updating it if the assistive technology needs to re-announce the same text.

## When not to fix

Some findings should be left alone:

- **Component library internals.** If a finding targets markup generated by a component library, the fix belongs in the library, not in the consuming code. Check whether there is a prop, slot, or configuration option that addresses the issue. If not, file an issue upstream.
- **False positives from automated scans.** axe-core and similar tools can flag elements that are correctly accessible. Verify by checking the rendered accessible name, role, and state in the browser's accessibility tree before changing anything.
- **Decorative elements.** Decorative images should have `alt=""`. Flagging these as "missing alt text" is a false positive.
- **Context-dependent findings.** A heading level skip may be correct when a component is designed to be composed into a page that provides the intermediate heading. Verify the heading hierarchy in the full page context, not in isolation.
- **Third-party embeds you do not control.** If an iframe or embedded widget has accessibility issues, the fix is to either configure the embed (if options exist) or add surrounding accessible context (a label, a skip link past it). Do not attempt to modify third-party DOM.

When leaving a finding unfixed, note the reason in the output so the decision is traceable.

## Validate

After making fixes:

1. **Run the project's existing test suite.** Accessibility fixes should not break functional tests. If they do, the fix changed behaviour — investigate before proceeding.
2. **Run axe-core** (if available) against the affected pages to confirm the original violations are resolved and no new ones are introduced.
3. **Check the browser accessibility tree** for the fixed elements. Confirm the accessible name, role, and state are correct.
4. **Review focus order** if focus management was changed. Tab through the affected area and confirm the order is logical.

Do not report a fix as complete until validation passes.

## Gotchas

- **`aria-label` is the last resort, not the first.** Agents default to `aria-label` because it is the simplest attribute to add. Prefer visible text, `aria-labelledby`, or visually hidden text — they are more robust, more translatable, and more likely to stay in sync with the visible UI.
- **Fixing one heading breaks the page hierarchy.** Heading levels are page-global. Changing an `<h3>` to an `<h2>` in one component may create a skip or duplicate at the page level. Always check the full page heading outline, not just the component in isolation.
- **Adding `role="dialog"` without focus trapping creates a worse problem.** A dialog role without focus management lets screen reader users navigate behind the dialog into content they cannot see. If the full modal pattern (trap, return, escape, inert background) is not feasible, do not add the role.
- **`aria-live` regions must exist in the DOM before content changes.** Adding an `aria-live` region and immediately populating it may not trigger an announcement. The region should be present (and empty) on page load.
- **Replacing a `<div>` with a `<button>` changes more than keyboard access.** It changes the element's default styling, its behaviour inside forms (it can submit), and its interaction with CSS frameworks. Check for visual regressions and unintended form submissions after the swap.
- **Component libraries handle accessibility internally.** Adding `role`, `aria-*`, or `tabindex` to a component library's wrapper element can conflict with the library's own accessibility implementation. Check the library's API for built-in accessibility props before adding manual ARIA.
- **Colour contrast must be checked in every theme.** A fix that passes in light mode may fail in dark mode or high-contrast mode. Verify the computed contrast ratio in all themes the project supports.
- **Screen readers may not announce `aria-errormessage`.** Support for `aria-errormessage` is inconsistent across assistive technologies. Use `aria-describedby` for error message association instead.
- **Do not add `tabindex="0"` to non-interactive elements.** Making headings, paragraphs, or containers focusable via keyboard confuses users who expect only interactive elements in the tab order. Use `tabindex="-1"` if the element only needs to receive programmatic focus.
- **Removing an accessibility feature to fix a different issue is a net loss.** If a fix conflicts with existing accessible behaviour, find an approach that preserves both. Never remove working ARIA, labels, or focus management without verifying the replacement is equally effective.

## Authoritative references

Ground all fixes in the official WCAG specification and the ARIA Authoring Practices Guide. When a fix involves ARIA, check the role, state, or property against the WAI-ARIA spec. When uncertain, consult the spec rather than relying on convention.

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Understanding WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/)
- [WCAG 2.2 Techniques](https://www.w3.org/WAI/WCAG22/Techniques/)
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WAI-ARIA 1.2 Specification](https://www.w3.org/TR/wai-aria-1.2/)
- [ARIA in HTML](https://www.w3.org/TR/html-aria/)
