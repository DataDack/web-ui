import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { extractError } from "@/services/api/client"
import { publishConsoleEvent } from "@/services/broadcast"

import { promotionsApi, redeemFailureReason } from "./promotions.api"
import { PROMO_QUERY_KEYS } from "./promotions.constants"
import type {
  CreatePromoCodeRequest,
  PromoStatus,
  RedeemResult,
  UpdatePromoCodeRequest,
} from "./promotions.types"

/* ── Operator ───────────────────────────────────────────────────────────── */

export function usePromoCodes() {
  return useQuery({
    queryKey: PROMO_QUERY_KEYS.codes,
    queryFn: promotionsApi.listCodes,
  })
}

export function usePromoStats() {
  return useQuery({
    queryKey: PROMO_QUERY_KEYS.stats,
    queryFn: promotionsApi.stats,
  })
}

/** A code's redemptions. Disabled until a code is selected — the detail sheet
 *  mounts before it has one. */
export function usePromoRedemptions(codeId: string | undefined) {
  return useQuery({
    queryKey: PROMO_QUERY_KEYS.redemptions(codeId ?? ""),
    queryFn: () => promotionsApi.listRedemptions(codeId!),
    enabled: !!codeId,
  })
}

/** Refetch the list AND the tiles: every write moves at least one of the tiles. */
function useInvalidatePromos() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: PROMO_QUERY_KEYS.codes })
    void queryClient.invalidateQueries({ queryKey: PROMO_QUERY_KEYS.stats })
  }
}

export function useSavePromoCode() {
  const { t } = useTranslation()
  const invalidate = useInvalidatePromos()
  return useMutation({
    mutationFn: (vars: { id?: string; payload: CreatePromoCodeRequest | UpdatePromoCodeRequest }) =>
      vars.id
        ? promotionsApi.updateCode(vars.id, vars.payload as UpdatePromoCodeRequest)
        : promotionsApi.createCode(vars.payload as CreatePromoCodeRequest),
    onSuccess: (_code, vars) => {
      invalidate()
      toast.success(
        vars.id ? t("superAdmin.promoCodes.toasts.updated") : t("superAdmin.promoCodes.toasts.created"),
      )
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.promoCodes.toasts.failed"))),
  })
}

export function useSetPromoStatus() {
  const { t } = useTranslation()
  const invalidate = useInvalidatePromos()
  return useMutation({
    mutationFn: (vars: { id: string; status: PromoStatus }) =>
      promotionsApi.setCodeStatus(vars.id, vars.status),
    onSuccess: (_code, vars) => {
      invalidate()
      toast.success(
        vars.status === "paused"
          ? t("superAdmin.promoCodes.toasts.paused")
          : t("superAdmin.promoCodes.toasts.resumed"),
      )
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.promoCodes.toasts.failed"))),
  })
}

export function useDeletePromoCode() {
  const { t } = useTranslation()
  const invalidate = useInvalidatePromos()
  return useMutation({
    mutationFn: (vars: { id: string }) => promotionsApi.deleteCode(vars.id),
    onSuccess: () => {
      invalidate()
      toast.success(t("superAdmin.promoCodes.toasts.deleted"))
    },
    // The server refuses to delete a code that has been redeemed (409) and says
    // why; extractError surfaces that instead of a generic failure, because
    // "pause it instead" is the actual next step.
    onError: (e) => toast.error(extractError(e, t("superAdmin.promoCodes.toasts.failed"))),
  })
}

export function useRevokeRedemption(codeId: string | undefined) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const invalidate = useInvalidatePromos()
  return useMutation({
    mutationFn: (vars: { id: string; reason: string }) =>
      promotionsApi.revokeRedemption(vars.id, vars.reason),
    onSuccess: () => {
      invalidate()
      void queryClient.invalidateQueries({ queryKey: PROMO_QUERY_KEYS.redemptions(codeId ?? "") })
      toast.success(t("superAdmin.promoCodes.toasts.revoked"))
    },
    onError: (e) => toast.error(extractError(e, t("superAdmin.promoCodes.toasts.failed"))),
  })
}

/* ── Tenant ─────────────────────────────────────────────────────────────── */

export function useMyPromotions() {
  return useQuery({
    queryKey: PROMO_QUERY_KEYS.mine,
    queryFn: promotionsApi.mine,
  })
}

export function useWalletSplit() {
  return useQuery({
    queryKey: PROMO_QUERY_KEYS.wallet,
    queryFn: promotionsApi.wallet,
  })
}

/**
 * Translate a refused redemption into the user's language.
 *
 * The server's `reason` key is preferred over its English message precisely so
 * this is possible; the message is kept as the fallback for a refusal shape the
 * console doesn't know about yet, which is better than showing nothing.
 */
export function usePromoErrorMessage() {
  const { t } = useTranslation()
  return (e: unknown) => {
    const reason = redeemFailureReason(e)
    if (reason) return t(`billing.promotions.errors.${reason}`)
    return extractError(e, t("billing.promotions.errors.generic"))
  }
}

/**
 * Dry-run a code. Used by the redeem box as the customer types (on submit, not
 * per keystroke) and by the shared-link landing, so the page can show what a
 * code is worth before anyone commits to it.
 */
export function usePreviewPromo() {
  return useMutation({
    mutationFn: (code: string) => promotionsApi.preview(code),
  })
}

/**
 * Apply a code.
 *
 * A credit grant moves the wallet, so the balance every billing surface shows is
 * now stale — the whole "billing" key is invalidated, and other open tabs are
 * told through the same broadcast the top-up flow uses, rather than being left
 * showing a number that is wrong until someone reloads them.
 */
export function useRedeemPromo() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const describeError = usePromoErrorMessage()
  return useMutation({
    mutationFn: (code: string) => promotionsApi.redeem(code),
    onSuccess: (res: RedeemResult) => {
      void queryClient.invalidateQueries({ queryKey: ["billing"] })
      if (res.kind === "credit") {
        publishConsoleEvent({ type: "billing:credited" })
        toast.success(
          t("billing.promotions.toasts.creditApplied", {
            amount: (res.credit_amount ?? 0).toLocaleString("en-IN"),
          }),
        )
      } else {
        toast.success(
          t("billing.promotions.toasts.discountApplied", { pct: res.discount_pct ?? 0 }),
        )
      }
    },
    onError: (e) => toast.error(describeError(e)),
  })
}
