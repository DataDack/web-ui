import { apiDelete, apiGet } from "@/services/api/client"

import type {
  ActivityEvent,
  FunctionAlias,
  FunctionEntity,
  FunctionVersion,
  LayerVersion,
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

  activity: async (): Promise<ActivityEvent[]> => {
    // Account-scoped feed, aggregated across regions — no selector.
    const data = await apiGet<unknown>("/serverless/functions/activity")
    return Array.isArray(data) ? (data as ActivityEvent[]) : []
  },
}
