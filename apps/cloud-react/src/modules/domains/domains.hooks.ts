import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { handleQuotaGateError } from "@/modules/governance/quota-gate"
import { extractError } from "@/services/api/client"

import { domainsApi } from "./domains.api"
import { DOMAINS_QUERY_KEYS, isDomainTransitional } from "./domains.constants"
import type {
  AdminDomainListParams,
  CreateDomainRequest,
  DomainList,
  DomainListParams,
} from "./domains.types"

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

/**
 * One row, live. Polls every 5s while the row is still pending — this is what
 * drives the add-domain dialog's "waiting for DNS" line — and stops once the
 * status settles. Pass null to keep the query dormant (dialog closed).
 */
export function useDomain(hostname: string | null) {
  return useQuery({
    queryKey: DOMAINS_QUERY_KEYS.detail(hostname ?? ""),
    queryFn: () => domainsApi.get(hostname ?? ""),
    enabled: hostname !== null && hostname !== "",
    refetchInterval: (query) =>
      query.state.data && isDomainTransitional(query.state.data.status) ? 5000 : false,
  })
}

/**
 * Claim a custom hostname for a resource. Seeds the detail cache with the
 * created row so the dialog's records step renders instantly, and invalidates
 * every list so the new pending row appears (and starts the lists' fast poll).
 *
 * Errors stay on the mutation for the dialog to render inline — except the
 * quota gate, which gets its platform-standard persistent toast with the
 * request-increase deep link.
 */
export function useAddDomain() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateDomainRequest) => domainsApi.create(body),
    onSuccess: (domain) => {
      queryClient.setQueryData(DOMAINS_QUERY_KEYS.detail(domain.hostname), domain)
      void queryClient.invalidateQueries({ queryKey: DOMAINS_QUERY_KEYS.all })
    },
    onError: (e) => {
      handleQuotaGateError(e)
    },
  })
}

/**
 * Run the ownership check now instead of waiting for the next background pass.
 * The response is the enriched row either way — verified or with a fresh
 * last_error — so it lands straight in the detail cache the dialog polls.
 * The server refuses re-checks within 10s; that 4xx message is surfaced as-is.
 */
export function useVerifyDomain() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (hostname: string) => domainsApi.verify(hostname),
    onSuccess: (domain) => {
      queryClient.setQueryData(DOMAINS_QUERY_KEYS.detail(domain.hostname), domain)
      void queryClient.invalidateQueries({ queryKey: DOMAINS_QUERY_KEYS.all })
      if (domain.verification?.verified) {
        toast.success(t("domains.actions.verified", { hostname: domain.hostname }))
      } else {
        // Ran fine, still not verified — say why, so a row-menu "Verify now"
        // is never a button that silently does nothing.
        toast.info(domain.verification?.last_error ?? t("domains.actions.notYetVerified"))
      }
    },
    onError: (e) => toast.error(extractError(e, t("domains.actions.verifyFailed"))),
  })
}

export function useRemoveDomain() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (hostname: string) => domainsApi.remove(hostname),
    onSuccess: (_data, hostname) => {
      // Drop the detail entry first so the root invalidation below cannot
      // refetch a row the server just deleted (a guaranteed 404).
      queryClient.removeQueries({ queryKey: DOMAINS_QUERY_KEYS.detail(hostname) })
      void queryClient.invalidateQueries({ queryKey: DOMAINS_QUERY_KEYS.all })
      toast.success(t("domains.actions.removed", { hostname }))
    },
    onError: (e) => toast.error(extractError(e, t("domains.actions.removeFailed"))),
  })
}
