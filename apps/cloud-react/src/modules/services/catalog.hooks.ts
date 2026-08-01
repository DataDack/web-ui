import { useQuery } from "@tanstack/react-query"

import { catalogApi, CATALOG_QUERY_KEYS } from "./catalog.api"

/** Tenant catalog for the dashboard "Sovereign Services" grid. */
export function useCatalogServices() {
  return useQuery({
    queryKey: CATALOG_QUERY_KEYS.services,
    queryFn: catalogApi.listServices,
    staleTime: 60 * 1000,
  })
}
