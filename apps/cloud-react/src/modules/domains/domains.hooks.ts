import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { domainsApi } from "./domains.api"
import { DOMAINS_QUERY_KEYS, isDomainTransitional } from "./domains.constants"
import type { AdminDomainListParams, DomainList, DomainListParams } from "./domains.types"

// Poll fast while any row is still pending (DNS/routing being realized), and
// keep a slow background cadence otherwise — registry rows can change from
// outside the console (suspension, release), so the list never goes fully
// stale on screen.
const refetchInterval = (data: DomainList | undefined) =>
  data?.rows.some((domain) => isDomainTransitional(domain.status)) ? 5000 : 30000

// Every filter/page combination is its own cache entry; placeholderData keeps
// the previous rows on screen while the next request is in flight, so paging
// and filtering never blank the table.
export function useDomains(params: DomainListParams) {
  return useQuery({
    queryKey: DOMAINS_QUERY_KEYS.list(params),
    queryFn: () => domainsApi.list(params),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => refetchInterval(query.state.data),
  })
}

export function useAdminDomains(params: AdminDomainListParams) {
  return useQuery({
    queryKey: DOMAINS_QUERY_KEYS.admin(params),
    queryFn: () => domainsApi.adminList(params),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => refetchInterval(query.state.data),
  })
}
