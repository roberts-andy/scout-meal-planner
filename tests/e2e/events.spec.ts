/**
 * E2E tests — Events tab functionality.
 * Tests event listing, navigation, and CRUD operations.
 */

import { test, expect, E2E_USER } from '../fixtures/auth'
import { EventsPage } from '../pages/EventsPage'

test.describe('Events', () => {
  test.beforeEach(async ({ authedPage }) => {
    await authedPage.goto('/')
    await expect(authedPage.getByText(E2E_USER.displayName)).toBeVisible({ timeout: 15_000 })
  })

  test('displays seeded events on the Events tab', async ({ authedPage }) => {
    const eventsPage = new EventsPage(authedPage)
    await eventsPage.expectVisible()

    // Should show the seeded E2E event
    await eventsPage.expectEventVisible('E2E Weekend Campout')
  })

  test('can navigate to event detail', async ({ authedPage }) => {
    const eventsPage = new EventsPage(authedPage)
    await eventsPage.selectEvent('E2E Weekend Campout')

    // Should show event detail view
    await expect(authedPage.getByText('E2E Weekend Campout')).toBeVisible()
    // Should have a back button
    await expect(authedPage.getByRole('button', { name: /back|←/i })).toBeVisible()
  })

  test('can navigate back from event detail to event list', async ({ authedPage }) => {
    const eventsPage = new EventsPage(authedPage)
    await eventsPage.selectEvent('E2E Weekend Campout')

    // Click back
    await authedPage.getByRole('button', { name: /back|←/i }).click()

    // Should be back on the events list
    await eventsPage.expectVisible()
  })

  test('create event button is visible', async ({ authedPage }) => {
    const eventsPage = new EventsPage(authedPage)
    await eventsPage.expectVisible()

    // The create button should exist
    await expect(authedPage.getByRole('button', { name: /new event|create event/i })).toBeVisible()
  })

  test('event detail shows schedule with meals', async ({ authedPage }) => {
    const eventsPage = new EventsPage(authedPage)
    await eventsPage.selectEvent('E2E Weekend Campout')

    // Should show meal information from the seeded event
    await expect(authedPage.getByText(/camp chili/i)).toBeVisible()
    await expect(authedPage.getByText(/pancakes/i)).toBeVisible()
  })
})
