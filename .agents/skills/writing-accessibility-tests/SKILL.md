---
name: writing-accessibility-tests
description: Use this skill to write Playwright accessibility tests using the two-layer strategy (axe-core scans + targeted assertions). Triggers when adding accessibility test coverage, reviewing test gaps, writing axe scans, or creating Playwright assertions for accessible names, landmarks, ARIA states, focus management, or contrast.
compatibility: Requires Playwright and @axe-core/playwright as dev dependencies. Requires file write access to test directories and shell access to run tests.
---

# Writing Accessibility Tests

Write Playwright tests that verify WCAG accessibility compliance using a two-layer strategy: automated axe-core scans for broad coverage, plus targeted Playwright assertions for things axe cannot catch.

## Two-layer strategy

Every page or feature needs both layers:

### Layer 1 - axe-core scans

Automated scans catch structural violations at scale: missing alt text, duplicate IDs, basic colour contrast, missing form labels, invalid ARIA attributes, missing lang attribute, landmark violations, heading level skips.

### Layer 2 - Playwright assertions

Targeted assertions catch what axe misses: accessible names on custom components, landmark presence, heading hierarchy, `aria-current` state, `aria-live` region configuration, `aria-invalid` state management, `aria-describedby` associations, focus management after interactions, custom property contrast, and shadow DOM internals.

Do not duplicate what axe already catches. Layer 2 exists for the gaps.

## Setting up axe-core

Install `@axe-core/playwright` as a dev dependency:

```bash
npm install -D @axe-core/playwright
```

Create a reusable scan function scoped to WCAG 2.2 Level AA:

```typescript
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

async function runAxeScan(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results;
}
```

Assert with:

```typescript
expect(results.violations).toEqual([]);
```

Using `toEqual([])` instead of `toHaveLength(0)` produces better failure messages — the full violation details appear in the test output.

### axe-core configuration options

**Excluding elements**: If third-party iframes or embedded widgets produce false positives, exclude them:

```typescript
new AxeBuilder({ page }).exclude('iframe').withTags([...]).analyze();
```

**Custom rules**: Disable specific rules only when there is a documented justification, not to suppress inconvenient findings:

```typescript
new AxeBuilder({ page }).disableRules(['specific-rule-id']).analyze();
```

### Formatting violations for readable output

When axe finds violations, raw output is hard to read. Use the formatter in `scripts/format-violations.ts` to produce structured failure messages:

```typescript
import { formatViolations } from './scripts/format-violations';

expect(
  results.violations,
  `Accessibility violations found:\n\n${formatViolations(results.violations)}`
).toEqual([]);
```

Adapt the import path to the project's test helper location. The script is a reference implementation — copy it into the project's test utilities.

## Playwright fixtures for axe

For projects with many axe scans, a Playwright fixture reduces boilerplate:

```typescript
import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type A11yFixtures = {
  makeAxeBuilder: () => AxeBuilder;
  expectNoAxeViolations: () => Promise<void>;
};

export const test = base.extend<A11yFixtures>({
  makeAxeBuilder: async ({ page }, use) => {
    await use(() =>
      new AxeBuilder({ page }).withTags([
        'wcag2a',
        'wcag2aa',
        'wcag21a',
        'wcag21aa',
        'wcag22aa',
      ])
    );
  },
  expectNoAxeViolations: async ({ page }, use) => {
    await use(async () => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  },
});

export { expect };
```

Tests then use:

```typescript
import { test } from './fixtures/base';

test('page has no accessibility violations', async ({
  expectNoAxeViolations,
}) => {
  await expectNoAxeViolations();
});
```

## Test structure

```typescript
test.describe('Page Name accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/route');
    // Wait for meaningful content, not networkidle
    await page.getByRole('heading', { name: 'Page Title' }).waitFor();
  });

  // Layer 1: axe scan
  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const results = await runAxeScan(page);
    expect(results.violations).toEqual([]);
  });

  // Layer 2: targeted assertions
  test('form fields have correct accessible names', async ({ page }) => {
    await expect(
      page.getByRole('textbox', { name: 'Email' })
    ).toHaveAccessibleName('Email');
  });
});
```

Conventions:

- Group tests in `test.describe()` blocks per page or feature
- Include `beforeEach` with navigation and a content wait
- Use descriptive test names: `'filter controls have accessible names'`, not `'a11y check'`
- One logical assertion per test where practical

