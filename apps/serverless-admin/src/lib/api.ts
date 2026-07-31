import axios, { type AxiosInstance } from 'axios'

import {
  auditListSchema,
  dashboardSchema,
  logSnapshotSchema,
  logLineSchema,
  metricSeriesSchema,
  tenantListSchema,
  type AuditEvent,
  type Dashboard,
  type LogLine,
  type LogSnapshot,
  type MetricSeries,
  type TenantList,
} from './schemas'

const BASE_KEY = 'faas.admin.apiBase'
const TOKEN_KEY = 'faas.admin.token'
const ACCOUNT_KEY = 'faas.admin.accountId'
const NAMESPACE_KEY = 'faas.admin.namespace'

/** Operator-configurable connection settings, persisted in localStorage. */
export const connection = {
  base(): string {
    return (
      localStorage.getItem(BASE_KEY) ?? (import.meta.env.VITE_API_BASE as string | undefined) ?? ''
    )
  },
  token(): string {
    return localStorage.getItem(TOKEN_KEY) ?? ''
  },
  /**
   * The tenant the console is acting on behalf of. The control plane ignores it
   * when the credential is already pinned to an account, so this can only ever
   * narrow what an unauthenticated local session looks at.
   */
  accountId(): string {
    return localStorage.getItem(ACCOUNT_KEY) ?? ''
  },
  namespace(): string {
    return localStorage.getItem(NAMESPACE_KEY) ?? ''
  },
  set(base: string, token: string) {
    localStorage.setItem(BASE_KEY, base)
    localStorage.setItem(TOKEN_KEY, token)
  },
  setScope(accountId: string, namespace: string) {
    localStorage.setItem(ACCOUNT_KEY, accountId)
    localStorage.setItem(NAMESPACE_KEY, namespace)
  },
}

/** Headers every request carries, shared by axios and the raw fetch stream. */
function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const token = connection.token()
  if (token) headers.Authorization = `Bearer ${token}`
  const accountId = connection.accountId()
  if (accountId) headers['X-Faas-Account-Id'] = accountId
  return headers
}

export const http: AxiosInstance = axios.create()

// The base URL and bearer token are read per request rather than baked into the
// instance, so changing them in Settings takes effect without a reload.
http.interceptors.request.use((config) => {
  config.baseURL = connection.base().replace(/\/$/, '')
  Object.assign(config.headers, authHeaders())
  return config
})

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
  const { data } = await http.get<unknown>('/v1/admin/dashboard')
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
  const { data } = await http.get<unknown>('/v1/logs', { params: logParams(query) })
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
  const url = `${connection.base().replace(/\/$/, '')}/v1/logs/stream?${params.toString()}`

  void (async () => {
    try {
      const response = await fetch(url, {
        headers: { ...authHeaders(), Accept: 'text/event-stream' },
        signal: controller.signal,
      })
      if (!response.ok || !response.body) {
        handlers.onError?.(`stream failed: ${String(response.status)} ${response.statusText}`)
        return
      }
      handlers.onOpen?.()

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // SSE frames are separated by a blank line. Anything after the last
        // separator is a partial frame and stays in the buffer.
        const frames = buffer.split('\n\n')
        buffer = frames.pop() ?? ''
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
  let event = 'message'
  const data: string[] = []
  for (const rawLine of frame.split('\n')) {
    const line = rawLine.trimEnd()
    // A line starting with ':' is a comment — the stream's heartbeat.
    if (line.startsWith(':') || line === '') continue
    if (line.startsWith('event:')) event = line.slice('event:'.length).trim()
    else if (line.startsWith('data:')) data.push(line.slice('data:'.length).trim())
  }
  if (data.length === 0) return

  const payload: unknown = JSON.parse(data.join('\n'))
  if (event === 'log') {
    const parsed = logLineSchema.safeParse(payload)
    if (parsed.success) handlers.onLine(parsed.data)
    return
  }
  if (event === 'dropped') {
    const dropped = (payload as { lines?: number }).lines
    if (typeof dropped === 'number') handlers.onDropped?.(dropped)
    return
  }
  if (event === 'eof') {
    handlers.onError?.('stream closed by the server; reconnecting')
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

  const { data } = await http.get<unknown>('/v1/metrics/series', { params })
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
  if (query.failuresOnly) params.failuresOnly = 'true'
  if (query.since) params.since = query.since
  params.limit = String(query.limit ?? 200)

  const { data } = await http.get<unknown>('/v1/admin/audit', { params })
  return auditListSchema.parse(data).events
}

export async function fetchTenants(): Promise<TenantList> {
  const { data } = await http.get<unknown>('/v1/accounts')
  return tenantListSchema.parse(data)
}
