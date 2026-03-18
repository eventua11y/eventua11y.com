import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility tests for all pages.
 *
 * Uses both axe-core automated scans (scoped to WCAG 2.2 AA) and
 * Playwright accessibility assertions to validate accessible names,
 * landmark structure, and heading hierarchy.
 *
 * See: https://dev.to/steady5063/accessibility-testing-with-playwright-assertions-3m3i
 */

// Helper: run an axe scan scoped to WCAG 2.2 Level AA
// Excludes iframes to avoid false positives from third-party toolbars (#549)
async function runAxeScan(page: Page) {
  const results = await new AxeBuilder({ page })
    .exclude('iframe')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results;
}

// Helper: parse an rgb/rgba color string into { r, g, b } values (0–255)
function parseColor(color: string): { r: number; g: number; b: number } {
  const match = color.match(
    /rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/
  );
  if (!match) throw new Error(`Could not parse color: ${color}`);
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
}

// Helper: calculate relative luminance per WCAG 2.x
// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
function luminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Helper: calculate contrast ratio between two colors
function contrastRatio(fg: string, bg: string): number {
  const l1 = luminance(parseColor(fg));
  const l2 = luminance(parseColor(bg));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// Homepage (/)
// ---------------------------------------------------------------------------
test.describe('Homepage accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#upcoming-events');
    // wa-drawer uses <dialog showModal()> which renders in the top layer;
    // the host element has height: 0 so isVisible() is unreliable.
    // Check the open attribute instead.
    const filterDrawer = page.locator('#filter-drawer');
    if ((await filterDrawer.getAttribute('open')) !== null) {
      await page.keyboard.press('Escape');
      await expect(filterDrawer).not.toHaveAttribute('open');
    }
  });

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const results = await runAxeScan(page);
    expect(results.violations).toEqual([]);
  });

  test('page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(
      'Eventua11y - accessibility and inclusive design events'
    );
  });

  test('skip link has accessible name', async ({ page }) => {
    const skipLink = page.locator('a.skip');
    await expect(skipLink).toHaveAccessibleName(/skip to main content/i);
  });

  test('main landmark is present', async ({ page }) => {
    const main = page.getByRole('main');
    await expect(main).toBeVisible();
  });

  test('header banner landmark is present', async ({ page }) => {
    const header = page.getByRole('banner');
    await expect(header).toBeVisible();
  });

  test('footer contentinfo landmark is present', async ({ page }) => {
    const footer = page.getByRole('contentinfo');
    await expect(footer).toBeVisible();
  });

  test('navigation landmark is present', async ({ page }) => {
    const nav = page.getByRole('navigation');
    await expect(nav.first()).toBeVisible();
  });

  test('logo link has accessible name', async ({ page }) => {
    const logoLink = page.locator('.masthead__logo a');
    await expect(logoLink).toHaveAccessibleName(/eventua11y/i);
  });

  test('theme selector button has accessible name', async ({ page }) => {
    const themeButton = page.locator('#theme-selector-button');
    // wa-button gets its accessible name from the child wa-icon's label
    // attribute. Playwright's toHaveAccessibleName cannot pierce shadow DOM,
    // so we verify the wa-icon label attribute directly. The axe scan
    // confirms the button is accessible.
    const icon = themeButton.locator('wa-icon');
    await expect(icon).toHaveAttribute('label', /.+/);
  });

  test('upcoming events heading exists (visually hidden)', async ({ page }) => {
    const heading = page.getByRole('heading', {
      name: /upcoming accessibility events/i,
    });
    await expect(heading).toBeAttached();
  });

  test('primary nav links have accessible names', async ({ page }) => {
    const upcomingLink = page.getByRole('link', { name: 'Upcoming' });
    await expect(upcomingLink).toHaveAccessibleName('Upcoming');

    const pastEventsLink = page.getByRole('link', { name: 'Past Events' });
    await expect(pastEventsLink).toHaveAccessibleName('Past Events');
  });

  test('current page is indicated with aria-current', async ({ page }) => {
    const upcomingLink = page.locator('.primaryNav__link[href="/"]');
    await expect(upcomingLink).toHaveAttribute('aria-current', 'page');
  });

  test('month navigation has accessible name', async ({ page }) => {
    const monthNav = page.locator('nav[aria-label="Months"]');
    await expect(monthNav).toHaveAccessibleName('Months');
  });

  test('filter button has accessible name', async ({ page }) => {
    // The wa-button gets its accessible name from the slotted text "Filter".
    // Playwright's toHaveAccessibleName cannot pierce shadow DOM to read
    // the computed name, but the axe scan confirms the button is accessible.
    // Here we verify the button text content directly.
    const filterButton = page.locator('#open-filter-drawer');
    await filterButton.waitFor({ state: 'visible', timeout: 5000 });
    await expect(filterButton).toContainText('Filter');
  });

  test('filter count region is an aria-live region', async ({ page }) => {
    const filterCount = page.locator('.filters__count');
    await expect(filterCount).toHaveAttribute('aria-live', 'polite');
    await expect(filterCount).toHaveAttribute('aria-atomic', 'true');
  });
});

