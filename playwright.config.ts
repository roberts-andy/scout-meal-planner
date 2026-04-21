import { defineConfig, devices } from '@playwright/test'
import path from 'path'

/**
 * Playwright configuration for end-to-end tests.
 *
 * Architecture: Mock MSAL auth on the frontend, real FastAPI backend.
 *
 * Run locally:
 *   1. Start Cosmos DB emulator (or use connection string in .env)
 *   2. npx playwright install       # one-time: download browsers
 *   3. npm run test:e2e             # starts Vite + FastAPI, runs tests
 *
 * Both web servers auto-start for the duration of the run.
 */
export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      // FastAPI backend with E2E auth bypass enabled
      command: process.platform === 'win32'
        ? 'cmd /c "set E2E_TEST_MODE=true && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"'
        : 'E2E_TEST_MODE=true python -m uvicorn app.main:app --host 127.0.0.1 --port 8000',
      cwd: path.resolve(__dirname, 'api'),
      url: 'http://127.0.0.1:8000/api/feature-flags',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      // Vite dev server (proxies /api → FastAPI)
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        ...process.env,
        VITE_ENTRA_CLIENT_ID: process.env.VITE_ENTRA_CLIENT_ID || '42871bb7-a693-4d97-9cb9-69bbf9a50ff4',
      },
    },
  ],
})
