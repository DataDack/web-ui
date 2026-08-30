import { api, apiDelete, apiGet, apiPost } from "@/services/api/client"

import type {
  ActivityEvent,
  CreateFunctionFromSourceRequest,
  CreateFunctionRequest,
  FunctionAlias,
  FunctionEntity,
  FunctionVersion,
  InvokeResult,
  LayerVersion,
  PresignedUpload,
  PublishLayerRequest,
  PutAliasRequest,
  RuntimeInfo,
} from "./serverless.types"

// cloud-be-go: app "serverless" — a guarded pass-through to the regional FaaS
// control plane's native API, so response bodies are the FaaS service's own
// JSON inside the platform envelope.
//
// Every call carries ?region=<the console's active region selection>: the
// gateway resolves it to that region's FaaS endpoint dynamically (platform
// catalog), so the region is never deployment config on either side.
//
//   Functions: GET/POST /functions · GET/DELETE /functions/:name
//              GET /functions/:name/versions · GET/POST /functions/:name/aliases
//              POST /functions/:name/invoke · GET /functions/logs
//              GET /functions/metrics/series · GET /functions/activity
//   Layers:    GET/POST /layers · GET /layers/:name/versions
//              POST /layers/uploads/presign

/** Appends the region selector; omitted when the console has none yet. */
function withRegion(path: string, region: string | null): string {
  if (!region) return path
  return `${path}${path.includes("?") ? "&" : "?"}region=${encodeURIComponent(region)}`
}

/**
 * The FaaS API wraps each list in a keyed object ({"functions": [...]}).
 * Unwrap by key, tolerating both a bare array and a missing key so a
 * control-plane version drift degrades to an empty list, not a crash.
 */
function pickList<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[]
  const value = (data as Record<string, unknown> | null)?.[key]
  return Array.isArray(value) ? (value as T[]) : []
}

export const serverlessApi = {
  listFunctions: async (region: string | null): Promise<FunctionEntity[]> =>
    pickList(await apiGet<unknown>(withRegion("/serverless/functions", region)), "functions"),

  getFunction: async (region: string | null, name: string): Promise<FunctionEntity> => {
    const data = await apiGet<Record<string, unknown>>(
      withRegion(`/serverless/functions/${encodeURIComponent(name)}`, region),
    )
    // Tolerate both a bare object and a {"function": {...}} wrapper.
    return (data.function ?? data) as unknown as FunctionEntity
  },

  deleteFunction: (region: string | null, name: string) =>
    apiDelete<unknown>(withRegion(`/serverless/functions/${encodeURIComponent(name)}`, region)),

  listVersions: async (region: string | null, name: string): Promise<FunctionVersion[]> =>
    pickList(
      await apiGet<unknown>(
        withRegion(`/serverless/functions/${encodeURIComponent(name)}/versions`, region),
      ),
      "versions",
    ),

  listAliases: async (region: string | null, name: string): Promise<FunctionAlias[]> =>
    pickList(
      await apiGet<unknown>(
        withRegion(`/serverless/functions/${encodeURIComponent(name)}/aliases`, region),
      ),
      "aliases",
    ),

  listLayers: async (region: string | null): Promise<LayerVersion[]> =>
    pickList(await apiGet<unknown>(withRegion("/serverless/layers", region)), "layers"),

  // Version-scoped: there is no "delete the layer". Removing every version of a
  // layer that deployed functions reference would be one click, and the caller
  // would not see which functions it had just broken.
  deleteLayerVersion: (region: string | null, name: string, version: number) =>
    apiDelete<unknown>(
      withRegion(
        `/serverless/layers/${encodeURIComponent(name)}/versions/${String(version)}`,
        region,
      ),
    ),

  activity: async (): Promise<ActivityEvent[]> => {
    // Account-scoped feed, aggregated across regions — no selector.
    const data = await apiGet<unknown>("/serverless/functions/activity")
    return Array.isArray(data) ? (data as ActivityEvent[]) : []
  },

  listRuntimes: async (region: string | null): Promise<RuntimeInfo[]> =>
    pickList(
      await apiGet<unknown>(withRegion("/serverless/functions/runtimes", region)),
      "runtimes",
    ),

  createFunction: (region: string | null, body: CreateFunctionRequest) =>
    apiPost<unknown>(withRegion("/serverless/functions", region), body),

  createFunctionFromSource: (region: string | null, body: CreateFunctionFromSourceRequest) =>
    apiPost<unknown>(withRegion("/serverless/functions/source", region), body),

  publishLayer: (region: string | null, body: PublishLayerRequest) =>
    apiPost<unknown>(withRegion("/serverless/layers", region), body),

  putAlias: (region: string | null, fn: string, body: PutAliasRequest) =>
    apiPost<unknown>(
      withRegion(`/serverless/functions/${encodeURIComponent(fn)}/aliases`, region),
      body,
    ),

  deleteAlias: (region: string | null, fn: string, alias: string) =>
    apiDelete<unknown>(
      withRegion(
        `/serverless/functions/${encodeURIComponent(fn)}/aliases/${encodeURIComponent(alias)}`,
        region,
      ),
    ),

  /**
   * Two-step artifact upload: the gateway presigns a PUT slot in the FaaS
   * object store, then the browser uploads the archive straight there — the
   * zip bytes never pass through the platform backend.
   */
  presignUpload: (
    region: string | null,
    req: { kind: string; filename: string; contentType: string },
  ) => apiPost<PresignedUpload>(withRegion("/serverless/layers/uploads/presign", region), req),

  uploadArtifact: async (slot: PresignedUpload, file: File): Promise<void> => {
    const res = await fetch(slot.url, {
      method: slot.method || "PUT",
      headers: { "Content-Type": file.type || "application/zip", ...slot.headers },
      body: file,
    })
    if (!res.ok) throw new Error(`artifact upload failed (${String(res.status)})`)
  },

  /**
   * Test invoke — a RAW passthrough on the gateway (functions answer in any
   * media type), so this rides the axios instance directly instead of the
   * envelope helpers, and never throws on a non-2xx: the function's own
   * error output IS the result the tester wants to show.
   */
  invoke: async (region: string | null, fn: string, payload: string): Promise<InvokeResult> => {
    const started = performance.now()
    const res = await api.post<string>(
      withRegion(`/serverless/functions/${encodeURIComponent(fn)}/invoke`, region),
      payload,
      {
        headers: { "Content-Type": "application/json" },
        responseType: "text",
        transformResponse: [(data: string) => data],
        validateStatus: () => true,
      },
    )
    const contentType: unknown = res.headers["content-type"]
    return {
      status: res.status,
      contentType: typeof contentType === "string" ? contentType : "",
      body: res.data,
      durationMs: Math.round(performance.now() - started),
    }
  },
}
