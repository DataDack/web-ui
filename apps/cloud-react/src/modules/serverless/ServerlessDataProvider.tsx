import { useEffect, useMemo, type ReactNode } from "react"

import { useQuery } from "@tanstack/react-query"

import { env } from "@/env"
import { useAuth } from "@/modules/auth/auth.context"
import { useActiveRegion } from "@/modules/region/region.context"
import { useResourceGroup } from "@/modules/resource-groups/resource-group.context"
import { apiGet } from "@/services/api/client"
import { serverlessOrigin } from "@/services/api/serverless-origin"

import {
  ServerlessProvider,
  type CreatedFunction,
  type CreateFromSourceInput,
  type ServerlessTransport,
} from "@datadack/serverless"

import { createFaasTransport } from "./faas.client"
import { serverlessApi } from "./serverless.api"

// Wires the shared @datadack/serverless components to their data source.
//
// Reads/aliases/invoke/config-edit go STRAIGHT to the regional FaaS control
// plane (faas.client.ts) — the gateway hop bought nothing for them. Creation
// stays on the gateway on purpose: the KYC, naming-policy and object-quota
// gates only exist there.
//
// The FaaS origin for the active region comes from (in order):
//   1. VITE_SERVERLESS_API_BASE when DEFINED — "" is a valid value meaning
//      same-origin, i.e. the dev proxy in vite.config.ts.
//   2. The gateway's endpoint map (GET /serverless/functions/endpoints, backed
//      by the serverless catalog), matched case-insensitively by the active
//      region code, falling back to the single row when only one exists.
//   3. Nothing → the direct methods are omitted from the transport, so the
//      package's capability flags hide the detail surfaces instead of
//      dead-ending them.

/** One row of the gateway's region → browser-reachable FaaS origin map. */
interface ServerlessEndpoint {
  region: string
  url: string
}

const ENDPOINTS_QUERY_KEY = ["serverless", "faas-endpoints"] as const

/** Trailing-slash-trimmed origin, so path joins never double the "/". */
function trimBase(url: string): string {
  return url.replace(/\/+$/, "")
}

export function ServerlessDataProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { isAuthenticated } = useAuth()
  const { activeRegionCode } = useActiveRegion()
  const { activeRG } = useResourceGroup()

  const envBase = env.VITE_SERVERLESS_API_BASE

  // The endpoint map only matters when no build-time override exists, and the
  // route is authenticated — never probe it logged out.
  const { data: endpoints } = useQuery({
    queryKey: ENDPOINTS_QUERY_KEY,
    queryFn: async () => {
      const data = await apiGet<{ endpoints?: ServerlessEndpoint[] }>(
        "/serverless/functions/endpoints",
      )
      return data.endpoints ?? []
    },
    staleTime: 5 * 60_000,
    enabled: envBase === undefined && isAuthenticated,
  })

  const baseUrl = useMemo<string | null>(() => {
    if (envBase !== undefined) return trimBase(envBase)
    if (!endpoints || endpoints.length === 0) return null
    const wanted = (activeRegionCode ?? "").toLowerCase()
    const match = endpoints.find((e) => e.region.toLowerCase() === wanted)
    if (match) return trimBase(match.url)
    // Single-origin deployments serve every region (the resolver's ForRegion
    // semantics) — dev's {region: "default"} fallback lands here too.
    if (endpoints.length === 1) return trimBase(endpoints[0].url)
    return null
  }, [envBase, endpoints, activeRegionCode])

  // Publish the resolved origin for the console sections that talk to FaaS
  // without going through this provider's transport — API Gateway reaches it
  // from a plain query function, which has no React context to read. This
  // provider is mounted app-wide in main.tsx, so resolving it once here is what
  // stops three sections making the same endpoint-map call.
  useEffect(() => {
    serverlessOrigin.set(baseUrl)
  }, [baseUrl])

  // One transport per resolved base (and region, which the gateway-side create
  // closes over). A region switch swaps the closure, not the axios instance.
  const transport = useMemo<ServerlessTransport>(() => {
    // Stamp the console's active resource group onto the new function. Nothing
    // else ever sets it, so without this every function is created ungrouped and
    // the group filters have nothing to offer. An explicit id on the input wins,
    // and no active group sends no field rather than an empty one.
    const createFromSource = async (input: CreateFromSourceInput): Promise<CreatedFunction> => {
      const resourceGroupId = input.resourceGroupId ?? activeRG?.id
      await serverlessApi.createFunctionFromSource(activeRegionCode, {
        ...input,
        ...(resourceGroupId ? { resourceGroupId } : {}),
      })
      return { name: input.name }
    }
    if (baseUrl === null) {
      // No reachable FaaS origin: leave the direct methods absent so the
      // capability flags hide the surfaces; the runtime catalog degrades to
      // the gateway pass-through so the create flow keeps working.
      return {
        listRuntimes: () => serverlessApi.listRuntimes(activeRegionCode),
        createFromSource,
      }
    }
    return {
      ...createFaasTransport({ getBaseUrl: () => baseUrl }),
      createFromSource,
      // Gateway-backed, like createFromSource: publishing a layer and the
      // activity feed both go through cloud-be-go, and uploads need its presign.
      // These sit here rather than in faas.client.ts because that file talks to
      // the regional control plane and these do not.
      publishLayer: async (input) => {
        await serverlessApi.publishLayer(activeRegionCode, input)
      },
      activity: () => serverlessApi.activity(),
      uploadArtifact: async (file, kind) => {
        const slot = await serverlessApi.presignUpload(activeRegionCode, {
          kind: kind ?? "functions",
          filename: file.name,
          contentType: file.type || "application/zip",
        })
        await serverlessApi.uploadArtifact(slot, file)
        return { bucket: slot.bucket, key: slot.key }
      },
    }
  }, [baseUrl, activeRegionCode, activeRG?.id])

  return <ServerlessProvider transport={transport}>{children}</ServerlessProvider>
}
