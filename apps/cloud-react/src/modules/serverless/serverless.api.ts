import { apiGet, apiPost } from "@/services/api/client"

import type {
  ActivityEvent,
  CreateFunctionFromSourceRequest,
  CreateFunctionRequest,
  PresignedUpload,
  PublishLayerRequest,
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
}
