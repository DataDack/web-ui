import type {
  FunctionAlias,
  FunctionCode,
  FunctionCodeFile,
  FunctionEntity,
  FunctionUrl,
  FunctionVersion,
  LayerVersionSummary,
  MetricSeries,
  MetricSeriesQuery,
  PutAliasInput,
  RuntimeInfo,
  ServerlessTransport,
  Trigger,
  UpdateFunctionConfigInput,
} from "@datadack/serverless"
import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios"


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

// Invoke is the only call that does not live under /v1: it is the
// Lambda-compatible surface the router role serves, and it answers in AWS's
// error shape rather than the platform's, so it gets its own message reader
// below. The old `/function/{name}` shorthand was removed upstream and answers
// 404.
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
 * The message out of a failed Invoke call.
 *
 * The router writes `{"Type": "User"|"Service", "message": "..."}` (AWS's shape,
 * not the platform's `{error: {...}}`), and the invoke request defeats axios's
 * JSON parsing — so the body arrives here as an unparsed string and is decoded
 * by hand. The x-amzn-ErrorType header is the fallback: it names the class
 * (ResourceNotFoundException, TooManyRequestsException) even when the body is
 * missing or unreadable, which beats "Request failed with status code 429".
 */
function awsErrorMessage(e: unknown, fallback: string): string {
  if (!axios.isAxiosError(e)) return (e instanceof Error && e.message) || fallback
  const raw: unknown = e.response?.data
  if (typeof raw === "string" && raw !== "") {
    try {
      const body = JSON.parse(raw) as { message?: unknown; Message?: unknown }
      const message = body.message ?? body.Message
      if (typeof message === "string" && message !== "") return message
    } catch {
      // Not JSON — a proxy's HTML error page, say. Fall through to the header.
    }
  }
  const type: unknown = e.response?.headers["x-amzn-errortype"]
  if (typeof type === "string" && type !== "") return type
  return e.message || fallback
}

/**
 * X-Amz-Log-Result — the tail of the function's own logs, base64 — as text.
 *
 * `atob` yields one char per BYTE, so a log line containing anything outside
 * ASCII comes back mojibake unless those bytes are re-read as UTF-8. Undefined
 * on anything that does not decode: a garbled log tail is worth dropping, never
 * worth failing an otherwise successful invocation over.
 */
function decodeLogTail(encoded: string | undefined): string | undefined {
  if (!encoded) return undefined
  try {
    const binary = atob(encoded)
    const bytes = Uint8Array.from(binary, (char) => char.codePointAt(0) ?? 0)
    return new TextDecoder().decode(bytes)
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
    | "listFunctionUrls"
    | "createFunctionUrl"
    | "deleteFunctionUrl"
    | "listVersions"
    | "createVersion"
    | "listLayers"
    | "listAliases"
    | "putAlias"
    | "deleteAlias"
    | "deleteFunction"
    | "invokeFunction"
    | "listTriggers"
    | "putTrigger"
    | "deleteTrigger"
    | "updateFunctionConfig"
    | "getMetricSeries"
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

    // A function URL is created on request, never on deploy. The hostname is a
    // top-level resource — unique platform-wide, not under one function — so the
    // function it points at travels in the body and the domain is the delete key.
    // Only the four allowed keys: FaaS decodes with DisallowUnknownFields.
    createFunctionUrl: (name, input) =>
      run(
        faas
          .post<FunctionUrl>("/v1/function-urls", {
            functionName: name,
            // Omitted, not blank: absent means "generate one for me".
            ...(input.domain ? { domain: input.domain } : {}),
            ...(input.authType ? { authType: input.authType } : {}),
            ...(input.qualifier ? { qualifier: input.qualifier } : {}),
          })
          .then((res) => res.data),
        "Could not create the function URL",
      ),

    deleteFunctionUrl: (domain) =>
      run(
        faas.delete(`/v1/function-urls/${encodeURIComponent(domain)}`).then(() => undefined),
        "Could not release the hostname",
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

    // A deploy overwrites the working version; this is what adds one. The body
    // is omitted entirely when there is no description — FaaS decodes with
    // DisallowUnknownFields, and an empty object is as good as nothing here.
    createVersion: (name, input) =>
      run(
        faas
          .post<FunctionEntity>(
            `/v1/functions/${encodeURIComponent(name)}/versions`,
            input?.description ? { description: input.description } : undefined,
          )
          .then((res) => res.data),
        "Could not create the version",
      ),

    // The catalogue the layers picker offers. Keyed list, same shape as the
    // versions route.
    listLayers: () =>
      run(
        faas
          .get<{ layers?: LayerVersionSummary[] }>("/v1/layers")
          .then((res) => res.data.layers ?? []),
        "Could not load the layers",
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

    // Bucketed metrics for one function. Read straight from FaaS like the other
    // detail-page reads: the credential already carries faas:metrics.read (the
    // gateway mints it in the serverless internal API's scope set), so the extra
    // hop would buy nothing.
    getMetricSeries: (query: MetricSeriesQuery) =>
      run(
        faas
          .get<MetricSeries>("/v1/metrics/series", {
            params: {
              function: query.functionName,
              since: query.since,
              ...(query.step ? { step: query.step } : {}),
            },
          })
          .then((res) => res.data),
        "Could not load the metrics",
      ),

    listTriggers: (functionName) =>
      run(
        faas
          .get<{ triggers?: Trigger[] }>("/v1/triggers", { params: { functionName } })
          .then((res) => res.data.triggers ?? []),
        "Could not load the triggers",
      ),

    // 201 with the bare trigger. Named "put" upstream but it CREATES — a fresh
    // id per call, no upsert by name — which is why the console offers add and
    // remove and never an edit.
    putTrigger: (input) =>
      run(
        faas.post<Trigger>("/v1/triggers", input).then((res) => res.data),
        "Could not add the trigger",
      ),

    // 204, empty body. The control plane checks ownership before deleting, so a
    // trigger belonging to another account answers not-found rather than going.
    deleteTrigger: (id) =>
      run(
        faas.delete(`/v1/triggers/${encodeURIComponent(id)}`).then(() => undefined),
        "Could not remove the trigger",
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
     * Test invoke, through the platform's Lambda Invoke API.
     *
     * NOT the function's public URL. A URL invoke is an HTTP request, so the
     * handler receives an HTTP-shaped event — method, rawPath, headers, the
     * typed payload buried in `body` as a string. That is the right event for
     * something the internet calls, and the wrong one for a test: the whole
     * point of the tab is to hand the handler exactly the event the buffer on
     * the left contains. It also made the tab untestable for every function
     * with no URL mapped, which includes every function that is not HTTP at all.
     *
     * So this posts to POST /2015-03-31/functions/{name}/invocations — the same
     * surface an AWS SDK client uses — and the payload arrives verbatim.
     *
     * The body is a raw passthrough — `transformResponse` is defeated so what
     * the tab shows is the exact bytes the function returned, not a
     * re-serialised parse of them.
     *
     * A function that throws still answers 200 with X-Amz-Function-Error set:
     * that is a successful invocation of a failing function, and it belongs in
     * the result pane, not in the error line. Only a genuine platform failure
     * (404, 413, 429, 502, 503) rejects — deliberately through axios's default
     * validateStatus, so a lapsed token still gets the interceptor's one silent
     * refresh and replay instead of a 401 rendered as a test result.
     */
    invokeFunction: async (name, payload) => {
      const started = performance.now()
      let response: AxiosResponse<unknown>
      try {
        response = await faas.post(
          `/2015-03-31/functions/${encodeURIComponent(name)}/invocations`,
          payload,
          {
            headers: {
              "Content-Type": "application/json",
              // The last 4 KB of the function's own logs, base64 in a response
              // header. This request header and X-Amz-Log-Result are both in
              // the FaaS CORS lists, so the browser may send and read them.
              "X-Amz-Log-Type": "Tail",
            },
            // The payload is already the wire format; axios must not re-encode
            // the string, and the reply must not be JSON.parsed into an object
            // that would only be stringified again to display.
            transformRequest: [(data: unknown) => data],
            transformResponse: [(data: unknown) => data],
            responseType: "text",
          },
        )
      } catch (e) {
        throw new Error(awsErrorMessage(e, "The invocation failed"))
      }
      const durationMs = Math.round(performance.now() - started)

      const header = (key: string): string | undefined => {
        const value: unknown = response.headers[key]
        return typeof value === "string" && value !== "" ? value : undefined
      }

      return {
        status: response.status,
        durationMs,
        // 202 (Event) and 204 (DryRun) answer with no body at all.
        body: typeof response.data === "string" ? response.data : "",
        contentType: header("content-type"),
        executedVersion: header("x-amz-executed-version"),
        functionError: header("x-amz-function-error"),
        logs: decodeLogTail(header("x-amz-log-result")),
      }
    },
  }
}
