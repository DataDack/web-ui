import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"

import { activeScope } from "@/services/api/active-scope"
import { ensureAccessToken, refreshAccessToken } from "@/services/api/auth-token"
import { SERVERLESS_ORIGIN } from "@/services/api/serverless-origin"

import {
  createApiGatewayTransport,
  REACHABLE_PREFIX,
  type ApiGatewayHttp,
} from "@datadack/api-gateway"

/**
 * This console's half of the API Gateway transport: how a request is
 * authorised, and nothing else.
 *
 * Every path, schema and error shape lives in @datadack/api-gateway, shared
 * with serverless-web. What differs here is only the credential: the console
 * holds a bearer token it silently refreshes and pins an account.
 *
 * It replaced ~2,500 lines of module-local client, hooks and pages. Those spoke
 * /v1/apigateway, which no longer exists: the control plane now serves one
 * surface, the apigatewayv2-compatible /v2, and the console reads it through
 * the same package a customer's Terraform reads the API through.
 *
 * Exactly three headers ever leave here: Authorization, X-Faas-Account-Id and
 * (on a JSON body) Content-Type. The gateway client's extras — X-Screen,
 * X-Device-Id, X-Language, X-Requested-With — are not in the serverless CORS
 * allow-list and would fail the cross-origin preflight.
 */

const faas = axios.create({ withCredentials: false })

faas.interceptors.request.use(async (config) => {
  // REACHABLE_PREFIX, not the bare origin: see its definition for why /v2 alone
  // reaches datadack-cloud and comes back as the console's own HTML at 200.
  config.baseURL = SERVERLESS_ORIGIN + REACHABLE_PREFIX
  // Awaited: the in-memory token is empty after a page reload, and this control
  // plane reads the Authorization header or nothing.
  const token = await ensureAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  const accountId = activeScope.getAccountId()
  // Omitted, never sent empty: the control plane refuses a request naming no
  // account rather than defaulting one, so a blank header would read as a
  // deliberate selection of nothing.
  if (accountId) config.headers["X-Faas-Account-Id"] = accountId
  else delete config.headers["X-Faas-Account-Id"]
  return config
})

// 401 → one silent refresh, one replay, then surface. No /login redirect here:
// the gateway client owns session teardown, and a serverless 401 after a failed
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

/**
 * Reports every HTTP status back to the package, including 4xx and 5xx.
 *
 * Note what this does NOT do: set `validateStatus: () => true`. That is the
 * obvious way to stop axios rejecting, and it would silently disable the
 * refresh interceptor above — a 401 that never rejects never reaches it, so the
 * session would stop renewing and every operator would be signed out at the
 * first token expiry instead of never.
 *
 * So the rejection is allowed to happen and unwrapped here instead. A rejection
 * carrying a response is a completed request the package should decode; one
 * without is a real failure — DNS, a timeout, an aborted connection, or the
 * missing-origin case above — and is rethrown.
 */
const requestApiGateway: ApiGatewayHttp = async ({ method, path, query, body }) => {
  try {
    const response = await faas.request<unknown>({
      method,
      url: path,
      params: query,
      data: body,
    })
    return { status: response.status, data: response.data, headers: response.headers }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return {
        status: error.response.status,
        data: error.response.data,
        // Axios lower-cases response header names, which is what the package
        // reads x-amzn-errortype from.
        headers: error.response.headers,
      }
    }
    throw error
  }
}

export const apiGatewayTransport = createApiGatewayTransport(requestApiGateway)
