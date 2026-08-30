import axios, { type AxiosResponse } from "axios"

import { connection, http } from "@/lib/api"

import type {
  CreatedFunction,
  CreateFromSourceInput,
  CreateFunctionUrlInput,
  CreateVersionInput,
  FunctionAlias,
  FunctionCode,
  FunctionCodeFile,
  FunctionEntity,
  FunctionUrl,
  FunctionVersion,
  InvokeResult,
  LayerVersionSummary,
  MetricSeries,
  MetricSeriesQuery,
  PutAliasInput,
  PutTriggerInput,
  RuntimeInfo,
  ServerlessTransport,
  Trigger,
  UpdateFunctionConfigInput,
} from "@datadack/serverless"

const fnPath = (name: string) => `/v1/functions/${encodeURIComponent(name)}`

/**
 * The message out of a failed Invoke call.
 *
 * The Lambda route answers in AWS's shape — `{"Type": "User"|"Service",
 * "message": "..."}` — not the control plane's `{error: {...}}` envelope, so
 * `apiErrorMessage` cannot read it. The body also arrives unparsed, because the
 * invoke request defeats axios's JSON transform to keep the function's own
 * output verbatim. The x-amzn-ErrorType header is the fallback: it names the
 * class even when the body is missing, which beats "Request failed with status
 * code 429".
 */
