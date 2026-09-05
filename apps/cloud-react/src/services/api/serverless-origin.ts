import { useSyncExternalStore } from "react"

// The browser-reachable serverless control-plane origin for the active region.
//
// Several console sections now talk to the serverless service DIRECTLY rather than
// through the platform gateway — serverless functions, AI & Automations, and
// (since the control plane moved there) API Gateway. They all need the same
// answer to "which origin", and resolving it is not free: it depends on the
// active region and, unless VITE_SERVERLESS_API_BASE is set at build time, on a
// call to the gateway's endpoint map.
//
// So it is resolved ONCE, by ServerlessDataProvider, which is mounted for the
// whole app in main.tsx, and published here. This module is the same kind of
// thing as active-scope.ts and auth-token.ts next to it: a small client-held
// value that non-React code — a query function, an axios interceptor — can read
// without being handed it through props.
//
// `null` means no reachable serverless origin for this region. That is a legitimate
// state, not an error: a deployment can have no serverless service in a region. Callers must
// render a "not available here" surface rather than issuing a request against
// the console's own origin, which is what an empty-string default would do.

let origin: string | null = null
const listeners = new Set<() => void>()

export const serverlessOrigin = {
  /** The current origin, or null when this region has no reachable serverless. */
  get: (): string | null => origin,

  /** Publish a newly resolved origin. A no-op when it has not changed. */
  set: (next: string | null): void => {
    if (next === origin) return
    origin = next
    for (const listener of listeners) listener()
  },

  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

/** Subscribe a component to the resolved serverless origin. */
export function useServerlessOrigin(): string | null {
  return useSyncExternalStore(
    serverlessOrigin.subscribe,
    serverlessOrigin.get,
    serverlessOrigin.get,
  )
}