### Wait strategies

Wait for a visible, meaningful element rather than `networkidle`:

```typescript
// Good: waits for actual content
await page.getByRole('heading', { name: 'Dashboard' }).waitFor();

// Avoid: flaky, doesn't guarantee content is rendered
await page.waitForLoadState('networkidle');
```

For pages with dynamic data, wait for a specific data-dependent element:

```typescript
await page.waitForSelector('#event-list');
```

## Layer 2 assertion patterns

### Accessible names

```typescript
await expect(page.getByRole('textbox', { name: 'Email' })).toHaveAccessibleName(
  'Email'
);

await expect(
  page.getByRole('button', { name: 'Save profile' })
).toHaveAccessibleName('Save profile');
```

### Accessible descriptions (error messages, help text)

```typescript
await expect(
  page.getByRole('textbox', { name: 'Email' })
).toHaveAccessibleDescription('Please enter a valid email address');
```

### ARIA states

```typescript
// Invalid field
await expect(emailInput).toHaveAttribute('aria-invalid', 'true');

// Expanded disclosure
await expect(trigger).toHaveAttribute('aria-expanded', 'true');

// Current navigation item
await expect(navLink).toHaveAttribute('aria-current', 'page');
```

### Landmarks

```typescript
await expect(page.getByRole('main')).toBeVisible();
await expect(page.getByRole('banner')).toBeVisible();
await expect(page.getByRole('contentinfo')).toBeVisible();
await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
```

### Heading hierarchy

```typescript
const h1 = page.getByRole('heading', { level: 1 });
await expect(h1).toBeVisible();
await expect(h1).toHaveAccessibleName('Page Title');

const h1Count = await page.getByRole('heading', { level: 1 }).count();
expect(h1Count).toBe(1);
```

### Live regions

```typescript
await expect(page.locator('.filter-count')).toHaveAttribute(
  'aria-live',
  'polite'
);
await expect(page.locator('.filter-count')).toHaveAttribute(
  'aria-atomic',
  'true'
);
```

### Dialog accessibility

```typescript
const dialog = page.getByRole('dialog');
await expect(dialog).toBeVisible();
await expect(
  dialog.getByRole('heading', { name: 'Confirm deletion' })
).toBeVisible();
await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();

// For destructive confirmations
const alertDialog = page.getByRole('alertdialog');
await expect(alertDialog).toBeVisible();
```

### Form validation flow

```typescript
// Submit empty form
await page.getByRole('button', { name: 'Submit' }).click();

// Field enters error state
const emailInput = page.getByRole('textbox', { name: 'Email' });
await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
await expect(emailInput).toHaveAccessibleDescription('Email is required');

// Error announced via alert
await expect(page.locator('#email-error[role="alert"]')).toContainText(
  'Email is required'
);
```

### Navigation state

```typescript
const currentLink = page.locator('nav a[href="/current-page"]');
await expect(currentLink).toHaveAttribute('aria-current', 'page');
```

## Dark mode scanning

Scan pages in both light and dark themes to catch contrast regressions:

```typescript
for (const colorScheme of ['light', 'dark'] as const) {
  test(`has no WCAG violations in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/route');
    const results = await runAxeScan(page);
    expect(results.violations).toEqual([]);
  });
}
```

If the theme is stored in localStorage, also set it there:

```typescript
await page.evaluate((scheme) => {
  localStorage.setItem('theme-preference', scheme);
}, colorScheme);
await page.reload();
```

### Contrast checking for CSS custom properties

axe cannot evaluate contrast for elements styled with CSS custom property chains. For these, compute contrast manually in the test. Read `scripts/contrast-helpers.ts` for the helper functions (`parseColor`, `luminance`, `contrastRatio`). Copy them into the project's test utilities, then use:

```typescript
const fgColor = await element.evaluate((el) => getComputedStyle(el).color);
const bgColor = await container.evaluate(
  (el) => getComputedStyle(el).backgroundColor
);
const ratio = contrastRatio(fgColor, bgColor);
expect(
  ratio,
  `Contrast ratio is ${ratio.toFixed(2)}:1, expected at least 4.5:1`
).toBeGreaterThanOrEqual(4.5);
```

## Shadow DOM patterns

Playwright's `toHaveAccessibleName()` cannot pierce shadow DOM. For web components with shadow encapsulation, assert on the host element's attributes instead:

```typescript
// Button with visible slotted text
await expect(page.locator('#my-button')).toContainText('Button Label');

