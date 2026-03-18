import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fill a Web Awesome `wa-input` by targeting the native <input> inside
 * its shadow DOM. Playwright's locator engine pierces shadow roots
 * automatically so `locator('input')` finds the inner element.
 */
async function fillWaInput(page: Page, selector: string, value: string) {
  await page.locator(selector).locator('input').fill(value);
}

/**
 * Mock every Supabase auth endpoint (`/auth/v1/**`) so that the client
 * receives a controlled JSON response without hitting a real server.
 *
 * IMPORTANT: Call this BEFORE page.goto() so the mock intercepts any
 * auth requests the Supabase client fires during initialisation.
 */
async function mockSupabaseAuth(
  page: Page,
  body: Record<string, unknown>,
  status = 200
) {
  await page.route('**/auth/v1/**', (route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  );
}

/**
 * Register a default Supabase auth mock (returns empty session) and
 * navigate to the given path. This ensures any auth requests fired
 * during page initialisation are safely intercepted.
 */
async function gotoWithAuthMock(
  page: Page,
  path: string,
  formSelector: string
) {
  await mockSupabaseAuth(page, { data: { session: null } });
  await page.goto(path);
  await page.waitForSelector(formSelector);
}

// ---------------------------------------------------------------------------
// Login page  (/login)
// ---------------------------------------------------------------------------

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithAuthMock(page, '/login', '#login-form');
  });

  test('shows error when submitting with empty fields', async ({ page }) => {
    await page.locator('wa-button#login-button').click();

    const errorCallout = page.locator('#login-error');
    await expect(errorCallout).toBeVisible();
    await expect(page.locator('#login-error-message')).toHaveText(
      'Please enter your email and password.'
    );
  });

  test('shows error callout when login fails', async ({ page }) => {
    // Override the default mock with a login-failure response
    await page.unroute('**/auth/v1/**');
    await mockSupabaseAuth(
      page,
      {
        error: 'invalid_grant',
        error_description: 'Invalid login credentials',
      },
      400
    );

    await fillWaInput(page, 'wa-input#email', 'user@example.com');
    await fillWaInput(page, 'wa-input#password', 'wrongpassword');
    await page.locator('wa-button#login-button').click();

    const errorCallout = page.locator('#login-error');
    await expect(errorCallout).toBeVisible();
    await expect(page.locator('#login-error-message')).toHaveText(
      'Invalid email or password.'
    );
  });

  test('shows special message for unconfirmed email', async ({ page }) => {
    // Override the default mock with an "Email not confirmed" error
    await page.unroute('**/auth/v1/**');
    await mockSupabaseAuth(
      page,
      {
        error: 'unauthorized',
        error_description: 'Email not confirmed',
        message: 'Email not confirmed',
      },
      400
    );

    await fillWaInput(page, 'wa-input#email', 'unverified@example.com');
    await fillWaInput(page, 'wa-input#password', 'somepassword');
    await page.locator('wa-button#login-button').click();

    const errorCallout = page.locator('#login-error');
    await expect(errorCallout).toBeVisible();

    const errorMessage = page.locator('#login-error-message');
    await expect(errorMessage).toContainText(
      'Your email address has not been confirmed'
    );
    await expect(errorMessage.locator('a')).toHaveAttribute(
      'href',
      '/resend-confirmation'
    );
  });

  test('has error region with role="alert"', async ({ page }) => {
    const errorRegion = page.locator('#login-error-region');
    await expect(errorRegion).toHaveAttribute('role', 'alert');
  });
});

// ---------------------------------------------------------------------------
// Signup page  (/signup)
// ---------------------------------------------------------------------------