function invokeErrorMessage(err: unknown): string {
  if (!axios.isAxiosError(err)) return err instanceof Error ? err.message : String(err)
  const raw: unknown = err.response?.data
  if (typeof raw === "string" && raw !== "") {
    try {
      const body = JSON.parse(raw) as { message?: unknown; Message?: unknown }
      const message = body.message ?? body.Message
      if (typeof message === "string" && message !== "") return message
    } catch {
      // Not JSON — a proxy's HTML error page, say. Fall through to the header.
    }
  }
  const type: unknown = err.response?.headers["x-amzn-errortype"]
  if (typeof type === "string" && type !== "") return type
  return err.message
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

export const faasTransport: ServerlessTransport = {
  async listRuntimes(): Promise<RuntimeInfo[]> {
    const { data } = await http.get<{ runtimes?: RuntimeInfo[] }>("/v1/runtimes")
    return data.runtimes ?? []
  },

  async createFromSource(input: CreateFromSourceInput): Promise<CreatedFunction> {
    // File the function under whichever group the scope switcher has selected,
    // so creating while scoped to a group does not immediately hide the result
    // from the filter that was active when you created it. The key is omitted
    // when there is no selection — the control plane rejects unknown fields but
    // reads an absent one as "no group".
    const resourceGroupId = input.resourceGroupId ?? connection.resourceGroup()
    // 201 with the bare deployed Function; only the name is needed to route on.
    const { data } = await http.post<{ name?: string }>("/v1/functions/source", {
      ...input,
      ...(resourceGroupId ? { resourceGroupId } : {}),
    })
    return { name: data.name ?? input.name }
  },

  async listFunctionUrls(name: string): Promise<FunctionUrl[]> {
    const { data } = await http.get<{ functionUrls?: FunctionUrl[] }>(`${fnPath(name)}/urls`)
    return data.functionUrls ?? []
  },

  async createFunctionUrl(name: string, input: CreateFunctionUrlInput): Promise<FunctionUrl> {
    // Keyed by function name in the body, not the path: a hostname is a
    // top-level resource here (/v1/function-urls), because it is unique across
    // the platform rather than under one function.
    const { data } = await http.post<FunctionUrl>("/v1/function-urls", {
      functionName: name,
      ...(input.domain ? { domain: input.domain } : {}),
      ...(input.authType ? { authType: input.authType } : {}),
      ...(input.qualifier ? { qualifier: input.qualifier } : {}),
    })
    return data
  },

  async deleteFunctionUrl(domain: string): Promise<void> {
    await http.delete(`/v1/function-urls/${encodeURIComponent(domain)}`)
  },

  async getFunction(name: string): Promise<FunctionEntity> {
    // A bare `platform.Function` — the native route has no wrapper key.
    const { data } = await http.get<FunctionEntity>(fnPath(name))
    return data
  },

  async listVersions(name: string): Promise<FunctionVersion[]> {
    const { data } = await http.get<{ versions?: FunctionVersion[] }>(`${fnPath(name)}/versions`)
    return data.versions ?? []
  },

  // Deploys overwrite the working version, so this is the only thing that grows
  // the version list. An absent description sends no body at all.
  async createVersion(name: string, input?: CreateVersionInput): Promise<FunctionEntity> {
    const { data } = await http.post<FunctionEntity>(
      `${fnPath(name)}/versions`,
      input?.description ? { description: input.description } : undefined,
    )
    return data
  },

  // Tags live in their own store. NOT the function's `labels`, which are the
  // OpenFaaS surface — the two are different APIs over the same shape, and the
  // console used to edit labels while calling them tags.
  async listTags(name: string): Promise<Record<string, string>> {
    const { data } = await http.get<{ tags?: Record<string, string> }>(`${fnPath(name)}/tags`)
    return data.tags ?? {}
  },

  // Merges. Two tools tagging one function must not delete each other's keys.
  async putTags(name: string, tags: Record<string, string>): Promise<void> {
    await http.put(`${fnPath(name)}/tags`, { tags })
  },

  // Keys in the query string: a DELETE body is not reliably carried by every
  // proxy between here and the control plane.
  async deleteTags(name: string, keys: string[]): Promise<void> {
    await http.delete(`${fnPath(name)}/tags`, { params: { keys: keys.join(",") } })
  },

  async deleteLayerVersion(name: string, version: number): Promise<void> {
    await http.delete(`/v1/layers/${encodeURIComponent(name)}/versions/${String(version)}`)
  },

  async listLayers(): Promise<LayerVersionSummary[]> {
    const { data } = await http.get<{ layers?: LayerVersionSummary[] }>("/v1/layers")
    return data.layers ?? []
  },

  async listAliases(name: string): Promise<FunctionAlias[]> {
    const { data } = await http.get<{ aliases?: FunctionAlias[] }>(`${fnPath(name)}/aliases`)
    return data.aliases ?? []
  },

  async putAlias(name: string, input: PutAliasInput): Promise<FunctionAlias> {
    // The control plane decodes alias bodies with DisallowUnknownFields, so
    // this sends exactly the accepted keys and nothing else — `functionName`
    // and `accountId` are filled server-side from the path and the credential.
    const body: PutAliasInput = {
      name: input.name,
      functionVersion: input.functionVersion,
    }
    if (input.description !== undefined) body.description = input.description
    if (input.additionalVersionWeights !== undefined) {
      body.additionalVersionWeights = input.additionalVersionWeights
    }
    const { data } = await http.post<FunctionAlias>(`${fnPath(name)}/aliases`, body)
    return data
  },

  async deleteAlias(name: string, alias: string): Promise<void> {
    // 204, empty body.
    await http.delete(`${fnPath(name)}/aliases/${encodeURIComponent(alias)}`)
  },

  async deleteFunction(name: string): Promise<void> {
    // 204, empty body.
    await http.delete(fnPath(name))
  },

  /**
   * Test invoke, through the control plane's Lambda Invoke API.
   *
   * NOT the function URL. A URL invoke is an HTTP request, so the handler
   * receives an HTTP-shaped event — method, rawPath, headers, and the typed
   * payload buried inside `body` as a string. That is the right event for
   * something the internet calls and the wrong one for a test, whose entire
   * point is to hand the handler exactly the event in the editor. It also left
   * the tab unusable for every function with no URL mapped, which is every
   * function that is not HTTP-triggered at all.
   *
   * The body is a raw passthrough — axios's JSON transforms are defeated in
   * both directions, so the payload goes out verbatim and the reply is shown as
   * the bytes the function returned. A function that throws still answers 200
   * with X-Amz-Function-Error: a successful invocation of a failing function,
   * which belongs in the result pane. Only a platform failure (404, 413, 429,
   * 502, 503) rejects, re-thrown carrying the message the control plane sent.
   */
  async invokeFunction(name: string, payload: string): Promise<InvokeResult> {
    const startedAt = performance.now()
    let response: AxiosResponse<unknown>
    try {
      response = await http.post<unknown>(
        `/2015-03-31/functions/${encodeURIComponent(name)}/invocations`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            // The last 4 KB of the function's own logs, base64 in the
            // X-Amz-Log-Result response header.
            "X-Amz-Log-Type": "Tail",
          },
          transformRequest: [(data: unknown) => data],
          transformResponse: [(data: unknown) => data],
          responseType: "text",
        },
      )
    } catch (err) {
      throw new Error(invokeErrorMessage(err))
    }
    const durationMs = Math.round(performance.now() - startedAt)

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

  async listTriggers(functionName: string): Promise<Trigger[]> {
    const { data } = await http.get<{ triggers?: Trigger[] }>("/v1/triggers", {
      params: { functionName },
    })
    return data.triggers ?? []
  },

  /**
   * Add a trigger. 201 with the bare trigger.
   *
   * Named "put" upstream but it CREATES — `PutTrigger` mints a fresh id per
   * call rather than upserting by name — so sending the same schedule twice
   * leaves the function running twice as often. The console offers add and
   * remove for that reason, never an edit.
   */
  async putTrigger(input: PutTriggerInput): Promise<Trigger> {
    const { data } = await http.post<Trigger>("/v1/triggers", input)
    return data
  },

  async deleteTrigger(id: string): Promise<void> {
    // 204, empty body. Ownership is checked before the delete upstream, so a
    // trigger belonging to another tenant answers not-found rather than going.
    await http.delete(`/v1/triggers/${encodeURIComponent(id)}`)
  },

  async updateFunctionConfig(
    name: string,
    patch: UpdateFunctionConfigInput,
  ): Promise<FunctionEntity> {
    // PATCH is field-supplied-only and rejects unknown keys. The caller sends
    // nothing but changed fields, and JSON serialisation drops the `undefined`
    // ones, so the patch goes over the wire as-is.
    const { data } = await http.patch<FunctionEntity>(fnPath(name), patch)
    return data
  },

  async getMetricSeries(query: MetricSeriesQuery): Promise<MetricSeries> {
    // The same bucketed series the Metrics page charts, narrowed to one
    // function. Scoped to the selected resource group like every other read
    // here, so a group-scoped session does not chart a function it cannot see.
    const params: Record<string, string> = {
      function: query.functionName,
      since: query.since,
    }
    if (query.step) params.step = query.step
    const resourceGroupId = connection.resourceGroup()
    if (resourceGroupId) params.resourceGroupId = resourceGroupId

    const { data } = await http.get<MetricSeries>("/v1/metrics/series", { params })
    return data
  },

  // Inline code editing. The file path travels as a `path` QUERY param, not a
  // path segment — that is what the control plane's handlers read, and it is
  // the only form that survives a nested path like lib/transform.js.

  async getFunctionCode(name: string): Promise<FunctionCode> {
    const { data } = await http.get<FunctionCode>(`${fnPath(name)}/code`)
    return data
  },

  async getFunctionCodeFile(name: string, path: string): Promise<FunctionCodeFile> {
    const { data } = await http.get<FunctionCodeFile>(`${fnPath(name)}/code/file`, {
      params: { path },
    })
    return data
  },

  async putFunctionCodeFile(name: string, path: string, content: string): Promise<FunctionCode> {
    const { data } = await http.put<FunctionCode>(
      `${fnPath(name)}/code/file`,
      { content },
      { params: { path } },
    )
    return data
  },

  async deleteFunctionCodeFile(name: string, path: string): Promise<FunctionCode> {
    const { data } = await http.delete<FunctionCode>(`${fnPath(name)}/code/file`, {
      params: { path },
    })
    return data
  },

  async discardFunctionCodeDraft(name: string): Promise<FunctionCode> {
    const { data } = await http.post<FunctionCode>(`${fnPath(name)}/code/discard`)
    return data
  },

  /**
   * Publishing the draft. An absent digest is a legitimate unconditional
   * deploy, so the key is omitted rather than sent empty — the control plane
   * treats an empty string as "no compare-and-swap" too, but omitting it says
   * so without relying on that.
   */
  async deployFunctionCodeDraft(name: string, baseSha256?: string): Promise<FunctionEntity> {
    const { data } = await http.post<FunctionEntity>(
      `${fnPath(name)}/code/deploy`,
      baseSha256 ? { baseSha256 } : {},
    )
    return data
  },
}
