import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios"

import { activeScope } from "@/services/api/active-scope"
import { authToken, refreshAccessToken } from "@/services/api/auth-token"
import { api, extractError } from "@/services/api/client"

import type { AIAutomationsTransport } from "@datadack/workflows"

// Direct browser → FaaS control-plane client for the AI & Workflows section.
//
// The same shape as faas.client.ts and for the same reasons: this is NOT the
// gateway client (services/api/client.ts), which is pinned to /api/v1, is
// cookie-oriented, attaches console-only headers and unwraps the platform
// {data, meta} envelope. The AI & Automations API is a FaaS surface, and it
// answers in FaaS's shapes.
//
// One difference from the serverless transport worth stating: this section's
// package speaks a SINGLE generic `request(method, path, options)` rather than
// one method per endpoint. Every call it will ever make already goes through
// here, so the interceptors below — bearer, account pin, 401 refresh — cover the
// whole surface rather than needing a wrapper per route.

/** Native FaaS error body (common/core/httpx). */
interface FaasErrorBody {
  error?: { code?: string; message?: string; status?: number }
}

/**
 * Pull the server's own words off a failed call.
 *
 * The package's components only ever read `e.message`, so a generic axios
 * "Request failed with status code 502" is what a user would otherwise see in
 * place of "GitHub refused the request; the account most likely has not granted
 * the scope this needs".
 */
function automationsErrorMessage(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    const body = e.response?.data as FaasErrorBody | undefined
    if (body?.error?.message) return body.error.message
    // A 501 from this surface means the platform has no OAuth application for
    // the provider — an operator's problem, not the caller's. Saying so beats
    // "not implemented".
    if (e.response?.status === 501) {
      return "This platform has not enabled that provider yet."
    }
  }
  if (e instanceof Error && e.message) return e.message
  return fallback
}

export interface AutomationsTransportOptions {
  /**
   * The FaaS origin for the active region ("" = same-origin → dev proxy).
   * Read per request, so a region switch needs a new closure, not a new axios
   * instance.
   */
  getBaseUrl: () => string
  /** Tenant selector; defaults to the console's active account scope. */
  getAccountId?: () => string | null
  /** Bearer credential; defaults to the in-memory access token. */
  getToken?: () => string | null
}

/** The prefix every route in this section sits under on the control plane. */
const API_PREFIX = "/v1/workflows"

/**
 * Where the app-integration surface lives — on THIS platform's own API, not on
 * the FaaS control plane.
 *
 * The two halves of AI & Automations are two services. Workflow documents and
 * their executions are FaaS's; every third-party connection — the OAuth
 * accounts, the trigger bindings, the Meta products, the GitHub App — belongs
 * to the platform backend, which owns the tenant, the credential store and the
 * public callback addresses providers were registered against. Relative to
 * `/api/v1`, which the gateway client already carries.
 */
const INTEGRATIONS_PREFIX = "/integrations"

