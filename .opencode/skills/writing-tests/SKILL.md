---
name: writing-tests
description: Conventions and patterns for writing Playwright E2E tests and Vitest unit tests in the Eventua11y project. Covers file structure, naming, assertions, CI integration, and deploy preview URL handling. Does not cover accessibility-specific testing — see writing-a11y-tests for that.
---

## Test frameworks

- **Playwright** (`@playwright/test`) for E2E browser tests. Chromium only (via `playwright-chromium`).
- **Vitest** (`vitest` with `@vitest/coverage-v8`) for unit tests.

## File structure

### Playwright E2E tests

All E2E tests live in `tests/`:

```
tests/
  accessibility.spec.ts    # Accessibility tests (owned by a11y-testing agent)
  event-list.spec.ts       # Event list functionality
  event-page.spec.ts       # Event detail pages
  events.spec.ts           # Event display and behaviour
  filters.spec.ts          # Filter functionality
  theme.spec.ts            # Theme switching
  timezone.spec.ts         # Timezone handling
```

### Vitest unit tests

Unit tests are co-located with source files using the `.test.ts` suffix:

```
src/utils/dateUtils.test.ts
src/utils/eventUtils.test.ts
src/utils/progressUtils.test.ts
```

## Playwright conventions

### Test structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/route');
    // Wait for content to load
    await page.waitForSelector('#some-content');
  });

  test('descriptive test name', async ({ page }) => {
    // One assertion per test where practical
  });
});
```

- Group tests in `test.describe()` blocks per page or feature.
- Always include `beforeEach` with navigation and content readiness checks.
- Use descriptive test names: `'event list shows upcoming events'`, not `'test 1'`.

### Base URL

Tests run against `http://localhost:8888` (Netlify dev server) by default. In CI, the `PLAYWRIGHT_TEST_BASE_URL` environment variable points to a Netlify deploy preview URL.

Do not hardcode `localhost:8888` in test code — use relative paths with `page.goto('/route')` and let Playwright's `baseURL` config handle it.

### Waiting for content

The site is SSR with client-side hydration. After navigation:

1. The HTML is server-rendered (immediately available).
2. Vue components hydrate via `client:load` (may take a moment).

Use `page.waitForSelector()` for content that depends on client-side hydration (event list, filters). Static server-rendered content is available immediately after `page.goto()`.

### Web Awesome components

Web Awesome components use shadow DOM. Use these patterns:

- **Locate by host element**: `page.locator('wa-button#my-button')`
- **Check attributes on host**: `await expect(el).toHaveAttribute('label', 'value')`
- **Visibility**: `wa-drawer` has `height: 0` when closed — `isVisible()` is unreliable. Check the `open` attribute instead.

### Assertions

Prefer Playwright's built-in assertions (`expect(locator).toBeVisible()`, `.toHaveText()`, `.toHaveAttribute()`) over raw `page.evaluate()`. Built-in assertions auto-retry and produce clearer error messages.

## Vitest conventions

### Test structure

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myModule';

describe('myFunction', () => {
  it('describes expected behaviour', () => {
    expect(myFunction(input)).toBe(expected);
  });
});
```

- Use `describe` + `it` (not `test`) for unit tests to distinguish from Playwright's `test`.
- Co-locate test files with source: `src/utils/dateUtils.ts` → `src/utils/dateUtils.test.ts`.
- Test pure functions directly. Avoid mocking unless necessary.

### Running

```bash
# Run all unit tests
npx vitest run

# Run with coverage
npx vitest run --coverage

# Run in watch mode (local development)
npx vitest
```

## CI integration

Tests run in GitHub Actions via `.github/workflows/tests.yml`:

1. A Netlify deploy preview is created for the PR.
2. Unit tests (`npm test`) run first.
3. E2E tests (`npx playwright test`) run against the deploy preview URL.

The workflow passes the deploy preview URL as `PLAYWRIGHT_TEST_BASE_URL`. Tests must not depend on local-only state or environment variables that aren't available in CI.

## What NOT to test

- Do not duplicate what axe-core already catches (accessibility violations). That is `a11y-testing`'s domain.
- Do not test third-party library internals (Web Awesome component rendering, Sanity client behaviour).
- Do not test implementation details — test observable behaviour from the user's perspective.
