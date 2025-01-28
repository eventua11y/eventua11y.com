import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Look for test files in the "tests" directory, relative to this configuration file.
  testDir: 'tests',

  // Run all tests in parallel.
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,

  // Retry on CI only.
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI.
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: 'html',

  use: {
    // Base URL to use in actions like `await page.goto('/')`.
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:8888',

    // Collect trace when retrying the failed test.
    trace: 'on-first-retry',

    // Enable network mocking
    networkMocking: true,

    // Enable visual comparisons
    visual: {
      compare: true,
      threshold: 0.1,
    },
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
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'Tablet Chrome',
      use: { ...devices['Galaxy Tab S4'] },
    },
    {
      name: 'Tablet Safari',
      use: { ...devices['iPad Pro 11'] },
    },
  ],
  // Run the local dev server before starting the tests,
  // but only if process.env.PLAYWRIGHT_TEST_BASE_URL isn't set.
  webServer: !process.env.PLAYWRIGHT_TEST_BASE_URL
    ? {
        command: 'netlify dev',
        port: 8888,
        reuseExistingServer: !process.env.CI,
      }
    : undefined,
});
