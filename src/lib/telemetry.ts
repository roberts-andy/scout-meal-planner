import { ApplicationInsights } from '@microsoft/applicationinsights-web'

let appInsights: ApplicationInsights | null = null
let telemetryInitialized = false

function getConnectionString() {
  return import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING as string | undefined
}

function getAppInsights() {
  if (appInsights) return appInsights

  const connectionString = getConnectionString()
  if (!connectionString) return null

  appInsights = new ApplicationInsights({
    config: {
      connectionString,
      enableAutoRouteTracking: false,
    },
  })
  appInsights.loadAppInsights()
  return appInsights
}

export function trackPageView(pathname = window.location.pathname) {
  const client = getAppInsights()
  if (!client) return
  client.trackPageView({
    name: pathname,
    uri: window.location.href,
  })
}

export function trackCustomEvent(name: string, properties?: Record<string, string>) {
  const client = getAppInsights()
  if (!client) return
  client.trackEvent({ name }, properties)
}

export function trackClientError(error: unknown, properties?: Record<string, string>) {
  const client = getAppInsights()
  if (!client) return
  const exception = error instanceof Error ? error : new Error(String(error))
  client.trackException({
    exception,
    properties,
  })
}

export function initTelemetry() {
  if (telemetryInitialized) return
  telemetryInitialized = true

  if (!getAppInsights()) return

  trackPageView()

  window.addEventListener('popstate', () => trackPageView())
  window.addEventListener('hashchange', () => trackPageView())

  window.addEventListener('error', (event) => {
    trackClientError(event.error ?? event.message, { source: 'window.error' })
  })

  window.addEventListener('unhandledrejection', (event) => {
    trackClientError(event.reason, { source: 'window.unhandledrejection' })
  })
}
