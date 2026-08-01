import { useCallback } from "react"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { authApi } from "@/modules/auth/auth.api"
import { AUTH_QUERY_KEYS } from "@/modules/auth/auth.constants"
import { activeScope, useActiveScope } from "@/services/api/active-scope"
import { extractError } from "@/services/api/client"

import { organizationsApi } from "./organizations.api"
import { ORG_QUERY_KEYS } from "./organizations.constants"
import type {
  MyOrganization,
  ProvisionOrganizationPayload,
  UpdateOrganizationPayload,
} from "./organizations.types"

// Region and resource-group selections are scoped to the active account; clear
// them when the organization changes so each re-seeds for the new org.
const SCOPED_STORAGE_KEYS = ["console-active-region", "bsc-active-rg"]

/** Organizations the signed-in user can switch between (with resolved account). */
export function useMyOrganizations() {
  return useQuery({
    queryKey: ORG_QUERY_KEYS.mine,
    queryFn: organizationsApi.listMine,
    staleTime: 60_000,
  })
}

/** A single organization's full record (name, slug, billing email, status). */
export function useOrganization(id: string | undefined) {
  return useQuery({
    queryKey: ORG_QUERY_KEYS.detail(id ?? ""),
    queryFn: () => organizationsApi.get(id ?? ""),
    enabled: !!id,
  })
}

/** Update an organization's details, refreshing both the record and the switcher. */
export function useUpdateOrganization() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateOrganizationPayload }) =>
      organizationsApi.update(id, payload),
    onSuccess: (org) => {
      queryClient.setQueryData(ORG_QUERY_KEYS.detail(org.id), org)
      // The org name surfaces in the switcher/topbar — keep them in sync.
      void queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEYS.mine })
      toast.success(t("org.settings.toasts.saved"))
    },
    onError: (err) => {
      toast.error(extractError(err, t("org.settings.toasts.saveFailed")))
    },
  })
}

/**
 * Provision a brand-new organization the caller owns, then switch the console
 * straight into it: pin its default account as X-Account-Id, drop account-scoped
 * selections, and hard-reload so every context re-bootstraps for the new org
 * (same handoff useSwitchOrganization performs).
 */
export function useCreateOrganization() {
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: ProvisionOrganizationPayload) => organizationsApi.provision(payload),
    onSuccess: (org) => {
      toast.success(t("org.switcher.created", { name: org.organization_name }))
      activeScope.set({
        accountId: org.account_id || null,
        organizationId: org.organization_id,
      })
      for (const key of SCOPED_STORAGE_KEYS) localStorage.removeItem(key)
      window.location.assign("/")
    },
    onError: (err) => {
      toast.error(extractError(err, t("org.switcher.createFailed")))
    },
  })
}

/** Update the signed-in user's own profile (display name), then refresh the session. */
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (name: string) => authApi.updateProfile(name),
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_QUERY_KEYS.session, user)
      void queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.session })
      toast.success(t("profile.toasts.saved"))
    },
    onError: (err) => {
      toast.error(extractError(err, t("profile.toasts.saveFailed")))
    },
  })
}

/**
 * The organization the console is currently scoped to. The single source of
 * truth is the server-reported active account id: match it back to its org, else
 * fall back to the home org, else the first entry. When no account is pinned the
 * backend serves the home org by default — so the home-org fallback stays in sync.
 */
export function resolveActiveOrg(
  orgs: MyOrganization[],
  activeAccountId: string | null,
): MyOrganization | null {
  if (orgs.length === 0) return null
  return (
    (activeAccountId ? orgs.find((o) => o.account_id === activeAccountId) : undefined) ??
    orgs.find((o) => o.is_home) ??
    orgs[0]
  )
}

/**
 * The switchable orgs plus the currently active one. The active scope is owned
 * by the server (dd_acct cookie): if it pointed at an account the user can no
 * longer reach (membership revoked, account transferred), the backend already
 * dropped it and reports the home org — so there is no client-side stale scope
 * to reconcile anymore.
 */
export function useActiveOrganization() {
  const { data, isLoading } = useMyOrganizations()
  const scope = useActiveScope()
  const orgs = data ?? []
  return {
    orgs,
    activeOrg: resolveActiveOrg(orgs, scope.accountId),
    isLoading,
  }
}

/**
 * Switch the console to another organization: ask the backend to pin that org's
 * resolved account as the active scope (validates membership; an empty id clears
 * it so the backend serves the home default), drop account-scoped selections,
 * and hard-reload so every context (region, resource group, IAM, billing)
 * re-bootstraps cleanly for it.
 */
export function useSwitchOrganization() {
  return useCallback((org: MyOrganization) => {
    activeScope.set({ accountId: org.account_id || null, organizationId: org.organization_id })
    for (const key of SCOPED_STORAGE_KEYS) localStorage.removeItem(key)
    window.location.assign("/")
  }, [])
}
