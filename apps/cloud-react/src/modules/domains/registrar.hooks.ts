import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { extractError } from "@/services/api/client"

import { DOMAINS_QUERY_KEYS } from "./domains.constants"
import { registrarApi } from "./registrar.api"
import type { RegisterDomainRequest, RegisteredDomain } from "./registrar.types"

/** Query keys for the registrar, kept under the domains root so a write to
 *  either surface can invalidate both — attaching a hostname changes what the
 *  registrar's detail view shows under a domain. */
export const REGISTRAR_QUERY_KEYS = {
  all: [...DOMAINS_QUERY_KEYS.all, "registrar"] as const,
  list: () => [...REGISTRAR_QUERY_KEYS.all, "list"] as const,
  detail: (domain: string) => [...REGISTRAR_QUERY_KEYS.all, "detail", domain] as const,
}

// Poll while anything is still pending — a tenant who has just published a TXT
// record is watching this list and the background worker checks every 30s, so a
// page that only updated on reload would look broken. Stop once everything has
// settled: a verified domain does not spontaneously un-verify.
const POLL_WHILE_PENDING = 10000

function pendingIn(rows: RegisteredDomain[] | undefined): boolean {
  return rows?.some((row) => row.status === "pending") ?? false
}

export function useRegisteredDomains() {
  return useQuery({
    queryKey: REGISTRAR_QUERY_KEYS.list(),
    queryFn: () => registrarApi.list(),
    refetchInterval: (query) => (pendingIn(query.state.data) ? POLL_WHILE_PENDING : false),
  })
}

/** One registration, live while it is still pending. Pass null to keep the
 *  query dormant (the dialog is closed). */
export function useRegisteredDomain(domain: string | null) {
  return useQuery({
    queryKey: REGISTRAR_QUERY_KEYS.detail(domain ?? ""),
    queryFn: () => registrarApi.get(domain ?? ""),
    enabled: domain !== null && domain !== "",
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? POLL_WHILE_PENDING : false,
  })
}

/**
 * Register a domain. Seeds the detail cache with the created row so the dialog's
 * record step renders instantly rather than flashing a spinner for a value the
 * response already carried.
 *
 * Errors stay on the mutation for the dialog to render inline — a 409 ("somebody
 * already holds this") is the one people actually hit, and it needs to be read
 * next to the field, not in a toast that disappears.
 */
export function useRegisterDomain() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: RegisterDomainRequest) => registrarApi.create(body),
    onSuccess: (row) => {
      queryClient.setQueryData(REGISTRAR_QUERY_KEYS.detail(row.domain), row)
      void queryClient.invalidateQueries({ queryKey: REGISTRAR_QUERY_KEYS.all })
    },
  })
}

/**
 * Check the ownership record now.
 *
 * The response is the row either way — verified, or with a fresh last_error — so
 * it lands straight in the cache the dialog polls. A failed check is reported as
 * info rather than an error: the request succeeded, and "the record is not there
 * yet" is the expected answer while DNS propagates.
 */
export function useVerifyRegisteredDomain() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (domain: string) => registrarApi.verify(domain),
    onSuccess: (row) => {
      queryClient.setQueryData(REGISTRAR_QUERY_KEYS.detail(row.domain), row)
      void queryClient.invalidateQueries({ queryKey: REGISTRAR_QUERY_KEYS.all })
      if (row.status === "verified") {
        toast.success(t("domains.registrar.verified", { domain: row.domain }))
      } else {
        toast.info(row.last_error ?? t("domains.registrar.notYetVerified"))
      }
    },
    onError: (e) => toast.error(extractError(e, t("domains.registrar.verifyFailed"))),
  })
}

export function useRemoveRegisteredDomain() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (domain: string) => registrarApi.remove(domain),
    onSuccess: (_data, domain) => {
      // Drop the detail entry first, so the root invalidation below cannot
      // refetch a row the server just deleted (a guaranteed 404).
      queryClient.removeQueries({ queryKey: REGISTRAR_QUERY_KEYS.detail(domain) })
      void queryClient.invalidateQueries({ queryKey: REGISTRAR_QUERY_KEYS.all })
      toast.success(t("domains.registrar.removed", { domain }))
    },
    // 409 while hostnames are still attached, and the message names how many.
    // Surfaced verbatim: it is the one refusal here a tenant can act on.
    onError: (e) => toast.error(extractError(e, t("domains.registrar.removeFailed"))),
  })
}
