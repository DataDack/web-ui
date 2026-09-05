import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"

import { activeScope } from "@/services/api/active-scope"
import { authToken, refreshAccessToken } from "@/services/api/auth-token"
import { serverlessOrigin } from "@/services/api/serverless-origin"

// Direct browser → FaaS control-plane client for the API Gateway section.
//
// The API Gateway control plane moved out of cloud-be-go and into the serverless
// service on 2026-09-05, so this section no longer speaks to the platform
// gateway at all. That is the whole reason this file exists: the shared gateway
// client (services/api/client.ts) is pinned to /api/v1, is cookie-oriented,
// attaches console-only headers, and unwraps the platform's {data, meta}
// envelope — every one of which is wrong for FaaS's native JSON.
//
// It is deliberately the same shape as faas.client.ts and automations.client.ts
// next to it: one axios instance, bearer + account-pin request interceptor, one
// silent refresh-and-replay on 401. Three copies rather than one shared factory
// because each surface answers in its OWN shapes and reads its OWN errors, and
// the day one of them changes is the day a shared factory grows a flag.
//
// Exactly three headers ever leave here: Authorization, X-Faas-Account-Id and
// (on a JSON body) Content-Type. The gateway client's extras — X-Screen,
// X-Device-Id, X-Language, X-Requested-With — are NOT in FaaS's CORS allow-list
// and would fail the cross-origin preflight, so they are never attached.

/** Native FaaS error body (common/core/httpx). */
interface FaasErrorBody {
  error?: {
    code?: string
    message?: string
    status?: number
    details?: { fields?: { field?: string; message?: string }[] }
  }
}

/**
 * The server's own words for a failed call.
 *
 * A validation failure carries the offending fields in `details.fields`, and
 * those are the useful half of the message: "validation failed" alone sends
 * someone hunting through a twelve-field integration form. The generic axios
 * "Request failed with status code 400" is what a user would otherwise see.
 */
export function apigwErrorMessage(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    const body = e.response?.data as FaasErrorBody | undefined
    const fields = body?.error?.details?.fields
    if (fields && fields.length > 0) {
      return fields.map((f) => f.message ?? f.field ?? "").join("; ")
    }
    if (body?.error?.message) return body.error.message
  }
  if (e instanceof Error && e.message) return e.message
  return fallback
}

/**
 * Raised when no serverless origin has been resolved for the active region.
 *
 * Thrown rather than falling back to a relative URL: a relative path would be
 * sent to the console's own origin, get the SPA's index.html back with a 200,
 * and surface as a JSON parse error that says nothing about the actual problem.
 * The pages catch this and render "not available in this region".
 */
export class NoServerlessOriginError extends Error {
  constructor() {
    super("API Gateway is not available in this region yet.")
    this.name = "NoServerlessOriginError"
  }
}

const faas = axios.create({ withCredentials: false })

faas.interceptors.request.use((config) => {
  const base = serverlessOrigin.get()
  if (base === null) throw new NoServerlessOriginError()
  config.baseURL = base
  const token = authToken.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  const accountId = activeScope.getAccountId()
  // Omitted, never sent empty: the control plane refuses a request that names
  // no account rather than defaulting one, so a blank header would read as a
  // deliberate selection of nothing.
  if (accountId) config.headers["X-Faas-Account-Id"] = accountId
  else delete config.headers["X-Faas-Account-Id"]
  return config
})

// 401 → one silent refresh, one replay, then surface. No /login redirect here:
// the gateway client owns session teardown, and a FaaS 401 after a failed
// refresh is followed by gateway 401s that trigger it. 403 is terminal.
faas.interceptors.response.use(undefined, async (error: AxiosError) => {
  const cfg = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
  if (error.response?.status === 401 && cfg && !cfg._retried) {
    cfg._retried = true
    const fresh = await refreshAccessToken()
    if (fresh) {
      cfg.headers.Authorization = `Bearer ${fresh}`
      return faas.request(cfg)
    }
  }
  throw error
})

/** Await a call; on failure re-throw the server's message as a plain Error. */
async function run<T>(work: Promise<T>, fallback: string): Promise<T> {
  try {
    return await work
  } catch (e) {
    if (e instanceof NoServerlessOriginError) throw e
    throw new Error(apigwErrorMessage(e, fallback))
  }
}

/**
 * The list envelope every collection route answers with.
 *
 * FaaS lists are keyed objects, not bare arrays — `items` plus the paging the
 * caller asked for. `items` is never null from the server, but it is typed
 * optional here because a proxy serving a cached empty body is cheaper to
 * tolerate than to debug.
 */
interface ListBody<T> {
  items?: T[]
  page?: number
  limit?: number
  total?: number
}

export const apigwHttp = {
  get: <T>(path: string, fallback: string) =>
    run(
      faas.get<T>(path).then((res) => res.data),
      fallback,
    ),

  list: <T>(path: string, fallback: string) =>
    run(
      faas.get<ListBody<T>>(path).then((res) => res.data.items ?? []),
      fallback,
    ),

  post: <T>(path: string, body: unknown, fallback: string) =>
    run(
      faas.post<T>(path, body).then((res) => res.data),
      fallback,
    ),

  put: <T>(path: string, body: unknown, fallback: string) =>
    run(
      faas.put<T>(path, body).then((res) => res.data),
      fallback,
    ),

  del: (path: string, fallback: string) =>
    run(
      faas.delete(path).then(() => undefined),
      fallback,
    ),
}
