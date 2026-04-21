import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import "@github/spark/spark"

import { msalConfig } from './lib/authConfig.ts'
import { AuthProvider } from './components/AuthProvider.tsx'
import App from './App.tsx'
import { SharedEventPage } from './components/SharedEventPage.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'
import { initTelemetry, trackClientError } from './lib/telemetry.ts'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

const msalInstance = new PublicClientApplication(msalConfig)
initTelemetry()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
})

const sharedMatch = window.location.pathname.match(/^\/share\/([^/]+)$/)

if (sharedMatch) {
  const token = decodeURIComponent(sharedMatch[1])
  createRoot(document.getElementById('root')!).render(
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error) => trackClientError(error, { source: 'react-error-boundary' })}
    >
      <QueryClientProvider client={queryClient}>
        <SharedEventPage token={token} />
      </QueryClientProvider>
    </ErrorBoundary>
  )
} else {
  msalInstance.initialize().then(() => {
    createRoot(document.getElementById('root')!).render(
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onError={(error) => trackClientError(error, { source: 'react-error-boundary' })}
      >
        <MsalProvider instance={msalInstance}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <App />
            </AuthProvider>
          </QueryClientProvider>
        </MsalProvider>
      </ErrorBoundary>
    )
  })
}
