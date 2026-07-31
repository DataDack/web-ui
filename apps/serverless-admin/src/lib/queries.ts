import { useQuery } from '@tanstack/react-query'

import {
  connection,
  fetchAuditEvents,
  fetchDashboard,
  fetchLogs,
  fetchMetricSeries,
  fetchTenants,
  type AuditQuery,
  type LogQuery,
  type MetricQuery,
} from './api'

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  tenants: ['tenants'] as const,
  logs: (query: LogQuery, scope: string) => ['logs', query, scope] as const,
  metrics: (query: MetricQuery, scope: string) => ['metrics', query, scope] as const,
  audit: (query: AuditQuery, scope: string) => ['audit', query, scope] as const,
}

/**
 * The active tenant is part of every cache key. Without it, switching accounts
 * would show the previous tenant's rows from cache until the refetch landed,
 * which in a multi-tenant console reads as a data leak even though it is stale
 * data the operator had already been shown.
 */
function scopeKey(): string {
  return `${connection.accountId()}/${connection.namespace()}`
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
