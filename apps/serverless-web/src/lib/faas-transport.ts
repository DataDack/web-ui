import { connection, http } from "@/lib/api"

import type {
  CreatedFunction,
  CreateFromSourceInput,
  FunctionAlias,
  FunctionCode,
  FunctionCodeFile,
  FunctionEntity,
  FunctionUrl,
  FunctionVersion,
  InvokeResult,
  MetricSeries,
  MetricSeriesQuery,
  PutAliasInput,
  RuntimeInfo,
  ServerlessTransport,
  Trigger,
  UpdateFunctionConfigInput,
} from "@datadack/serverless"



const fnPath = (name: string) => `/v1/functions/${encodeURIComponent(name)}`

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
    const { data } = await http.get<{ functionUrls?: FunctionUrl[] }>(
      `${fnPath(name)}/urls`,
    )
    return data.functionUrls ?? []
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

  async invokeFunction(name: string, payload: string): Promise<InvokeResult> {
    // Test through the function URL, not the control plane's invoke route.
    //
    // Invoking directly would exercise a path no real caller uses: it skips the
    // API gateway, the hostname mapping and TLS, so a function could pass here
    // and 404 for everyone on the internet. Testing what is actually published
    // is the point of the tab.
    const urls = await this.listFunctionUrls!(name)
    const live = urls.find((u) => !u.disabled)
    if (!live) {
      throw new Error(
        `${name} has no function URL, so there is nothing to call. ` +
          `A URL is minted when the function is deployed; map one explicitly if it was removed.`,
      )
    }

    const startedAt = performance.now()
    let response: Response
    try {
      response = await fetch(`https://${live.domain}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      })
    } catch (cause) {
      // fetch rejects without a status for DNS, TLS and CORS alike. CORS is by
      // far the most common of the three here — the console and the function
      // are different origins — and a bare "Failed to fetch" sends people
      // hunting the wrong problem.
      throw new Error(
        `Could not reach https://${live.domain}. The function must return ` +
          `Access-Control-Allow-Origin for the browser to read its response; ` +
          `check DNS and the certificate too. (${String(cause)})`,
      )
    }

    const durationMs = Math.round(performance.now() - startedAt)
    const body = await response.text()
    return {
      status: response.status,
      durationMs,
      body,
      contentType: response.headers.get("content-type") ?? undefined,
      functionError: response.headers.get("x-amz-function-error") ?? undefined,
    }
  },

  async listTriggers(functionName: string): Promise<Trigger[]> {
    const { data } = await http.get<{ triggers?: Trigger[] }>("/v1/triggers", {
      params: { functionName },
    })
    return data.triggers ?? []
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