// Icon-only button — check the icon's label attribute
await expect(page.locator('#my-button icon-element')).toHaveAttribute(
  'label',
  /.+/
);

// Dialog/drawer — check the label attribute on the host
await expect(page.locator('#my-dialog')).toHaveAttribute(
  'label',
  'Dialog Name'
);

// Switch/select — check label attribute
await expect(page.locator('#my-switch')).toHaveAttribute('label', /.+/);
```

The axe scan validates the computed accessible name — these assertions verify the attributes that produce it are present and non-empty.

## Route sweep pattern

For apps with many routes, scan all of them systematically:

```typescript
interface RouteConfig {
  name: string;
  path: string;
  waitFor: string;
}

const routes: RouteConfig[] = [
  { name: 'dashboard', path: '/dashboard', waitFor: 'Dashboard' },
  { name: 'settings', path: '/settings', waitFor: 'Settings' },
  { name: 'profile', path: '/profile', waitFor: 'Profile' },
];

for (const route of routes) {
  test(`${route.name} has no accessibility violations`, async ({ page }) => {
    await page.goto(route.path);
    await page.getByRole('heading', { name: route.waitFor }).waitFor();
    const results = await runAxeScan(page);
    expect(results.violations).toEqual([]);
  });
}
```

This pairs well with theme scanning — nest the route loop inside the colour scheme loop for full coverage.

## Validate after writing

After writing or modifying test files, run them and verify the results before reporting:

1. Run the test file: `npx playwright test <file>`
2. If tests fail, distinguish between **test authoring errors** (the test code is wrong) and **genuine accessibility failures** (the application is wrong)
3. Fix test authoring errors and re-run until the test code itself is correct
4. Report genuine accessibility failures separately — these are the actionable findings

Do not report results from tests that have not been executed. A test that looks correct but has a typo in a selector or an incorrect accessible name string produces false confidence.

## Gotchas

- **Wait for content, not for network.** Using `networkidle` is flaky and does not guarantee the DOM is ready for axe to scan. Wait for a specific visible element instead.
- **axe scans the current DOM state.** If a modal, drawer, or dropdown is closed, axe does not scan its contents. Open interactive overlays before scanning if their content needs coverage.
- **`toEqual([])` over `toHaveLength(0)` for violations.** `toEqual` prints the full violation array on failure; `toHaveLength` only says "expected 0, got 3" with no details.
- **`aria-errormessage` has inconsistent AT support.** Use `aria-describedby` for error association and assert with `toHaveAccessibleDescription`. This has broader assistive technology support.
- **Password fields do not have `role="textbox"`.** Use `page.locator('input[type="password"]')` instead of `page.getByRole('textbox')` to target password inputs.
- **Shadow DOM elements need attribute assertions.** `toHaveAccessibleName()` reads the accessibility tree, which cannot always pierce shadow boundaries. For web components, check the host element's `label`, `aria-label`, or slotted text content directly.
- **Dialogs using `<dialog>` with `showModal()` render in the top layer.** The host element may have `height: 0`, making `isVisible()` unreliable. Check the `open` attribute instead.
- **Contrast helpers only work with `rgb()`/`rgba()` strings.** `getComputedStyle` returns computed values, which are always `rgb()`/`rgba()` in modern browsers, but verify the parsing works in the project's browser targets.
- **Do not test what axe already catches.** Writing a Playwright assertion for "button has accessible name" when axe would already flag a nameless button adds maintenance cost with no coverage gain. Layer 2 assertions are for things axe structurally cannot detect.
- **Scope locators to landmarks when content repeats.** Pages with repeated patterns (e.g., a "View on GitHub" link in both header and footer) cause ambiguous locator matches. Scope to the landmark: `page.getByRole('banner').getByRole('link', { name: 'GitHub' })` instead of `page.getByRole('link', { name: 'GitHub' })`.

## Authoritative references

- [Playwright accessibility testing guide](https://playwright.dev/docs/accessibility-testing)
- [axe-core rule descriptions](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WCAG relative luminance definition](https://www.w3.org/TR/WCAG21/#dfn-relative-luminance)
