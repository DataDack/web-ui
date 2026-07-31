import React from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'

import { App } from '@/App'
import { ThemeProvider } from '@/components/shell/ThemeProvider'

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

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
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
