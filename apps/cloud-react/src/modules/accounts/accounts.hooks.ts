import { useCallback, useEffect } from "react"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { handleQuotaGateError } from "@/modules/governance/quota-gate"
import { activeScope, useActiveScope } from "@/services/api/active-scope"
import { extractError } from "@/services/api/client"

import { accountsApi } from "./accounts.api"
import { ACCOUNT_QUERY_KEYS } from "./accounts.constants"
import type {
  ConvertToBusinessPayload,
  MyAccount,
  ProvisionAccountPayload,
  UpdateAccountPayload,
  UpdateAddressPayload,
} from "./accounts.types"

// Region and resource-group selections are scoped to the active account; clear
// them when the account changes so each re-seeds for the new account. Mirrors
// the org switch handoff.
const SCOPED_STORAGE_KEYS = ["console-active-region", "bsc-active-rg"]

/** Accounts the signed-in user can act in — their own plus any invited into. */
export function useMyAccounts() {
  return useQuery({
    queryKey: ACCOUNT_QUERY_KEYS.mine,
    queryFn: accountsApi.listMine,
    staleTime: 60_000,
  })
}

/** Members (with role) of a single account. */
export function useAccountMembers(id: string | undefined) {
  return useQuery({
    queryKey: ACCOUNT_QUERY_KEYS.members(id ?? ""),
    queryFn: () => accountsApi.listMembers(id ?? ""),
    enabled: !!id,
  })
}

// Re-export the client-held active scope (memory + IndexedDB) so callers keep
// importing it from the accounts module.
export { useActiveScope }

/**
 * The account the console is currently scoped to. The active id is the
 * client-held scope (X-Account-Id): match it back to one of the caller's
 * accounts, else fall back to their owned/home account (is_owner), else the
 * first entry.
 */
export function resolveActiveAccount(
  accounts: MyAccount[],
  activeId: string | null,
): MyAccount | null {
  if (accounts.length === 0) return null
  return (
    (activeId ? accounts.find((a) => a.id === activeId) : undefined) ??
    accounts.find((a) => a.is_owner) ??
    accounts[0]
  )
}

/**
 * The switchable accounts plus the currently active one. Validates the
 * client-held scope against the caller's real memberships: a stored account id
 * that is no longer in the list (membership revoked / account transferred) is
 * dropped, falling the console back to the home account. The backend
 * re-authorizes every request regardless — this just keeps the UI honest.
 */
export function useActiveAccount() {
  const { data, isLoading } = useMyAccounts()
  const scope = useActiveScope()
  const accounts = data ?? []

  useEffect(() => {
    if (!data || data.length === 0) return
    const id = activeScope.getAccountId()
    // Stored id no longer valid (membership revoked / account transferred) —
    // drop it so we re-pin a live one below.
    if (id && !data.some((a) => a.id === id)) activeScope.clear()
    // Pin the resolved home account when no valid scope is set yet. Without
    // this, a fresh login (empty IndexedDB, user never switched accounts)
    // sends X-Account-Id as "" → the backend scopes writes to uuid.Nil,
    // where TenantBaseEntity.BeforeCreate skips the tenant_serial assignment
    // and every resource shows up as vpc-0 / vm-0. The header must always
    // carry a real account id.
    if (!activeScope.getAccountId()) {
      const home = resolveActiveAccount(data, null)
      if (home) {
        activeScope.set({
          accountId: home.id,
          organizationId: home.organization?.id ?? null,
        })
      }
    }
  }, [data])

  return {
    accounts,
    activeAccount: resolveActiveAccount(accounts, scope.accountId),
    isLoading,
  }
}

/**
 * Switch the console to another account: pin the client-held scope (memory +
 * IndexedDB → sent as X-Account-Id), drop account-scoped selections, and
 * hard-reload so every context (region, resource group, IAM, billing)
 * re-bootstraps cleanly under the new scope.
 */
export function useSwitchAccount() {
  return useCallback((account: MyAccount) => {
    activeScope.set({ accountId: account.id, organizationId: account.organization?.id ?? null })
    for (const key of SCOPED_STORAGE_KEYS) localStorage.removeItem(key)
    window.location.assign("/")
  }, [])
}

