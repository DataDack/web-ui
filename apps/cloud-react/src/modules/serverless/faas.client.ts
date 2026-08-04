import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"

import type {
  FunctionAlias,
  FunctionEntity,
  FunctionVersion,
  InvokeResult,
  PutAliasInput,
  RuntimeInfo,
  ServerlessTransport,
  Trigger,
  UpdateFunctionConfigInput,
} from "@datadack/serverless"

import { activeScope } from "@/services/api/active-scope"
import { authToken, refreshAccessToken } from "@/services/api/auth-token"

// Direct browser → FaaS control-plane client. This is NOT the gateway client
// (services/api/client.ts): that one is pinned to /api/v1, cookie-oriented,
// attaches console-only headers and unwraps the platform {data, meta} envelope —
// all wrong for FaaS's native JSON. This client speaks the FaaS service's own
// shapes: bare objects on GET/PATCH, keyed lists ({"versions": [...]}) on
// listings, 204-empty on deletes, and a raw passthrough on invoke.
//
// Errors come back as { "error": { code, message, status } } (httpx.WriteError);
// each method re-throws a plain Error carrying that message so the shared
// package components — which only ever read `e.message` — show the server's
// words instead of axios's generic "Request failed with status code N".

/** Native FaaS error body (common/core/httpx). */
interface FaasErrorBody {
  error?: { code?: string; message?: string; status?: number }
}

/** Pull the FaaS error message off a failed call, else a fallback. */
export function faasErrorMessage(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    const body = e.response?.data as FaasErrorBody | undefined
    if (body?.error?.message) return body.error.message
  }
  return fallback
}

/**
 * X-Amz-Log-Result is base64(UTF-8 log tail). atob yields latin1 code units,
 * so decode the bytes properly; undecodable input is returned raw rather than
 * dropped — a mangled log tail beats no log tail.
 */
function decodeLogResult(value: string): string {
  try {
    const bin = atob(value)
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
  } catch {
    return value
  }
}

/** Read an axios response header, tolerating axios's loose header typing. */
function headerString(headers: Record<string, unknown>, name: string): string | undefined {
  const value: unknown = headers[name]
  return typeof value === "string" && value !== "" ? value : undefined
}

/**
 * The invoke passthrough fulfils every status (validateStatus true), which also
 * swallows the FaaS auth middleware's own 401 — the 401-refresh interceptor
 * only sees rejections, so the platform's auth failure would render in the Test
 * tab as the function's execution result. This sniffs a 401 body for the
 * platform's {error:{message}} envelope so invokeFunction can refresh and
 * replay explicitly; a function that itself answers 401 with its own body shape
 * is left alone and shown verbatim.
 */
function platformAuthError(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined
  try {
    const body = JSON.parse(raw) as FaasErrorBody
    return typeof body.error?.message === "string" ? body.error.message : undefined
  } catch {
    return undefined
  }
}

export interface FaasTransportOptions {
  /**
   * The FaaS origin for the active region ("" = same-origin → dev proxy).
   * Read per request, so a region switch needs a new closure, not a new
   * axios instance.
   */
  getBaseUrl: () => string
  /** Tenant selector; defaults to the console's active account scope. */
  getAccountId?: () => string | null
  /** Bearer credential; defaults to the in-memory access token. */
  getToken?: () => string | null
}

/** The direct-FaaS slice of the transport; create/upload stay on the gateway. */
export type FaasDirectTransport = Required<
  Pick<
    ServerlessTransport,
    | "listRuntimes"
    | "getFunction"
    | "listVersions"
    | "listAliases"
    | "putAlias"
    | "deleteAlias"
    | "deleteFunction"
    | "invokeFunction"
    | "listTriggers"
    | "updateFunctionConfig"
  >
>

