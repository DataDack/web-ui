import axios, { type AxiosInstance } from "axios"

import {
  auditListSchema,
  dashboardSchema,
  logSnapshotSchema,
  logLineSchema,
  metricSeriesSchema,
  sessionSchema,
  tenantListSchema,
  type AuditEvent,
  type Dashboard,
  type LogLine,
  type LogSnapshot,
  type MetricSeries,
  type Session,
  type TenantList,
} from "./schemas"

const BASE_KEY = "faas.admin.apiBase"
const TOKEN_KEY = "faas.admin.token"
// Written by an earlier version, which kept the expiry beside the token instead
// of deriving it. Two keys meant they could disagree: a stale timestamp from a
// previous token outlived it and expired the next one the moment it was read,
// so a freshly pasted token worked until the first reload and then vanished.
// Removed on sight rather than read.
const LEGACY_TOKEN_EXPIRY_KEY = "faas.admin.tokenExpiresAt"
const ACCOUNT_KEY = "faas.admin.accountId"
const NAMESPACE_KEY = "faas.admin.namespace"

/**
 * Reads the `exp` claim out of a JWT, in milliseconds, or null when there is
 * none to read.
 *
 * This is housekeeping, not authentication: the payload is decoded without
 * verifying anything, because the browser cannot verify a signature it has no
 * key for and must not pretend otherwise. The control plane re-checks the
 * signature and the expiry on every single request — this only lets the console
 * stop sending a token it can already tell is spent.
 */
function tokenExpiry(token: string): number | null {
  const payload = token.split(".")[1]
  if (!payload) return null
  try {
    // base64url → base64, and atob does not tolerate missing padding.
    const padded = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=")
    const claims = JSON.parse(atob(padded)) as { exp?: unknown }
    return typeof claims.exp === "number" ? claims.exp * 1000 : null
  } catch {
    // Not a JWT, or not one this can read. Falls back to "no known expiry",
    // which means the token is kept until the control plane rejects it.
    return null
  }
}

/**
 * The token's expiry, memoised per distinct token.
 *
 * Derived from the token every time rather than stored alongside it. A second
 * key is a second source of truth, and the two drift: an expiry left behind by
 * a previous token will happily condemn its replacement. Decoding costs a JSON
 * parse, and the cache means that happens once per token rather than once per
 * outbound request.
 */
let expiryCache: { token: string; expiresAt: number | null } | null = null

function expiryOf(token: string): number | null {
  if (expiryCache?.token === token) return expiryCache.expiresAt
  const expiresAt = tokenExpiry(token)
  expiryCache = { token, expiresAt }
  return expiresAt
}

/** Operator-configurable connection settings, persisted in localStorage. */
export const connection = {
  base(): string {
    return (
      localStorage.getItem(BASE_KEY) ?? (import.meta.env.VITE_API_BASE as string | undefined) ?? ""
    )
  },
  /**
   * The stored access token, or "" once it has lapsed.
   *
   * An access token is short-lived by design, so this is temporary storage with
   * a known end: the expiry recorded at save time is checked on every read, and
   * a lapsed token is dropped rather than returned. Without that the console
   * would keep attaching a dead credential until a request came back 401 —
   * which for a browser left open overnight means every panel fails on the
   * first load of the morning before anything tells the operator why.
   */
  token(): string {
    let token = ""
    try {
      // Drop the orphan key an earlier version wrote, so it cannot mislead
      // anything that still looks for it.
      localStorage.removeItem(LEGACY_TOKEN_EXPIRY_KEY)
      token = localStorage.getItem(TOKEN_KEY) ?? ""
    } catch {
      return ""
    }
    if (!token) return ""

    const expiresAt = expiryOf(token)
    if (expiresAt !== null && Date.now() >= expiresAt) {
      connection.clearToken()
      // Deferred: this runs while an outbound request is being built, and
      // notifying synchronously would re-enter the query client mid-flight.
      // Clearing first means the token is already gone by the time anything
      // reads it again, so this fires once rather than per request.
      queueMicrotask(() => {
        notifyUnauthorized("token-expired")
      })
      return ""
    }
    return token
  },
  /** When the stored token lapses, or null when it carries no expiry. */
  tokenExpiresAt(): Date | null {
    const token = connection.token()
    if (!token) return null
    const expiresAt = expiryOf(token)
    return expiresAt === null ? null : new Date(expiresAt)
  },
  /**
   * The tenant the console is acting on behalf of. The control plane ignores it
   * when the credential is already pinned to an account, so this can only ever
   * narrow what an unauthenticated local session looks at.
   */
  accountId(): string {
    return localStorage.getItem(ACCOUNT_KEY) ?? ""
  },
  namespace(): string {
    return localStorage.getItem(NAMESPACE_KEY) ?? ""
  },
  /**
   * Persists the connection settings, reporting whether the write survived.
   *
   * localStorage is not guaranteed to work: it throws in Safari private
   * browsing, when a quota is exhausted, and when storage is blocked by policy.
   * Swallowing that means the operator saves a token, sees the panel close, and
   * is then told on every request that no token was sent — with the field still
   * showing the value they typed. The read-back is what turns that into an
   * error they can see.
   */
  set(base: string, token: string): boolean {
    try {
      localStorage.setItem(BASE_KEY, base)
      if (!token) {
        connection.clearToken()
        return true
      }
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.removeItem(LEGACY_TOKEN_EXPIRY_KEY)
      // Trust nothing: a store can accept a write and drop it.
      return localStorage.getItem(TOKEN_KEY) === token
    } catch {
      return false
    }
  },
  /**
   * Forgets the stored operator token.
   *
   * Called when the control plane rejects it. An expired token is not going to
   * start working, and leaving it in place means every subsequent request
   * carries a credential that can only fail — so the operator sees a console
   * that is broken rather than one that is asking them to sign in.
   */
  clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(LEGACY_TOKEN_EXPIRY_KEY)
    } catch {
      // Nothing useful to do: the token is unreadable either way.
    }
  },
  setScope(accountId: string, namespace: string) {
    localStorage.setItem(ACCOUNT_KEY, accountId)
    localStorage.setItem(NAMESPACE_KEY, namespace)
  },
}

