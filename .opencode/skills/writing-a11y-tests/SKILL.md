---
name: writing-a11y-tests
description: Conventions and patterns for writing Playwright accessibility tests in the Eventua11y project
---

## Test file

All accessibility tests live in `tests/accessibility.spec.ts`. Add new tests to this file unless there is a strong reason for a separate file.

## Imports

```typescript
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
```

## Helper: runAxeScan

A shared helper runs axe-core scoped to WCAG 2.2 Level AA. Always use it — never create a new AxeBuilder instance directly.

```typescript
async function runAxeScan(page: Page) {
  const results = await new AxeBuilder({ page })
    .exclude('iframe')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results;
}
```

- **Excludes iframes** to avoid false positives from the Netlify toolbar (issue #549).
- **Returns** `AxeResults` — assert with `expect(results.violations).toEqual([])`.

## Two-layer testing strategy

Every page needs both layers:

1. **Layer 1 — axe scan**: catches missing alt, duplicate IDs, color contrast, form labels, ARIA validity, lang, landmarks, heading skips.
2. **Layer 2 — Playwright assertions**: catches things axe misses — accessible names on Web Awesome components, landmark presence, heading hierarchy, `aria-current` state, `aria-live` regions, custom contrast in themed elements.

Do not write Playwright assertions for things axe already catches. Focus layer 2 on what axe cannot reach.

## Test structure

```typescript
test.describe('Page Name accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/route');
    // Wait for content to load if needed
    await page.waitForSelector('#some-content');
  });

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const results = await runAxeScan(page);
    expect(results.violations).toEqual([]);
  });

  test('descriptive test name', async ({ page }) => {
    // One assertion per test where practical
  });
});
```

- Group tests in `test.describe()` blocks per page or feature.
- Always include `beforeEach` with navigation.
- Use descriptive test names: `'filter button has accessible name'`, not `'a11y check'`.

## Dark mode scanning

Some pages are scanned in both light and dark themes. The pattern:

```typescript
for (const colorScheme of ['light', 'dark'] as const) {
  test(`has no WCAG 2.2 AA violations (${colorScheme} mode)`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    // Also inject localStorage if the theme is stored there
    await page.evaluate((scheme) => {
      localStorage.setItem(
        'eventua11y-user',
        JSON.stringify({ theme: scheme })
      );
    }, colorScheme);
    await page.reload();
    const results = await runAxeScan(page);
    expect(results.violations).toEqual([]);
  });
}
```

## Shadow DOM assertion patterns

Playwright's `toHaveAccessibleName()` cannot pierce Web Awesome shadow DOM. Use these patterns instead:

### wa-button with visible text

```typescript
const btn = page.locator('#my-button');
await expect(btn).toContainText('Button Label');
```

### wa-button with icon only

```typescript
const icon = page.locator('#my-button wa-icon');
await expect(icon).toHaveAttribute('label', /.+/);
```

### wa-drawer / wa-dialog

```typescript
const drawer = page.locator('#my-drawer');
await expect(drawer).toHaveAttribute('label', 'Drawer Name');
```

### wa-switch / wa-select / wa-radio-group

```typescript
const control = page.locator('wa-switch#my-switch');
await expect(control).toHaveAttribute('label', /.+/);
// Or check for an external label association
```

The axe scan validates the actual computed accessible name — these assertions verify the attributes are present.

## wa-drawer beforeEach pattern

The filter drawer may be open from a previous test. Close it in `beforeEach`:

```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#upcoming-events');
  const filterDrawer = page.locator('#filter-drawer');
  if ((await filterDrawer.getAttribute('open')) !== null) {
    await page.keyboard.press('Escape');
    await expect(filterDrawer).not.toHaveAttribute('open');
  }
});
```

The drawer uses `<dialog showModal()>` which renders in the top layer. The host element has `height: 0` so `isVisible()` is unreliable — check the `open` attribute instead.

## Custom contrast testing

The test suite includes manual WCAG contrast calculation helpers for elements where axe cannot check (e.g. theme selector icons). The helpers are:

- `parseColor(color: string)` — parses `rgb()`/`rgba()` strings.
- `luminance({ r, g, b })` — WCAG relative luminance.
- `contrastRatio(fg, bg)` — returns the contrast ratio.

Use these when you need to verify contrast for CSS custom property-driven colors that axe cannot evaluate.

## Running tests

```bash
npx playwright test tests/accessibility.spec.ts
```

Tests run against `http://localhost:8888` (Netlify dev server) by default, or against the `PLAYWRIGHT_TEST_BASE_URL` environment variable.