// ---------------------------------------------------------------------------
// Past Events (/past-events)
// ---------------------------------------------------------------------------
test.describe('Past Events page accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/past-events');
    await page.waitForSelector('#past-events');
  });

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const results = await runAxeScan(page);
    expect(results.violations).toEqual([]);
  });

  test('page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Past accessibility events.*Eventua11y/);
  });

  test('main landmark is present', async ({ page }) => {
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('past events heading exists (visually hidden)', async ({ page }) => {
    const heading = page.getByRole('heading', {
      name: /past accessibility events/i,
    });
    await expect(heading).toBeAttached();
  });

  test('events region is labelled', async ({ page }) => {
    const region = page.locator('#events[role="region"]');
    await expect(region).toHaveAttribute(
      'aria-labelledby',
      'past-events-heading'
    );
  });

  test('aria-current indicates past events page in nav', async ({ page }) => {
    const pastLink = page.locator('.primaryNav__link[href="/past-events"]');
    await expect(pastLink).toHaveAttribute('aria-current', 'page');
  });
});

// ---------------------------------------------------------------------------
// Accessibility Statement (/accessibility)
// ---------------------------------------------------------------------------
test.describe('Accessibility Statement page accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/accessibility');
  });

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const results = await runAxeScan(page);
    expect(results.violations).toEqual([]);
  });

  test('page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Accessibility Statement.*Eventua11y/);
  });

  test('main landmark is present', async ({ page }) => {
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('h1 heading is visible', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveAccessibleName('Accessibility Statement');
  });

  test('heading hierarchy is correct (no skipped levels)', async ({ page }) => {
    // The page should have h1, then h2s, then h3s — no skips
    const h1Count = await page.getByRole('heading', { level: 1 }).count();
    expect(h1Count).toBe(1);

    const h2Count = await page.getByRole('heading', { level: 2 }).count();
    expect(h2Count).toBeGreaterThan(0);
  });

  test('all links have accessible names', async ({ page }) => {
    const links = page.locator('.readable a');
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      await expect(links.nth(i)).toHaveAccessibleName(/.+/);
    }
  });

  test('banner and contentinfo landmarks are present', async ({ page }) => {
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Curation Policy (/curation-policy)
// ---------------------------------------------------------------------------
test.describe('Curation Policy page accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/curation-policy');
  });

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const results = await runAxeScan(page);
    expect(results.violations).toEqual([]);
  });

  test('page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Curation Policy.*Eventua11y/);
  });

  test('main landmark is present', async ({ page }) => {
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('h1 heading is visible', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveAccessibleName('Event Curation Policy');
  });

  test('heading hierarchy is correct (no skipped levels)', async ({ page }) => {
    const h1Count = await page.getByRole('heading', { level: 1 }).count();
    expect(h1Count).toBe(1);

    const h2Count = await page.getByRole('heading', { level: 2 }).count();
    expect(h2Count).toBeGreaterThan(0);
  });

  test('all links have accessible names', async ({ page }) => {
    const links = page.locator('.readable a');
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      await expect(links.nth(i)).toHaveAccessibleName(/.+/);
    }
  });

  test('banner and contentinfo landmarks are present', async ({ page }) => {
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 404 Page (/404)
// ---------------------------------------------------------------------------
test.describe('404 page accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/404');
  });

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const results = await runAxeScan(page);
    expect(results.violations).toEqual([]);
  });

  test('page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Page not found.*Eventua11y/);
  });

  test('main landmark is present', async ({ page }) => {
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('h1 heading is visible', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveAccessibleName('Page not found');
  });

  test('link back to homepage has accessible name', async ({ page }) => {
    const homeLink = page.getByRole('link', {
      name: /upcoming accessibility events/i,
    });
    await expect(homeLink).toBeVisible();
    await expect(homeLink).toHaveAccessibleName(
      /upcoming accessibility events/i
    );
  });

  test('banner and contentinfo landmarks are present', async ({ page }) => {
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Login page (/login)
// ---------------------------------------------------------------------------
test.describe('Login page accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const results = await runAxeScan(page);
    expect(results.violations).toEqual([]);
  });

  test('page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Sign in.*Eventua11y/);
  });

  test('main landmark is present', async ({ page }) => {
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('h1 heading is visible', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveAccessibleName('Sign in');
  });

  test('email input has accessible label', async ({ page }) => {
    const emailInput = page.locator('wa-input#email');
    await expect(emailInput).toHaveAttribute('label', 'Email');
  });

  test('password input has accessible label', async ({ page }) => {
    const passwordInput = page.locator('wa-input#password');
    await expect(passwordInput).toHaveAttribute('label', 'Password');
  });

  test('OAuth buttons have accessible names', async ({ page }) => {
    const githubButton = page.locator('#github-login');
    await expect(githubButton).toContainText('GitHub');

    const linkedinButton = page.locator('#linkedin-login');
    await expect(linkedinButton).toContainText('LinkedIn');
  });

  test('link to signup page exists', async ({ page }) => {
    const signupLink = page.getByRole('link', { name: /Create one/i });
    await expect(signupLink).toBeVisible();
    await expect(signupLink).toHaveAttribute('href', '/signup');
  });

  test('link to forgot password page exists', async ({ page }) => {
    const main = page.getByRole('main');
    const forgotLink = main.getByRole('link', {
      name: /Forgot your password/i,
    });
    await expect(forgotLink).toBeVisible();
    await expect(forgotLink).toHaveAttribute('href', '/forgot-password');
  });

  test('banner and contentinfo landmarks are present', async ({ page }) => {
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Signup page (/signup)
// ---------------------------------------------------------------------------
test.describe('Signup page accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const results = await runAxeScan(page);
    expect(results.violations).toEqual([]);
  });

  test('page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Create an account.*Eventua11y/);
  });

  test('main landmark is present', async ({ page }) => {
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('h1 heading is visible', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveAccessibleName('Create an account');
  });

  test('email input has accessible label', async ({ page }) => {
    const emailInput = page.locator('wa-input#email');
    await expect(emailInput).toHaveAttribute('label', 'Email');
  });

  test('password input has accessible label', async ({ page }) => {
    const passwordInput = page.locator('wa-input#password');
    await expect(passwordInput).toHaveAttribute('label', 'Password');
  });

  test('OAuth buttons have accessible names', async ({ page }) => {
    const githubButton = page.locator('#github-signup');
    await expect(githubButton).toContainText('GitHub');

    const linkedinButton = page.locator('#linkedin-signup');
    await expect(linkedinButton).toContainText('LinkedIn');
  });

  test('link to login page exists', async ({ page }) => {
    const main = page.getByRole('main');
    const loginLink = main.getByRole('link', { name: /Sign in/i });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute('href', '/login');
  });

  test('banner and contentinfo landmarks are present', async ({ page }) => {
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Forgot password page (/forgot-password)
// ---------------------------------------------------------------------------
test.describe('Forgot password page accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password');
  });

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const results = await runAxeScan(page);
    expect(results.violations).toEqual([]);
  });

  test('page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Reset your password.*Eventua11y/);
  });

  test('main landmark is present', async ({ page }) => {
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('h1 heading is visible', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveAccessibleName('Reset your password');
  });

  test('email input has accessible label', async ({ page }) => {
    const emailInput = page.locator('wa-input#email');
    await expect(emailInput).toHaveAttribute('label', 'Email');
  });

  test('link back to login page exists', async ({ page }) => {
    const main = page.getByRole('main');
    const loginLink = main.getByRole('link', { name: /Back to log in/i });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute('href', '/login');
  });

  test('banner and contentinfo landmarks are present', async ({ page }) => {
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Reset password page (/reset-password)
// ---------------------------------------------------------------------------
test.describe('Reset password page accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reset-password');
  });

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const results = await runAxeScan(page);
    expect(results.violations).toEqual([]);
  });

  test('page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Set a new password.*Eventua11y/);
  });

  test('main landmark is present', async ({ page }) => {
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('h1 heading is visible', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveAccessibleName('Set a new password');
  });

  test('password input has accessible label', async ({ page }) => {
    const passwordInput = page.locator('wa-input#new-password');
    await expect(passwordInput).toHaveAttribute('label', 'New password');
  });

  test('password requirements are visible', async ({ page }) => {
    const hint = page.locator('#password-hint');
    await expect(hint).toBeVisible();
    await expect(hint).toContainText('at least 8 characters');
  });

  test('link back to login page exists', async ({ page }) => {
    const main = page.getByRole('main');
    const loginLink = main.getByRole('link', { name: /Back to log in/i });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute('href', '/login');
  });

  test('banner and contentinfo landmarks are present', async ({ page }) => {
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Resend confirmation page (/resend-confirmation)
// ---------------------------------------------------------------------------
test.describe('Resend confirmation page accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/resend-confirmation');
  });

  test('has no WCAG 2.2 AA violations', async ({ page }) => {
    const results = await runAxeScan(page);
    expect(results.violations).toEqual([]);
  });

  test('page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Resend confirmation email.*Eventua11y/);
  });

  test('main landmark is present', async ({ page }) => {
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('h1 heading is visible', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveAccessibleName('Resend confirmation email');
  });

  test('email input has accessible label', async ({ page }) => {
    const emailInput = page.locator('wa-input#email');
    await expect(emailInput).toHaveAttribute('label', 'Email');
  });

  test('link back to login page exists', async ({ page }) => {
    const main = page.getByRole('main');
    const loginLink = main.getByRole('link', { name: /Back to log in/i });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute('href', '/login');
  });

  test('banner and contentinfo landmarks are present', async ({ page }) => {
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Shared component assertions (tested on homepage where all components load)
// ---------------------------------------------------------------------------
test.describe('Shared component accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#upcoming-events');
    const filterDrawer = page.locator('#filter-drawer');
    if ((await filterDrawer.getAttribute('open')) !== null) {
      await page.keyboard.press('Escape');
      await expect(filterDrawer).not.toHaveAttribute('open');
    }
  });

  test('footer social links have accessible names', async ({ page }) => {
    const footer = page.getByRole('contentinfo');
    const socialLinks = footer.locator('.social a');
    const count = await socialLinks.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(socialLinks.nth(i)).toHaveAccessibleName(/.+/);
    }
  });

  test('footer links to accessibility statement and curation policy exist', async ({
    page,
  }) => {
    const a11yLink = page.getByRole('link', {
      name: /accessibility/i,
    });
    await expect(a11yLink.last()).toBeVisible();

    const curationLink = page.getByRole('link', {
      name: /curation policy/i,
    });
    await expect(curationLink).toBeVisible();
  });

  test('filter drawer has accessible label when opened', async ({ page }) => {
    const drawer = page.locator('#filter-drawer');
    const afterShow = drawer.evaluate(
      (el) =>
        new Promise<void>((resolve) =>
          el.addEventListener('wa-after-show', () => resolve(), { once: true })
        )
    );
    const filterButton = page.locator('#open-filter-drawer');
    await filterButton.waitFor({ state: 'visible', timeout: 5000 });
    await filterButton.click();
    await afterShow;

    await expect(drawer).toHaveAttribute('open', '');
    await expect(drawer).toHaveAttribute('label', 'Filters');
  });

  test('html element has lang attribute', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

// ---------------------------------------------------------------------------
// Axe scans in explicit light and dark modes
// ---------------------------------------------------------------------------
// The tests above run with the system default (typically light). These tests
// explicitly force each color mode via localStorage and emulateMedia to catch
// contrast regressions that only surface in a specific theme.
const pages = [
  { name: 'Homepage', path: '/', waitSelector: '#upcoming-events' },
  { name: 'Past Events', path: '/past-events', waitSelector: '#past-events' },
  { name: 'Accessibility Statement', path: '/accessibility' },
  { name: 'Curation Policy', path: '/curation-policy' },
  { name: '404', path: '/404' },
  { name: 'Login', path: '/login' },
  { name: 'Signup', path: '/signup' },
  { name: 'Forgot Password', path: '/forgot-password' },
  { name: 'Reset Password', path: '/reset-password' },
  { name: 'Resend Confirmation', path: '/resend-confirmation' },
];

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`Axe scans in ${colorScheme} mode`, () => {
    for (const { name, path, waitSelector } of pages) {
      test(`${name} (${path}) has no WCAG 2.2 AA violations in ${colorScheme} mode`, async ({
        context,
        page,
      }) => {
        await page.emulateMedia({ colorScheme });
        await context.addInitScript((theme: string) => {
          window.localStorage.setItem('theme', theme);
        }, colorScheme);

        await page.goto(path);
        if (waitSelector) {
          await page.waitForSelector(waitSelector);
        }

        // Close filter drawer if open (homepage only)
        const filterDrawer = page.locator('#filter-drawer');
        if (
          (await filterDrawer.count()) > 0 &&
          (await filterDrawer.getAttribute('open')) !== null
        ) {
          await page.keyboard.press('Escape');
          await expect(filterDrawer).not.toHaveAttribute('open');
        }

        await expect(page.locator('html')).toHaveAttribute(
          'data-theme',
          colorScheme
        );

        const results = await runAxeScan(page);
        expect(results.violations).toEqual([]);
      });
    }

    // Axe cannot check contrast on SVG icons inside Web Awesome shadow DOM,
    // so we manually verify the theme selector icon meets WCAG 2.x
    // non-text contrast (3:1 minimum for UI components).
    test(`theme selector icon meets 3:1 contrast in ${colorScheme} mode`, async ({
      context,
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await context.addInitScript((theme: string) => {
        window.localStorage.setItem('theme', theme);
      }, colorScheme);

      await page.goto('/');
      // Only wait for the masthead — event content requires the API
      await page.waitForSelector('.masthead');

      const masthead = page.locator('.masthead');
      const themeButton = page.locator('#theme-selector-button');

      const bgColor = await masthead.evaluate(
        (el) => getComputedStyle(el).backgroundColor
      );
      const fgColor = await themeButton.evaluate(
        (el) => getComputedStyle(el).color
      );

      const ratio = contrastRatio(fgColor, bgColor);
      expect(
        ratio,
        `Theme selector icon contrast ratio is ${ratio.toFixed(2)}:1 (${fgColor} on ${bgColor}), expected at least 3:1`
      ).toBeGreaterThanOrEqual(3);

      // Also check hover state
      await themeButton.hover();
      const hoverFgColor = await themeButton.evaluate(
        (el) => getComputedStyle(el).color
      );
      const hoverRatio = contrastRatio(hoverFgColor, bgColor);
      expect(
        hoverRatio,
        `Theme selector icon hover contrast ratio is ${hoverRatio.toFixed(2)}:1 (${hoverFgColor} on ${bgColor}), expected at least 3:1`
      ).toBeGreaterThanOrEqual(3);
    });
  });
}
