import React from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'

import { App } from '@/App'

import { ThemeProvider } from '@datadack/serverless-ui'

import './index.css'

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
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found — index.html is missing its mount point')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ThemeProvider storageKey="faas.admin.theme">
      <QueryClientProvider client={queryClient}>
        {/* The control plane serves this SPA from /admin, so the router shares
            that basename and every route resolves under it. */}
        <BrowserRouter basename="/admin">
          <App />
          <Toaster position="bottom-right" closeButton richColors />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