export function createAutomationsTransport(
  opts: AutomationsTransportOptions,
): AIAutomationsTransport {
  const getToken = opts.getToken ?? authToken.get
  const getAccountId = opts.getAccountId ?? activeScope.getAccountId

  // Never cookies: the access cookie is SameSite=Lax + HttpOnly, and FaaS CORS
  // deliberately has no Allow-Credentials — this is a pure bearer path.
  const faas = axios.create({ withCredentials: false })

  faas.interceptors.request.use((config) => {
    config.baseURL = opts.getBaseUrl()
    const token = getToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    const accountId = getAccountId()
    if (accountId) config.headers["X-Faas-Account-Id"] = accountId
    else delete config.headers["X-Faas-Account-Id"]
    return config
  })

  // 401 → one silent refresh, one replay, then surface. Same contract as the
  // serverless client: the gateway client owns session teardown.
  faas.interceptors.response.use(undefined, async (error: AxiosError) => {
    const cfg = error.config as
      | (InternalAxiosRequestConfig & { _automationsRetried?: boolean })
      | undefined
    if (error.response?.status === 401 && cfg && !cfg._automationsRetried) {
      cfg._automationsRetried = true
      const fresh = await refreshAccessToken()
      if (fresh) {
        cfg.headers.Authorization = `Bearer ${fresh}`
        return faas.request(cfg)
      }
    }
    throw error
  })

  return {
    // App integrations are served, but by the platform API rather than by this
    // control plane — see integrationsRequest below. Realtime execution events
    // are served by neither (there is no socket on this surface), so that stays
    // off and the package's log panel falls back to polling.
    capabilities: { connectedAccounts: true, integrations: true, realtimeEvents: false },

    // Absolute URLs the package hands to the BROWSER rather than to axios: the
    // webhook address shown for copying, and an OAuth popup's destination. They
    // have to carry the origin, because the console and the control plane are
    // different hosts here — unlike the serverless-web console, which is served
    // by the control plane itself.
    publicUrl(path) {
      const base = opts.getBaseUrl()
      return `${base}${API_PREFIX}${path}`
    },

    // The caller names the shape it expects; nothing here can verify it, which
    // is why the two returns assert rather than narrow. That is the same
    // contract every method on the serverless transport has — the difference is
    // that this one surface serves the whole package.
    async request<T = unknown>(
      method: "GET" | "POST" | "PUT" | "DELETE",
      path: string,
      options?: { body?: unknown; params?: Record<string, unknown>; responseType?: string },
    ): Promise<T> {
      try {
        const response: AxiosResponse<unknown> = await faas.request({
          method,
          url: `${API_PREFIX}${path}`,
          data: options?.body,
          params: options?.params,
          responseType: options?.responseType as "json" | "blob" | undefined,
        })
        // The control plane answers `{ "data": ... }`. Unwrap by KEY, not by
        // nullishness: `?? response.data` hands the whole envelope back whenever
        // `data` is legitimately null, and a caller expecting a list then gets
        // an object and crashes on `.filter`.
        const body: unknown = response.data
        if (body && typeof body === "object" && !Array.isArray(body) && "data" in body) {
          // `"data" in body` has already narrowed it; only the T is an assertion.
          return body.data as T
        }
        return body as T
      } catch (e) {
        throw new Error(automationsErrorMessage(e, `Could not ${method} ${path}`))
      }
    },

    /**
     * The app-integration surface, on the platform API.
     *
     * A separate method rather than a prefix inside `request` because it is a
     * different client, not a different path: this one is the console's own
     * gateway client — cookie-capable, carrying the SPA header the platform API
     * requires and the account scope it reads — while `request` above is a pure
     * bearer client pinned to a FaaS origin. Sending an integrations call down
     * that one reaches a control plane that no longer serves these routes.
     */
    async integrationsRequest<T = unknown>(
      method: "GET" | "POST" | "PUT" | "DELETE",
      path: string,
      options?: { body?: unknown; params?: Record<string, unknown>; responseType?: string },
    ): Promise<T> {
      try {
        const response: AxiosResponse<unknown> = await api.request({
          method,
          url: `${INTEGRATIONS_PREFIX}${path}`,
          data: options?.body,
          params: options?.params,
          responseType: options?.responseType as "json" | "blob" | undefined,
        })
        // The platform envelope is `{ data, meta }`. Unwrapped by KEY for the
        // same reason as above: `?? response.data` hands the whole envelope
        // back whenever `data` is legitimately null, and a caller expecting a
        // list then gets an object and crashes on `.filter`.
        //
        // A 204 (disconnect, delete) has no body at all, which is why the
        // absent-key case returns the raw body rather than throwing.
        const body: unknown = response.data
        if (body && typeof body === "object" && !Array.isArray(body) && "data" in body) {
          return body.data as T
        }
        return body as T
      } catch (e) {
        // extractError, not automationsErrorMessage: this response carries the
        // platform's `{meta:{message}}` shape, and the FaaS reader would fall
        // through to axios's own "Request failed with status code 400".
        throw new Error(extractError(e, `Could not ${method} ${path}`))
      }
    },
  }
}
