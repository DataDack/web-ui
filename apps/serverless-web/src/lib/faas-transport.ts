import { http } from "@/lib/api"

import type {
  CreatedFunction,
  CreateFromSourceInput,
  FunctionAlias,
  FunctionCode,
  FunctionCodeFile,
  FunctionEntity,
  FunctionVersion,
  InvokeResult,
  PutAliasInput,
  RuntimeInfo,
  ServerlessTransport,
  Trigger,
  UpdateFunctionConfigInput,
} from "@datadack/serverless"

/**
 * The shared serverless UI's transport, implemented over this console's `http`
 * instance — which already attaches the operator bearer token, the
 * `X-Faas-Account-Id` scope header and the configurable API base per request.
 *
 * Every method speaks the control plane's native shapes: bare objects from the
 * single-resource routes, keyed lists (`{versions: [...]}`) from the
 * collections, and a raw passthrough from the invoke path. There is no
 * envelope to unwrap here — that is the gateway console's concern, not this
 * one's.
 */

const fnPath = (name: string) => `/v1/functions/${encodeURIComponent(name)}`

/** A response header as a non-empty string, or nothing worth reporting. */
function header(headers: Record<string, unknown>, name: string): string | undefined {
  const value = headers[name]
  return typeof value === "string" && value !== "" ? value : undefined
}

/**
 * `X-Amz-Log-Result` carries the invocation's log tail base64-encoded, and the
 * bytes underneath are UTF-8 — `atob` alone would mangle anything outside
 * latin1. A header that fails to decode is dropped rather than shown garbled.
 */
function decodeLogResult(encoded: string | undefined): string | undefined {
  if (!encoded) return undefined
  try {
    const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0))
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
    // 201 with the bare deployed Function; only the name is needed to route on.
    const { data } = await http.post<{ name?: string }>("/v1/functions/source", input)
    return { name: data.name ?? input.name }
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
    const startedAt = performance.now()
    // The invoke route is a verbatim passthrough of whatever the function
    // returned: any status, any content type. A non-2xx is an answer worth
    // showing, not a transport failure, so nothing here throws on status —
    // and the body is kept as raw text rather than parsed out from under the
    // response panel.
    const response = await http.post<unknown>(`/function/${encodeURIComponent(name)}`, payload, {
      headers: { "Content-Type": "application/json" },
      responseType: "text",
      transformResponse: (raw: unknown) => raw,
      validateStatus: () => true,
    })
    const durationMs = Math.round(performance.now() - startedAt)
    const headers = response.headers as Record<string, unknown>
    return {
      status: response.status,
      durationMs,
      body: typeof response.data === "string" ? response.data : "",
      contentType: header(headers, "content-type"),
      executedVersion: header(headers, "x-amz-executed-version"),
      functionError: header(headers, "x-amz-function-error"),
      logs: decodeLogResult(header(headers, "x-amz-log-result")),
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
