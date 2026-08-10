import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"


import { activeScope } from "@/services/api/active-scope"
import { authToken, refreshAccessToken } from "@/services/api/auth-token"

import type {
  FunctionAlias,
  FunctionCode,
  FunctionCodeFile,
  FunctionEntity,
  FunctionUrl,
  FunctionVersion,
  PutAliasInput,
  RuntimeInfo,
  ServerlessTransport,
  Trigger,
  UpdateFunctionConfigInput,
} from "@datadack/serverless"

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

// Invoke is the only call that does not live under /v1: it is the
// Lambda-compatible surface the router role serves. The old `/function/{name}`
// shorthand was removed upstream and answers 404 — which `validateStatus: () =>
// true` would have rendered as the function's own response rather than an error.
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
    | "listFunctionUrls"
    | "listVersions"
    | "listAliases"
    | "putAlias"
    | "deleteAlias"
    | "deleteFunction"
    | "invokeFunction"
    | "listTriggers"
    | "updateFunctionConfig"
    | "getFunctionCode"
    | "getFunctionCodeFile"
    | "putFunctionCodeFile"
    | "deleteFunctionCodeFile"
    | "discardFunctionCodeDraft"
    | "deployFunctionCodeDraft"
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

    // The hostnames that invoke this function. Read from FaaS directly, like
    // versions and aliases: the mapping is the control plane's, and routing to
    // it is the API gateway's job — nothing here needs the cloud gateway.
    listFunctionUrls: (name) =>
      run(
        faas
          .get<{ functionUrls?: FunctionUrl[] }>(
            `/v1/functions/${encodeURIComponent(name)}/urls`,
          )
          .then((res) => res.data.functionUrls ?? []),
        "Could not load the function URLs",
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

    // Inline code editing. The file path travels as a `path` QUERY param, not
    // a path segment — that is what the control plane's handlers read, and it
    // is the only form that survives a nested path like lib/transform.js.
    getFunctionCode: (name) =>
      run(
        faas
          .get<FunctionCode>(`/v1/functions/${encodeURIComponent(name)}/code`)
          .then((res) => res.data),
        "Could not load the function’s code",
      ),

    getFunctionCodeFile: (name, path) =>
      run(
        faas
          .get<FunctionCodeFile>(`/v1/functions/${encodeURIComponent(name)}/code/file`, {
            params: { path },
          })
          .then((res) => res.data),
        "Could not open the file",
      ),

    putFunctionCodeFile: (name, path, content) =>
      run(
        faas
          .put<FunctionCode>(
            `/v1/functions/${encodeURIComponent(name)}/code/file`,
            { content },
            { params: { path } },
          )
          .then((res) => res.data),
        "Could not save the file",
      ),

    deleteFunctionCodeFile: (name, path) =>
      run(
        faas
          .delete<FunctionCode>(`/v1/functions/${encodeURIComponent(name)}/code/file`, {
            params: { path },
          })
          .then((res) => res.data),
        "Could not delete the file",
      ),

    discardFunctionCodeDraft: (name) =>
      run(
        faas
          .post<FunctionCode>(`/v1/functions/${encodeURIComponent(name)}/code/discard`)
          .then((res) => res.data),
        "Could not discard the draft",
      ),

    // An absent digest is a legitimate unconditional deploy; sending the key
    // with an empty value would read as one too, so it is omitted entirely.
    deployFunctionCodeDraft: (name, baseSha256) =>
      run(
        faas
          .post<FunctionEntity>(
            `/v1/functions/${encodeURIComponent(name)}/code/deploy`,
            baseSha256 ? { baseSha256 } : {},
          )
          .then((res) => res.data),
        "Could not deploy the draft",
      ),

    /**
     * Test invoke — a RAW passthrough (the router role writes the function's
     * own status, headers and body verbatim), so it never throws on a non-2xx:
     * the function's error output IS the result the tester wants to show. The
     * X-Amz-* metadata headers are CORS-exposed and optional — absent fields
     * stay absent.
     */
    // Test through the function's public URL, not the platform invoke route.
    //
    // Invoking directly exercises a path no real caller uses: it skips the API
    // gateway, the hostname mapping and TLS, so a function can pass here and
    // 404 for everyone on the internet. Testing what is actually published is
    // the point.
    //
    // No auth refresh dance either — a function URL is public, so the access
    // token is irrelevant to it.
    invokeFunction: async (name, payload) => {
      const urls = await run(
        faas
          .get<{ functionUrls?: FunctionUrl[] }>(
            `/v1/functions/${encodeURIComponent(name)}/urls`,
          )
          .then((res) => res.data.functionUrls ?? []),
        "Could not look up the function URL",
      )
      const live = urls.find((u) => !u.disabled)
      if (!live) {
        throw new Error(
          `${name} has no function URL, so there is nothing to call. ` +
            `A URL is created when the function is deployed.`,
        )
      }

      const started = performance.now()
      let response: Response
      try {
        response = await fetch(`https://${live.domain}/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        })
      } catch (cause) {
        // fetch rejects without a status for DNS, TLS and CORS alike. CORS is
        // much the most likely here — the console and the function are
        // different origins — and a bare "Failed to fetch" sends people
        // hunting the wrong problem.
        throw new Error(
          `Could not reach https://${live.domain}. The function must return ` +
            `Access-Control-Allow-Origin for the browser to read its response. ` +
            `(${String(cause)})`,
        )
      }

      return {
        status: response.status,
        durationMs: Math.round(performance.now() - started),
        body: await response.text(),
        contentType: response.headers.get("content-type") ?? undefined,
        functionError: response.headers.get("x-amz-function-error") ?? undefined,
      }
    },
  }
}
