import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Look for test files in the "tests" directory, relative to this configuration file.
  testDir: 'tests',

  // Run all tests in parallel.
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,

  // Increase retries for better reliability
  retries: process.env.CI ? 3 : 1,

  // Opt out of parallel tests on CI.
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: 'html',

  use: {
    // Base URL to use in actions like `await page.goto('/')`.
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:8888',

    // Collect trace when retrying the failed test.
    trace: 'on-first-retry',

    // Add global timeout settings
    actionTimeout: 15000,
    navigationTimeout: 30000,

    // Enable screenshot on failure
    screenshot: 'only-on-failure',

    // Enable video recording for failed tests
    video: 'retain-on-failure',

    // Add viewport size
    viewport: { width: 1280, height: 720 },

    // Add automatic waiting
    waitForNavigation: 'networkidle',
  },
  // Configure projects for major browsers.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  // Run the local dev server before starting the tests,
  // but only if process.env.PLAYWRIGHT_TEST_BASE_URL isn't set.
  webServer: !process.env.PLAYWRIGHT_TEST_BASE_URL
    ? {
        command: 'netlify dev',
        port: 8888,
        reuseExistingServer: !process.env.CI,
        timeout: 120000, // Increase server startup timeout
      }
    : undefined,
});