test.describe('Signup page', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithAuthMock(page, '/signup', '#signup-form');
  });

  test('shows error when submitting with empty fields', async ({ page }) => {
    await page.locator('wa-button#signup-button').click();

    const errorCallout = page.locator('#signup-error');
    await expect(errorCallout).toBeVisible();
    await expect(page.locator('#signup-error-message')).toHaveText(
      'Please enter your email and password.'
    );
  });

  test('shows error when password is too short', async ({ page }) => {
    await fillWaInput(page, 'wa-input#email', 'user@example.com');
    await fillWaInput(page, 'wa-input#password', 'ab');
    await page.locator('wa-button#signup-button').click();

    const errorCallout = page.locator('#signup-error');
    await expect(errorCallout).toBeVisible();
    await expect(page.locator('#signup-error-message')).toHaveText(
      'Password must be at least 6 characters.'
    );
  });

  test('shows success message after successful signup', async ({ page }) => {
    // Override the default mock with a successful signup response
    await page.unroute('**/auth/v1/**');
    await mockSupabaseAuth(page, {
      user: {
        id: 'mock-user-id',
        email: 'newuser@example.com',
        aud: 'authenticated',
      },
      session: null,
    });
    // Also mock the profiles REST endpoint (signup migrates preferences)
    await page.route('**/rest/v1/profiles**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    );

    await fillWaInput(page, 'wa-input#email', 'newuser@example.com');
    await fillWaInput(page, 'wa-input#password', 'securepassword');
    await page.locator('wa-button#signup-button').click();

    const successCallout = page.locator('#signup-success');
    await expect(successCallout).toBeVisible();
    await expect(successCallout).toContainText('Check your email');
  });

  test('hides form fields and shows success region after signup', async ({
    page,
  }) => {
    await page.unroute('**/auth/v1/**');
    await mockSupabaseAuth(page, {
      user: {
        id: 'mock-user-id',
        email: 'newuser@example.com',
        aud: 'authenticated',
      },
      session: null,
    });
    await page.route('**/rest/v1/profiles**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    );

    await fillWaInput(page, 'wa-input#email', 'newuser@example.com');
    await fillWaInput(page, 'wa-input#password', 'securepassword');
    await page.locator('wa-button#signup-button').click();

    // Form fields should be hidden
    await expect(page.locator('#signup-form-fields')).toBeHidden();

    // Success region should be visible
    await expect(page.locator('#signup-success')).toBeVisible();
  });

  test('has error region with role="alert" and success region with role="status"', async ({
    page,
  }) => {
    const errorRegion = page.locator('#signup-error-region');
    await expect(errorRegion).toHaveAttribute('role', 'alert');

    const successRegion = page.locator('#signup-success-region');
    await expect(successRegion).toHaveAttribute('role', 'status');
  });
});

// ---------------------------------------------------------------------------
// Forgot password page  (/forgot-password)
// ---------------------------------------------------------------------------

test.describe('Forgot password page', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithAuthMock(page, '/forgot-password', '#forgot-password-form');
  });

  test('shows error when submitting with empty email', async ({ page }) => {
    await page.locator('wa-button#reset-button').click();

    const errorCallout = page.locator('#forgot-error');
    await expect(errorCallout).toBeVisible();
    await expect(page.locator('#forgot-error-message')).toHaveText(
      'Please enter your email address.'
    );
  });

  test('shows success message after submission', async ({ page }) => {
    // Default mock already returns success — no override needed

    await fillWaInput(page, 'wa-input#email', 'user@example.com');
    await page.locator('wa-button#reset-button').click();

    const successCallout = page.locator('#forgot-success');
    await expect(successCallout).toBeVisible();
    await expect(successCallout).toContainText('Check your email');
  });

  test('has error region with role="alert" and success region with aria-live="polite"', async ({
    page,
  }) => {
    const errorRegion = page.locator('#forgot-error-region');
    await expect(errorRegion).toHaveAttribute('role', 'alert');

    const successRegion = page.locator('#forgot-success-region');
    await expect(successRegion).toHaveAttribute('aria-live', 'polite');
  });
});

// ---------------------------------------------------------------------------
// Reset password page  (/reset-password)
// ---------------------------------------------------------------------------

test.describe('Reset password page', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithAuthMock(page, '/reset-password', '#reset-password-form');
  });

  test('shows error when submitting with short password', async ({ page }) => {
    await fillWaInput(page, 'wa-input#new-password', 'abc');
    await page.locator('wa-button#reset-button').click();

    const errorCallout = page.locator('#reset-error');
    await expect(errorCallout).toBeVisible();
    await expect(page.locator('#reset-error-message')).toHaveText(
      'Password must be at least 6 characters.'
    );
  });

  test('has error region with role="alert" and success region with aria-live="polite"', async ({
    page,
  }) => {
    const errorRegion = page.locator('#reset-error-region');
    await expect(errorRegion).toHaveAttribute('role', 'alert');

    const successRegion = page.locator('#reset-success-region');
    await expect(successRegion).toHaveAttribute('aria-live', 'polite');
  });
});

// ---------------------------------------------------------------------------
// Resend confirmation page  (/resend-confirmation)
// ---------------------------------------------------------------------------

test.describe('Resend confirmation page', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithAuthMock(page, '/resend-confirmation', '#resend-form');
  });

  test('shows error when submitting with empty email', async ({ page }) => {
    await page.locator('wa-button#resend-button').click();

    const errorCallout = page.locator('#resend-error');
    await expect(errorCallout).toBeVisible();
    await expect(page.locator('#resend-error-message')).toHaveText(
      'Please enter your email address.'
    );
  });

  test('shows success message after submission', async ({ page }) => {
    // Default mock already returns success — no override needed

    await fillWaInput(page, 'wa-input#email', 'user@example.com');
    await page.locator('wa-button#resend-button').click();

    const successCallout = page.locator('#resend-success');
    await expect(successCallout).toBeVisible();
    await expect(successCallout).toContainText('Check your email');
  });

  test('has error region with role="alert" and success region with aria-live="polite"', async ({
    page,
  }) => {
    const errorRegion = page.locator('#resend-error-region');
    await expect(errorRegion).toHaveAttribute('role', 'alert');

    const successRegion = page.locator('#resend-success-region');
    await expect(successRegion).toHaveAttribute('aria-live', 'polite');
  });
});
