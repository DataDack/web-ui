import { StrictMode } from "react"

// Self-hosted fonts via @fontsource (no CDN dependency)
import "@fontsource-variable/hanken-grotesk"
import "@fontsource-variable/geist"
import "@fontsource-variable/rubik"
import "@fontsource/jetbrains-mono/500.css"

import * as Sentry from "@sentry/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRoot } from "react-dom/client"
import { Toaster } from "sonner"

import { TooltipProvider } from "@DataDack/common-ui"
import { env } from "@/env"
import { AuthProvider } from "@/modules/auth/auth.context"
import { RegionProvider } from "@/modules/region/region.context"
import { ResourceGroupProvider } from "@/modules/resource-groups/resource-group.context"
import { activeScope } from "@/services/api/active-scope"
import { LanguageProvider } from "@/services/language_service"
import { ThemeProvider } from "@/services/theme_service"

import App from "./App.tsx"
import "./index.css"

// A deploy replaces the hashed chunk files, so a tab loaded before the deploy
// gets the index.html SPA fallback (text/html) when a lazy route requests its
// old chunk. Vite surfaces that as vite:preloadError — reload once to pick up
// the new index.html; the time guard stops a reload loop if the failure
// persists (real outage, not a stale hash).
window.addEventListener("vite:preloadError", (event) => {
  const RELOAD_AT = "chunk-reload-at"
  const last = Number(sessionStorage.getItem(RELOAD_AT) ?? "0")
  if (Date.now() - last < 30_000) return // just reloaded; let the error surface
  sessionStorage.setItem(RELOAD_AT, String(Date.now()))
  event.preventDefault()
  window.location.reload()
})

Sentry.init({
  dsn: env.VITE_SENTRY_DSN,
  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enabled: !!env.VITE_SENTRY_DSN,
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Treat data as fresh for 1 min so navigating between pages doesn't
      // refire the same query on every mount (each refetch pays the remote
      // round trip + auth tax). Hooks that need tighter freshness override
      // staleTime locally; mutations still invalidate to force a refetch.
      staleTime: 60 * 1000,
    },
  },
})

function mount() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <TooltipProvider delayDuration={300}>
              <AuthProvider>
                <RegionProvider>
                  <ResourceGroupProvider>
                    <App />
                    <Toaster richColors position="top-right" />
                  </ResourceGroupProvider>
                </RegionProvider>
              </AuthProvider>
            </TooltipProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}

// Rehydrate the active-account scope from IndexedDB before the first render so
// the X-Account-Id header is correct on the very first requests. Failure
// (IndexedDB unavailable) degrades to an empty scope — never blocks the app.
void activeScope.hydrate().finally(mount)
