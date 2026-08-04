import { useMemo, type ReactNode } from "react"

import {
  ServerlessProvider,
  type CreatedFunction,
  type CreateFromSourceInput,
  type ServerlessTransport,
} from "@datadack/serverless"
import { useQuery } from "@tanstack/react-query"

import { env } from "@/env"
import { useAuth } from "@/modules/auth/auth.context"
import { useActiveRegion } from "@/modules/region/region.context"
import { apiGet } from "@/services/api/client"

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

  // One transport per resolved base (and region, which the gateway-side create
  // closes over). A region switch swaps the closure, not the axios instance.
  const transport = useMemo<ServerlessTransport>(() => {
    const createFromSource = async (input: CreateFromSourceInput): Promise<CreatedFunction> => {
      await serverlessApi.createFunctionFromSource(activeRegionCode, input)
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
    }
  }, [baseUrl, activeRegionCode])

  return <ServerlessProvider transport={transport}>{children}</ServerlessProvider>
}