/**
 * Provision a new standalone account owned by the caller. Does NOT auto-switch —
 * it refreshes the list so the new account appears in the switcher, leaving the
 * user in their current account.
 */
export function useProvisionAccount() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: ProvisionAccountPayload) => accountsApi.provision(payload),
    onSuccess: (account) => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEYS.mine })
      toast.success(t("accounts.toasts.created", { name: account.name }))
    },
    onError: (err) => {
      if (!handleQuotaGateError(err)) {
        toast.error(extractError(err, t("accounts.toasts.createFailed")))
      }
    },
  })
}

/** Rename and/or change an account's lifecycle status. */
export function useUpdateAccount() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAccountPayload }) =>
      accountsApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEYS.mine })
      toast.success(t("accounts.toasts.saved"))
    },
    onError: (err) => {
      toast.error(extractError(err, t("accounts.toasts.saveFailed")))
    },
  })
}

/** An account's contact/verification profile (address + KYC status). */
export function useAccountProfile(id: string | undefined) {
  return useQuery({
    queryKey: ACCOUNT_QUERY_KEYS.profile(id ?? ""),
    queryFn: () => accountsApi.getProfile(id ?? ""),
    enabled: !!id,
  })
}

/** Upsert an account's contact address (owner/admin). */
export function useUpdateAddress(id: string) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: UpdateAddressPayload) => accountsApi.updateAddress(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEYS.profile(id) })
      toast.success(t("accounts.toasts.saved"))
    },
    onError: (err) => {
      toast.error(extractError(err, t("accounts.toasts.saveFailed")))
    },
  })
}

/** Convert an individual account into a business account (owner/admin). */
export function useConvertToBusiness(id: string) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: ConvertToBusinessPayload) => accountsApi.convertToBusiness(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEYS.profile(id) })
      void queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEYS.mine })
      toast.success(
        t("account.settings.convert.success", {
          defaultValue: "Account converted to business. Please complete verification.",
        }),
      )
    },
    onError: (err) => {
      toast.error(extractError(err, t("accounts.toasts.saveFailed")))
    },
  })
}

/**
 * Whether an ownership transfer is pending for this account. Drives the
 * resumable code-entry step and the "transfer pending" banner so closing the
 * dialog no longer strands the flow. Enabled only for the account owner.
 */
export function usePendingTransfer(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ACCOUNT_QUERY_KEYS.transferPending(id),
    queryFn: () => accountsApi.pendingTransfer(id),
    enabled,
  })
}

/** Start an ownership transfer — emails an OTP to the current owner. */
export function useInitiateTransfer(id: string) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (targetEmail: string) => accountsApi.initiateTransfer(id, targetEmail),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ACCOUNT_QUERY_KEYS.transferPending(id),
      })
    },
    onError: (err) => {
      toast.error(extractError(err, t("accounts.toasts.saveFailed")))
    },
  })
}

/** Confirm an ownership transfer with the OTP the owner received. */
export function useConfirmTransfer(id: string) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (otp: string) => accountsApi.confirmTransfer(id, otp),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEYS.mine })
      void queryClient.invalidateQueries({
        queryKey: ACCOUNT_QUERY_KEYS.transferPending(id),
      })
      toast.success(
        t("account.settings.transfer.success", {
          defaultValue: "Ownership transferred.",
        }),
      )
    },
    onError: (err) => {
      toast.error(extractError(err, t("accounts.toasts.saveFailed")))
    },
  })
}

/** Abandon an in-flight ownership transfer, clearing the pending code. */
export function useCancelTransfer(id: string) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: () => accountsApi.cancelTransfer(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ACCOUNT_QUERY_KEYS.transferPending(id),
      })
      toast.success(
        t("account.settings.transfer.cancelled", { defaultValue: "Transfer cancelled." }),
      )
    },
    onError: (err) => {
      toast.error(extractError(err, t("accounts.toasts.saveFailed")))
    },
  })
}

/** Make an account the caller's home/primary account (the switcher default). */
export function useSetDefaultAccount() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (id: string) => accountsApi.setDefault(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEYS.mine })
      toast.success(t("accounts.toasts.defaultSet"))
    },
    onError: (err) => {
      toast.error(extractError(err, t("accounts.toasts.defaultFailed")))
    },
  })
}
