import { useMemo, type ReactNode } from "react"

import { AIAutomationsProvider, type AIAutomationsTransport } from "@datadack/ai-and-automations"
import { useQuery } from "@tanstack/react-query"

import { env } from "@/env"
import { useAuth } from "@/modules/auth/auth.context"
import { useActiveRegion } from "@/modules/region/region.context"
import { apiGet } from "@/services/api/client"

import { createAutomationsTransport } from "./automations.client"

// Wires the shared @datadack/ai-and-automations components to their data source.
//
// The section is served entirely by the regional FaaS control plane — agents,
// workflows, credentials, templates, executions and app integrations are all
// routes under /v1/workflows there — so unlike the serverless section
// there is no gateway half. This provider only has to find that origin.
//
// It is found exactly the way ServerlessDataProvider finds it, and deliberately
// through the SAME endpoint map rather than a second variable: both sections
// talk to one control plane per region, and two ways to name its address is two
// ways for them to disagree.
//
//   1. VITE_SERVERLESS_API_BASE when DEFINED — "" is a valid value meaning
//      same-origin, i.e. the dev proxy in vite.config.ts.
//   2. The gateway's endpoint map, matched case-insensitively by active region,
//      falling back to the single row when only one exists.
//   3. Nothing → the section renders its unavailable state rather than firing
//      requests at a base URL it does not have.

interface ServerlessEndpoint {
  region: string
  url: string
}

const ENDPOINTS_QUERY_KEY = ["serverless", "faas-endpoints"] as const

/**
 * Drop trailing slashes so path joins never double the "/".
 *
 * A loop rather than a regex: the obvious `/\/+$/` is a repeated group against
 * an anchor, which is the shape that backtracks superlinearly, and this input
 * comes off the network.
 */
function trimBase(url: string): string {
  let end = url.length
  while (end > 0 && url[end - 1] === "/") end--
  return url.slice(0, end)
}

/**
 * The transport handed to the package when no control-plane origin is known.
 *
 * Every call fails with one sentence a person can act on, and the capability
 * flags are off so the package hides the surfaces that would dead-end. The
 * alternative — omitting the provider — throws inside every page, because the
 * package's runtime demands a transport before it renders anything.
 */
const UNREACHABLE: AIAutomationsTransport = {
  capabilities: { connectedAccounts: false, integrations: false, realtimeEvents: false },
  request: () =>
    Promise.reject(
      new Error(
        "AI & Workflows is not reachable in this region yet. If this is unexpected, check that the serverless control plane is registered for the region you are in.",
      ),
    ),
}

export function AutomationsDataProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { isAuthenticated } = useAuth()
  const { activeRegionCode } = useActiveRegion()

  const envBase = env.VITE_SERVERLESS_API_BASE

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
    // Single-origin deployments serve every region; dev's {region: "default"}
    // row lands here too.
    if (endpoints.length === 1) return trimBase(endpoints[0].url)
    return null
  }, [envBase, endpoints, activeRegionCode])

  const transport = useMemo<AIAutomationsTransport>(() => {
    if (baseUrl === null) return UNREACHABLE
    return createAutomationsTransport({ getBaseUrl: () => baseUrl })
  }, [baseUrl])

  return <AIAutomationsProvider transport={transport}>{children}</AIAutomationsProvider>
}
