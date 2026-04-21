import { Event } from './types'

export function collectExistingEventTags(events: Event[]) {
  return Array.from(
    new Set(
      events.flatMap((event) => event.tags ?? []).map((tag) => tag.trim()).filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b))
}
