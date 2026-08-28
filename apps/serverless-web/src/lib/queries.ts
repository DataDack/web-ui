import { keepPreviousData, useQuery } from "@tanstack/react-query"

import {
  connection,
  fetchAuditEvents,
  fetchDashboard,
  fetchDomains,
  fetchFleetMetrics,
  fetchLogs,
  fetchMetricSeries,
  fetchNodeMetrics,
  fetchTenants,
  fetchWorkloads,
  type AuditQuery,
  type DomainQuery,
  type LogQuery,
  type MetricQuery,
} from "./api"
import type { WorkloadKind } from "./schemas"

export const queryKeys = {
  dashboard: ["dashboard"] as const,
  tenants: ["tenants"] as const,
  logs: (query: LogQuery, scope: string) => ["logs", query, scope] as const,
  metrics: (query: MetricQuery, scope: string) => ["metrics", query, scope] as const,
  audit: (query: AuditQuery, scope: string) => ["audit", query, scope] as const,
  // NOT keyed by the active tenant: the registry listing is cross-tenant on
  // purpose, so folding the switcher's account into the key would evict a page of
  // platform-wide rows every time an operator switched tenant for another panel.
  domains: (query: DomainQuery) => ["domains", query] as const,
  // Fleet telemetry is platform-wide, never per-tenant: a node serves every
  // account, so keying it by the switcher's account would evict the whole view
  // on a switch and show nothing new.
  fleet: ["fleet-metrics"] as const,
  fleetNode: (nodeId: string) => ["fleet-metrics", nodeId] as const,
  workloads: (kind: string) => ["workloads", kind] as const,
}

/**
 * The active tenant is part of every cache key. Without it, switching accounts
 * would show the previous tenant's rows from cache until the refetch landed,
 * which in a multi-tenant console reads as a data leak even though it is stale
 * data the operator had already been shown.
 */
function scopeKey(): string {
  return `${connection.accountId()}/${connection.resourceGroup()}`
}

/**
 * One polled snapshot backs every list. `refetchInterval` matches the console's
 * 5s auto-refresh; react-query keeps the previous data on screen while a refetch
 * is in flight, so the tables never blank out between polls.
 */
export function useDashboard(autoRefresh = true) {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: fetchDashboard,
    refetchInterval: autoRefresh ? 5000 : false,
    staleTime: 2000,
  })
}

export function useTenants() {
  return useQuery({
    queryKey: queryKeys.tenants,
    queryFn: fetchTenants,
    // The tenant list changes when accounts are created, which is rare enough
    // that polling it alongside the dashboard would be pure noise.
    staleTime: 60_000,
  })
}

/**
 * The snapshot behind the log view. It seeds the pane before the stream attaches
 * and is the fallback when live tailing is off, so it does not poll: the stream
 * is what keeps the view current.
 */
export function useLogSnapshot(query: LogQuery, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.logs(query, scopeKey()),
    queryFn: () => fetchLogs(query),
    enabled,
    refetchInterval: enabled ? 5000 : false,
  })
}

export function useMetricSeries(query: MetricQuery, autoRefresh = true) {
  return useQuery({
    queryKey: queryKeys.metrics(query, scopeKey()),
    queryFn: () => fetchMetricSeries(query),
    refetchInterval: autoRefresh ? 15_000 : false,
    staleTime: 5000,
  })
}

export function useAuditEvents(query: AuditQuery, autoRefresh = true) {
  return useQuery({
    queryKey: queryKeys.audit(query, scopeKey()),
    queryFn: () => fetchAuditEvents(query),
    refetchInterval: autoRefresh ? 15_000 : false,
    staleTime: 5000,
  })
}

/**
 * The domain registry, polled.
 *
 * The interval is chosen by the DATA, not by a constant: a pending row is one
 * waiting on DNS — a custom domain's verification, or a vm name whose A record has
 * not been written — and those settle on their own within seconds to minutes. Once
 * nothing is pending there is nothing racing, and a hostname can still change from
 * outside the console (a release, a suspension), so the slow cadence stays rather
 * than stopping.
 */
export function useDomains(query: DomainQuery, autoRefresh = true) {
  return useQuery({
    queryKey: queryKeys.domains(query),
    queryFn: () => fetchDomains(query),
    placeholderData: keepPreviousData,
    // The autoRefresh switch is applied OUTSIDE the callback rather than as an
    // early `return false` inside it, so the callback always answers with a
    // number. A function that sometimes returns a boolean and sometimes a
    // duration is one every reader has to decode twice.
    refetchInterval: autoRefresh
      ? (result) =>
          result.state.data?.domains.some((domain) => domain.status === "pending") ? 5000 : 30_000
      : false,
    staleTime: 2000,
  })
}

/**
 * The cluster view, polled at the cadence the nodes report on.
 *
 * Workers sync every few seconds, so a slower poll would show an operator
 * numbers older than the ones the control plane already has. `keepPreviousData`
 * stops the table blanking between polls, which on a page whose whole purpose is
 * "is anything wrong" reads as everything having gone away.
 */
export function useFleetMetrics(autoRefresh = true) {
  return useQuery({
    queryKey: queryKeys.fleet,
    queryFn: fetchFleetMetrics,
    placeholderData: keepPreviousData,
    refetchInterval: autoRefresh ? 5000 : false,
    staleTime: 2000,
  })
}

/** One node's detail and its series. Same cadence as the list it is opened from. */
export function useNodeMetrics(nodeId: string | undefined, autoRefresh = true) {
  return useQuery({
    queryKey: queryKeys.fleetNode(nodeId ?? ""),
    queryFn: () => fetchNodeMetrics(nodeId ?? ""),
    enabled: Boolean(nodeId),
    placeholderData: keepPreviousData,
    refetchInterval: autoRefresh ? 5000 : false,
    staleTime: 2000,
  })
}

/**
 * The operator's workload listing, filtered by kind.
 *
 * Polled slowly: a workload appears when someone deploys, which is not something
 * an operator is watching for second by second, and the dashboard already
 * refreshes faster for the things that do move on their own.
 */
export function useWorkloads(kind: WorkloadKind | "all", autoRefresh = true) {
  return useQuery({
    queryKey: queryKeys.workloads(kind),
    queryFn: () => fetchWorkloads(kind === "all" ? undefined : kind),
    placeholderData: keepPreviousData,
    refetchInterval: autoRefresh ? 15_000 : false,
    staleTime: 5000,
  })
}
