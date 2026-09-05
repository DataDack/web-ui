// Must be the first import: it declares `@layer theme, base, datadack-ui,
// components, utilities;`, which fixes the cascade layer order globally on
// first appearance. Any component module evaluated first would call emotion's
// css() before this parses, locking `datadack-ui` in as the lowest-priority
// layer instead — see the comment atop index.css.
import "./index.css"

import React from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { Toaster } from "sonner"

import { App } from "@/App"
import { faasTransport } from "@/lib/faas-transport"
import { aiAutomationsTransport } from "@/lib/ai-automations-transport"

import { ThemeProvider } from "@datadack/common-ui"
import { ServerlessProvider } from "@datadack/serverless"
import { AIAutomationsProvider } from "@datadack/workflows"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The console polls; retrying a failed poll just delays the next one.
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Fail loudly rather than with a non-null assertion: if index.html ever ships
// without #root, "Cannot read properties of null" at a React internal is far
// harder to diagnose than this.
const rootElement = document.getElementById("root")
if (!rootElement) {
  throw new Error("Root element #root not found — index.html is missing its mount point")
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ThemeProvider storageKey="faas.admin.theme">
      <QueryClientProvider client={queryClient}>
        {/* The shared serverless components fetch through this transport. The
            hooks' default "default" scope is fine here: the ScopeSwitcher does
            a wholesale invalidateQueries() on account/resource-group switch, so the
            cache never serves one tenant's data to another. */}
        <ServerlessProvider transport={faasTransport}>
          <AIAutomationsProvider transport={aiAutomationsTransport}>
          {/* The control plane serves this SPA from /admin_serverless, so the
              router shares that basename and every route resolves under it. */}
          <BrowserRouter basename="/admin_serverless">
            <App />
            <Toaster position="bottom-right" closeButton richColors />
          </BrowserRouter>
          </AIAutomationsProvider>
        </ServerlessProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