/**
 * Headers every request carries, shared by axios and the raw fetch stream.
 *
 * The operator session is a cookie, not a header: it is HttpOnly precisely so
 * this file cannot read it, which is what stops an XSS bug in the console from
 * turning into a stolen platform credential.
 *
 * The bearer token here is the alternative to signing in: an access token
 * copied from the identity service. The control plane verifies it against that
 * service's published keys exactly as it verifies a session, and uses it to
 * read the operator's profile and accounts. It lives in localStorage, so it is
 * the weaker of the two paths — offered for driving a control plane from a
 * browser that has not signed into this host.
 */
function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    // The custom header a browser cannot attach to a top-level navigation or a
    // simple cross-site form, matching the convention the rest of the platform
    // uses. Cheap, and it costs nothing to send.
    "X-Requested-With": "XMLHttpRequest",
  }
  const token = connection.token()
  if (token) headers.Authorization = `Bearer ${token}`
  const accountId = connection.accountId()
  if (accountId) headers["X-Faas-Account-Id"] = accountId
  return headers
}

export const http: AxiosInstance = axios.create({
  // The session cookie has to ride along. Same-origin requests would carry it
  // anyway; this is what makes a console pointed at a different control plane
  // (Settings → API base) work too.
  withCredentials: true,
})

// The base URL and bearer token are read per request rather than baked into the
// instance, so changing them in Settings takes effect without a reload.
http.interceptors.request.use((config) => {
  config.baseURL = connection.base().replace(/\/$/, "")
  Object.assign(config.headers, authHeaders())
  return config
})

/**
 * Session expiry has to be observable from outside React: it is discovered by
 * an axios interceptor, deep inside a query no component is watching. The
 * listeners are notified once per rejected request and the guard re-checks the
 * session, which sends the operator to the sign-in form instead of leaving a
 * screen of failed panels behind.
 */
/**
 * Why the console lost its credential.
 *
 * "token-expired" is discovered locally, before a request goes out; "rejected"
 * comes back from the control plane. They need different copy: one is routine
 * and expected, the other may mean the token was revoked or was never valid.
 */
export type UnauthorizedReason = "token-expired" | "rejected"

type UnauthorizedListener = (reason: UnauthorizedReason) => void
const unauthorizedListeners = new Set<UnauthorizedListener>()

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener)
  return () => {
    unauthorizedListeners.delete(listener)
  }
}

function notifyUnauthorized(reason: UnauthorizedReason) {
  for (const listener of unauthorizedListeners) listener(reason)
}

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // 403 is deliberately not included: it means the credential is valid but the
    // principal lacks the scope, and signing out would only cost them the
    // session they legitimately hold.
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      notifyUnauthorized("rejected")
    }
    return Promise.reject(error instanceof Error ? error : new Error(String(error)))
  },
)

/** Unwraps the control plane's `{ error: { code, message } }` envelope. */
export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { error?: { message?: string; code?: string } } | undefined
    if (body?.error?.message) return body.error.message
    return err.message
  }
  return err instanceof Error ? err.message : String(err)
}

/**
 * The console reads one aggregate snapshot rather than a request per list, which
 * is the same trade the control plane's /v1/admin/dashboard is built for.
 */
export async function fetchDashboard(): Promise<Dashboard> {
  const { data } = await http.get<unknown>("/v1/admin/dashboard")
  return dashboardSchema.parse(data)
}

export interface LogQuery {
  function?: string
  level?: string
  stream?: string
  search?: string
  limit?: number
}

function logParams(query: LogQuery): Record<string, string> {
  const params: Record<string, string> = {}
  if (query.function) params.function = query.function
  if (query.level) params.level = query.level
  if (query.stream) params.stream = query.stream
  if (query.search) params.search = query.search
  if (query.limit) params.limit = String(query.limit)
  const namespace = connection.namespace()
  if (namespace) params.namespace = namespace
  return params
}

