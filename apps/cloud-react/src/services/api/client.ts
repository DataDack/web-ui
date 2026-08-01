import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"
import i18n from "i18next"

import { activeScope } from "./active-scope"
import { authToken, refreshAccessToken } from "./auth-token"
import { getDeviceId } from "./device"
import { screenName } from "./screen"

// Real backend client (cloud-be-go):
//   • Access token  — held in memory for bearer requests and persisted by the
//     backend in an HttpOnly cookie for browser reloads.
//   • Refresh token — held in IndexedDB; used only to silently re-mint the access
//     token (on boot and on a 401) via the OAuth-style /token refresh grant.
//   • Active account — client-held scope (memory + IndexedDB), sent as X-Account-Id.

export const api = axios.create({ baseURL: "/api/v1", withCredentials: true })

/**
 * Open the billing top-up dialog in a new tab, pre-filled with `credits`.
 *
 * Always a new tab: a payment wall is an interruption, not a destination — the
 * page the user is on is mid-task (a create form, an upgrade dialog), and the
 * whole point is to come straight back to it once the wallet is funded. The
 * tab that funds it broadcasts `billing:credited`, so the original page updates
 * itself rather than the user having to reload it.
 *
 * `noopener` is not optional: without it the opened tab gets a handle on this
 * one through window.opener and can navigate it.
 *
 * Falls back to same-tab navigation when the popup is blocked — better than a
 * button that silently does nothing.
 */
export function openTopupTab(credits: number): void {
  const url = `/billing?topup=${String(Math.max(0, Math.ceil(credits)))}`
  const opened = window.open(url, "_blank", "noopener,noreferrer")
  if (!opened) window.location.assign(url)
}

// Headers attached to every request:
//   Authorization     — the in-memory access token (when signed in)
//   X-Account-Id      — active account scope; sent ONLY when an account is pinned.
//                       The id is a UUID string. Never sent empty: an empty
//                       selector parses to uuid.Nil on the backend, which
//                       silently writes tenant rows under the nil account
//                       (tenant_serial 0 → vpc-0 / vm-0). Omitting it lets
//                       account-scoped endpoints fail closed instead.
//   X-Requested-With  — marks an app XHR; the backend rejects requests without it
//                       (blocks address-bar / cross-site "direct" access)
//   X-Screen          — current UI screen name (traffic attribution)
//   X-Device-Id       — stable per-browser id
//   X-Language        — active language code
api.interceptors.request.use((config) => {
  const token = authToken.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  const accountId = activeScope.getAccountId()
  if (accountId) config.headers["X-Account-Id"] = accountId
  else delete config.headers["X-Account-Id"]
  config.headers["X-Requested-With"] = "XMLHttpRequest"
  config.headers["X-Screen"] = screenName.get()
  config.headers["X-Device-Id"] = getDeviceId()
  config.headers["X-Language"] = (i18n.resolvedLanguage ?? i18n.language) || "en"
  return config
})

// Routes exempt from the 401 refresh-and-retry: a 401 here means the credentials
// themselves are bad, so retrying with a fresh access token can't help.
const AUTH_ROUTES = [
  "/auth/users/token",
  "/auth/users/login",
  "/auth/users/register",
  "/auth/users/otp",
]

// 401 → try one silent refresh from the IndexedDB refresh token, then replay the original
// request once. A second 401 (or a request that is itself the refresh/login
// probe) means the session is truly gone: clear the token and bounce to login.
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as
      (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    const url = original?.url ?? ""
    const isAuthRoute = AUTH_ROUTES.some((route) => url.includes(route))

    if (error.response?.status === 401 && original && !original._retried && !isAuthRoute) {
      original._retried = true
      const token = await refreshAccessToken()
      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return api.request(original)
      }
      // Refresh failed — no valid session. Fall through to the redirect.
      authToken.clear()
      const { pathname } = window.location
      if (!pathname.startsWith("/login") && !pathname.startsWith("/signup")) {
        window.location.href = "/login"
      }
    }

    // 402 Payment Required → the wallet can't cover a resource charge. Open
    // the billing page with the shortfall pre-filled in the top-up dialog
    // (?topup=<amount>) instead of leaving the user on a dead-end error.
    // The 402 body carries { data: { shortfall, required, ... } }.
    //
    // In a NEW TAB, always: the page behind it is a half-finished form or a
    // dialog mid-decision, and navigating away from it throws that work
    // away to show a payment screen the user has to come back from anyway.
    if (error.response?.status === 402 && !window.location.pathname.startsWith("/billing")) {
      const body = error.response.data as
        { data?: { shortfall?: number; required?: number } } | undefined
      const amount = Math.ceil(body?.data?.shortfall ?? body?.data?.required ?? 0)
      if (amount > 0) {
        openTopupTab(amount)
      }
    }
    return Promise.reject(error)
  },
)

// Backend envelope: { data, meta }
export interface ApiMeta {
  success: boolean
  message: string
  statusCode: number
}
export interface ApiEnvelope<T> {
  data: T
  meta: ApiMeta
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await api.get<ApiEnvelope<T>>(url)
  return res.data.data
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.post<ApiEnvelope<T>>(url, body)
  return res.data.data
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.put<ApiEnvelope<T>>(url, body)
  return res.data.data
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.patch<ApiEnvelope<T>>(url, body)
  return res.data.data
}

export async function apiDelete<T = void>(url: string): Promise<T> {
  const res = await api.delete<ApiEnvelope<T>>(url)
  return res.data.data
}

/** List endpoints are paginated; pull a large page so the console shows all rows. */
export const LIST_QUERY = "?page=1&limit=100"

/** Pull the server's human-readable message off an error, else a fallback. */
export function extractError(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { meta?: { message?: string } } | undefined
    if (data?.meta?.message) return data.meta.message
  }
  return fallback
}
