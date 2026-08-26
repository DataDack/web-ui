import { useQuery } from "@tanstack/react-query"

import { catalogApi, CATALOG_QUERY_KEYS } from "./catalog.api"
import { gateForPath } from "./catalog.gate"

/**
 * Tenant catalog — the dashboard "Sovereign Services" grid, and the route gate
 * below.
 *
 * Polled, unlike most console queries: this response decides which pages a
 * tenant can open, and the shell holds a single observer for the whole session,
 * so without an interval an operator closing a service would not reach an
 * already-open tab until it navigated home or reloaded. The response is served
 * from a per-tenant Redis entry that an admin write invalidates, so the poll
 * costs a cache hit.
 */
export function useCatalogServices() {
  return useQuery({
    queryKey: CATALOG_QUERY_KEYS.services,
    queryFn: catalogApi.listServices,
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  })
}

/**
 * Route-level maintenance gate for the console shell.
 *
 * `pending` is true only while the catalog is in flight: the shell shows a
 * skeleton rather than flashing a page it may be about to replace with the
 * maintenance notice. A failed fetch resolves to `blocked: false` — an
 * unreachable catalog must not take the whole console down.
 */
export function useServiceGate(pathname: string): { pending: boolean; blocked: boolean } {
  const { data, isLoading } = useCatalogServices()
  if (isLoading) return { pending: true, blocked: false }
  return { pending: false, blocked: gateForPath(pathname, data ?? []) === "maintenance" }
}
