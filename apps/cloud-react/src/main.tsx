// Must be the first import: it declares `@layer theme, base, datadack-ui,
// components, utilities;`, which fixes the cascade layer order globally on
// first appearance. Any component module evaluated first (e.g. TooltipProvider
// below) would call emotion's css() before this parses, locking `datadack-ui`
// in as the lowest-priority layer instead — see the comment atop index.css.
import "./index.css"

import { StrictMode } from "react"

// Self-hosted fonts via @fontsource (no CDN dependency)
import "@fontsource-variable/hanken-grotesk"
import "@fontsource-variable/geist"
import "@fontsource-variable/rubik"
import "@fontsource/jetbrains-mono/500.css"

import { TooltipProvider } from "@datadack/common-ui"
import * as Sentry from "@sentry/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRoot } from "react-dom/client"
import { Toaster } from "sonner"

import { env } from "@/env"
import { AuthProvider } from "@/modules/auth/auth.context"
import { RegionProvider } from "@/modules/region/region.context"
import { ResourceGroupProvider } from "@/modules/resource-groups/resource-group.context"
import { ServerlessDataProvider } from "@/modules/serverless/ServerlessDataProvider"
import { activeScope } from "@/services/api/active-scope"
import { LanguageProvider } from "@/services/language_service"
import { ThemeProvider } from "@/services/theme_service"

import App from "./App.tsx"

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
                  {/* ResourceGroupProvider sits ABOVE the serverless transport:
                      creating a function stamps the active resource group onto
                      it, so the transport has to be able to read the group.
                      Nothing here depends on the transport in return — the
                      provider only reads localStorage. */}
                  <ResourceGroupProvider>
                    {/* Below QueryClientProvider + RegionProvider: the serverless
                        transport resolves its FaaS base per active region. */}
                    <ServerlessDataProvider>
                      <App />
                      <Toaster richColors position="top-right" />
                    </ServerlessDataProvider>
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