export async function fetchLogs(query: LogQuery): Promise<LogSnapshot> {
  const { data } = await http.get<unknown>("/v1/logs", { params: logParams(query) })
  return logSnapshotSchema.parse(data)
}

export interface LogStreamHandlers {
  onLine: (line: LogLine) => void
  onDropped?: (lines: number) => void
  onError?: (message: string) => void
  onOpen?: () => void
}

/**
 * Opens the log tail.
 *
 * This uses fetch rather than EventSource because EventSource cannot set an
 * Authorization header, and the alternative — putting the operator's bearer
 * token in the query string — writes it into every proxy and access log between
 * here and the control plane.
 *
 * Returns an abort function; call it to close the stream.
 */
export function streamLogs(query: LogQuery, handlers: LogStreamHandlers): () => void {
  const controller = new AbortController()
  const params = new URLSearchParams(logParams(query))
  const url = `${connection.base().replace(/\/$/, "")}/v1/logs/stream?${params.toString()}`

  void (async () => {
    try {
      const response = await fetch(url, {
        headers: { ...authHeaders(), Accept: "text/event-stream" },
        // Same reason as the axios instance: the operator session is a cookie.
        credentials: "include",
        signal: controller.signal,
      })
      if (response.status === 401) {
        notifyUnauthorized("rejected")
        handlers.onError?.("session expired")
        return
      }
      if (!response.ok || !response.body) {
        handlers.onError?.(`stream failed: ${String(response.status)} ${response.statusText}`)
        return
      }
      handlers.onOpen?.()

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // SSE frames are separated by a blank line. Anything after the last
        // separator is a partial frame and stays in the buffer.
        const frames = buffer.split("\n\n")
        buffer = frames.pop() ?? ""
        for (const frame of frames) {
          dispatchFrame(frame, handlers)
        }
      }
    } catch (err) {
      // An abort is the caller closing the stream, not a failure.
      if (controller.signal.aborted) return
      handlers.onError?.(err instanceof Error ? err.message : String(err))
    }
  })()

  return () => {
    controller.abort()
  }
}

function dispatchFrame(frame: string, handlers: LogStreamHandlers) {
  let event = "message"
  const data: string[] = []
  for (const rawLine of frame.split("\n")) {
    const line = rawLine.trimEnd()
    // A line starting with ':' is a comment — the stream's heartbeat.
    if (line.startsWith(":") || line === "") continue
    if (line.startsWith("event:")) event = line.slice("event:".length).trim()
    else if (line.startsWith("data:")) data.push(line.slice("data:".length).trim())
  }
  if (data.length === 0) return

  const payload: unknown = JSON.parse(data.join("\n"))
  if (event === "log") {
    const parsed = logLineSchema.safeParse(payload)
    if (parsed.success) handlers.onLine(parsed.data)
    return
  }
  if (event === "dropped") {
    const dropped = (payload as { lines?: number }).lines
    if (typeof dropped === "number") handlers.onDropped?.(dropped)
    return
  }
  if (event === "eof") {
    handlers.onError?.("stream closed by the server; reconnecting")
  }
}

export interface MetricQuery {
  function?: string
  since: string
  step?: string
}

export async function fetchMetricSeries(query: MetricQuery): Promise<MetricSeries> {
  const params: Record<string, string> = { since: query.since }
  if (query.function) params.function = query.function
  if (query.step) params.step = query.step
  const namespace = connection.namespace()
  if (namespace) params.namespace = namespace

  const { data } = await http.get<unknown>("/v1/metrics/series", { params })
  return metricSeriesSchema.parse(data)
}

export interface AuditQuery {
  principal?: string
  action?: string
  resource?: string
  failuresOnly?: boolean
  since?: string
  limit?: number
}

export async function fetchAuditEvents(query: AuditQuery): Promise<AuditEvent[]> {
  const params: Record<string, string> = {}
  if (query.principal) params.principal = query.principal
  if (query.action) params.action = query.action
  if (query.resource) params.resource = query.resource
  if (query.failuresOnly) params.failuresOnly = "true"
  if (query.since) params.since = query.since
  params.limit = String(query.limit ?? 200)

  const { data } = await http.get<unknown>("/v1/admin/audit", { params })
  return auditListSchema.parse(data).events
}

export async function fetchTenants(): Promise<TenantList> {
  const { data } = await http.get<unknown>("/v1/accounts")
  return tenantListSchema.parse(data)
}

/**
 * Who the control plane thinks is calling, and which accounts they can reach.
 *
 * A 401 here is the expected answer when no token is configured, not a failure:
 * it becomes an unauthenticated session so the console renders its empty states
 * rather than an error page. Anything else is a real problem and propagates.
 */
export async function fetchSession(): Promise<Session> {
  try {
    const { data } = await http.get<unknown>("/v1/auth/session")
    return sessionSchema.parse(data)
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      return sessionSchema.parse({ authenticated: false })
    }
    throw err
  }
}

