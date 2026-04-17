import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for end-to-end smoke tests.
 *
 * Run locally:
 *   npx playwright install       # one-time: download browsers
 *   npm run test:e2e             # start Vite, run smoke suite
 *
 * The webServer block auto-starts Vite for the duration of the run.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
