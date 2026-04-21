/**
 * Playwright global setup — seeds the test database before E2E tests run.
 *
 * Requires the FastAPI backend to be running with:
 *   E2E_TEST_MODE=true
 *   COSMOS_CONNECTION_STRING=<emulator or test account>
 */

import { execSync } from 'child_process'
import path from 'path'

export default async function globalSetup() {
  console.log('[E2E] Seeding test database...')

  const apiDir = path.resolve(__dirname, '..', '..', 'api')
  const seedScript = path.resolve(__dirname, 'seed_db.py')

  try {
    execSync(`python "${seedScript}"`, {
      cwd: apiDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        E2E_TEST_MODE: 'true',
      },
      timeout: 30_000,
    })
    console.log('[E2E] Database seeded ✓')
  } catch (error) {
    console.error('[E2E] Database seeding FAILED — E2E tests require seeded data.')
    console.error('[E2E] Ensure COSMOS_CONNECTION_STRING is set (emulator or test account).')
    throw error
  }
}