export function createFaasTransport(opts: FaasTransportOptions): FaasDirectTransport {
  const getToken = opts.getToken ?? authToken.get
  const getAccountId = opts.getAccountId ?? activeScope.getAccountId

  // Never cookies: the access cookie is SameSite=Lax + HttpOnly, and FaaS CORS
  // deliberately has no Allow-Credentials — this is a pure bearer path.
  const faas = axios.create({ withCredentials: false })

  // Exactly three headers ever leave here: Authorization, X-Faas-Account-Id and
  // (on JSON bodies) Content-Type. The gateway client's extras — X-Screen,
  // X-Device-Id, X-Language, X-Requested-With — are NOT in FaaS's CORS
  // allow-list and would fail the cross-origin preflight, so they are never
  // attached. The account header is omitted (not sent empty) when no account
  // is pinned, mirroring the gateway client's fail-closed rationale.
  faas.interceptors.request.use((config) => {
    config.baseURL = opts.getBaseUrl()
    const token = getToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    const accountId = getAccountId()
    if (accountId) config.headers["X-Faas-Account-Id"] = accountId
    else delete config.headers["X-Faas-Account-Id"]
    return config
  })

  // 401 → one silent refresh (single-flight inside refreshAccessToken), one
  // replay, then surface the error. No /login redirect here: the gateway
  // client owns session teardown — a FaaS 401 after a failed refresh is
  // followed by gateway 401s that trigger it. 403 is terminal (scope/KYC
  // denial), never retried.
  faas.interceptors.response.use(undefined, async (error: AxiosError) => {
    const cfg = error.config as
      (InternalAxiosRequestConfig & { _faasRetried?: boolean }) | undefined
    if (error.response?.status === 401 && cfg && !cfg._faasRetried) {
      cfg._faasRetried = true
      const fresh = await refreshAccessToken()
      if (fresh) {
        cfg.headers.Authorization = `Bearer ${fresh}`
        return faas.request(cfg)
      }
    }
    throw error
  })

  /** Await the call; on failure re-throw the FaaS message as a plain Error. */
  const run = async <T>(work: Promise<T>, fallback: string): Promise<T> => {
    try {
      return await work
    } catch (e) {
      throw new Error(faasErrorMessage(e, fallback))
    }
  }

  return {
    listRuntimes: () =>
      run(
        faas
          .get<{ runtimes?: RuntimeInfo[] }>("/v1/runtimes")
          .then((res) => res.data.runtimes ?? []),
        "Could not load the runtime catalog",
      ),

    // Bare platform.Function object — no {"function": ...} wrapper natively.
    getFunction: (name) =>
      run(
        faas
          .get<FunctionEntity>(`/v1/functions/${encodeURIComponent(name)}`)
          .then((res) => res.data),
        "Could not load the function",
      ),

    listVersions: (name) =>
      run(
        faas
          .get<{ versions?: FunctionVersion[] }>(
            `/v1/functions/${encodeURIComponent(name)}/versions`,
          )
          .then((res) => res.data.versions ?? []),
        "Could not load the versions",
      ),

    listAliases: (name) =>
      run(
        faas
          .get<{ aliases?: FunctionAlias[] }>(
            `/v1/functions/${encodeURIComponent(name)}/aliases`,
          )
          .then((res) => res.data.aliases ?? []),
        "Could not load the aliases",
      ),

    // Only the four allowed keys: FaaS decodes with DisallowUnknownFields, so
    // any extra key (accountId, functionName, ...) is a 400. The server fills
    // accountId and the function name from the request context/path.
    putAlias: (name, input) => {
      const body: PutAliasInput = { name: input.name, functionVersion: input.functionVersion }
      if (input.description !== undefined) body.description = input.description
      if (input.additionalVersionWeights !== undefined) {
        body.additionalVersionWeights = input.additionalVersionWeights
      }
      return run(
        faas
          .post<FunctionAlias>(`/v1/functions/${encodeURIComponent(name)}/aliases`, body)
          .then((res) => res.data),
        "Could not save the alias",
      )
    },

    deleteAlias: (name, alias) =>
      run(
        faas
          .delete(
            `/v1/functions/${encodeURIComponent(name)}/aliases/${encodeURIComponent(alias)}`,
          )
          .then(() => undefined),
        "Could not delete the alias",
      ),

    deleteFunction: (name) =>
      run(
        faas.delete(`/v1/functions/${encodeURIComponent(name)}`).then(() => undefined),
        "Could not delete the function",
      ),

    // In-place PATCH; no version mint. Send only the supplied keys — axios
    // drops undefined values on serialization, and unknown keys are a 400.
    updateFunctionConfig: (name, patch: UpdateFunctionConfigInput) =>
      run(
        faas
          .patch<FunctionEntity>(`/v1/functions/${encodeURIComponent(name)}`, patch)
          .then((res) => res.data),
        "Could not save the configuration",
      ),

    listTriggers: (functionName) =>
      run(
        faas
          .get<{ triggers?: Trigger[] }>("/v1/triggers", { params: { functionName } })
          .then((res) => res.data.triggers ?? []),
        "Could not load the triggers",
      ),

    /**
     * Test invoke — a RAW passthrough (the router role writes the function's
     * own status, headers and body verbatim), so it never throws on a non-2xx:
     * the function's error output IS the result the tester wants to show. The
     * X-Amz-* metadata headers are CORS-exposed and optional — absent fields
     * stay absent.
     */
    invokeFunction: async (name, payload) => {
      let started = performance.now()
      const invoke = () =>
        run(
          faas.post<string>(`/function/${encodeURIComponent(name)}`, payload, {
            headers: { "Content-Type": "application/json" },
            responseType: "text",
            transformResponse: [(data: string) => data],
            validateStatus: () => true,
          }),
          "Invoke did not reach the platform",
        )
      let res = await invoke()
      // validateStatus keeps the 401-refresh interceptor from ever seeing an
      // expired-token rejection here, so handle it in-line: refresh once (the
      // request interceptor re-reads the token store) and replay. If refresh
      // fails or the replay still 401s, throw the platform's message — an auth
      // failure must not impersonate the function's own result.
      const authError = res.status === 401 ? platformAuthError(res.data) : undefined
      if (authError) {
        const fresh = await refreshAccessToken()
        started = performance.now() // time the replay, not the refresh
        const replayed = fresh ? await invoke() : undefined
        const replayError =
          replayed && replayed.status === 401 ? platformAuthError(replayed.data) : undefined
        if (!replayed || replayError) throw new Error(replayError ?? authError)
        res = replayed
      }
      const headers = res.headers as Record<string, unknown>
      const logResult = headerString(headers, "x-amz-log-result")
      const result: InvokeResult = {
        status: res.status,
        durationMs: Math.round(performance.now() - started),
        body: res.data,
        contentType: headerString(headers, "content-type"),
        executedVersion: headerString(headers, "x-amz-executed-version"),
        functionError: headerString(headers, "x-amz-function-error"),
      }
      if (logResult) result.logs = decodeLogResult(logResult)
      return result
    },
  }
}
