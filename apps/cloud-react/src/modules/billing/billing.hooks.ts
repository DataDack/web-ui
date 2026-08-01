import { useMutation, useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { BILLING_QUERY_KEYS } from "./billing.constants"
import { billingService } from "./billing.service"
import type { PurchaseCreditsRequest } from "./billing.types"

export function useCreditBalance() {
    return useQuery({
        queryKey: BILLING_QUERY_KEYS.balance,
        queryFn: billingService.fetchBalance,
    })
}

export function useCreditPurchases() {
    return useQuery({
        queryKey: BILLING_QUERY_KEYS.purchases,
        queryFn: billingService.fetchPurchases,
    })
}

/**
 * Fetches the account's credit ledger. Disabled until the account id is known
 * (it comes from the balance response), since the endpoint is account-scoped.
 */
export function useLedger(accountId: string | undefined) {
    return useQuery({
        queryKey: BILLING_QUERY_KEYS.ledger(accountId ?? ""),
        queryFn: () => billingService.fetchLedger(accountId!),
        enabled: typeof accountId === "string" && accountId !== "",
    })
}

export function useInvoices() {
    return useQuery({
        queryKey: BILLING_QUERY_KEYS.invoices,
        queryFn: billingService.fetchInvoices,
    })
}

export function useUsage() {
    return useQuery({
        queryKey: BILLING_QUERY_KEYS.usage,
        queryFn: billingService.fetchUsage,
    })
}

export function useSubscriptions() {
    return useQuery({
        queryKey: BILLING_QUERY_KEYS.subscriptions,
        queryFn: billingService.fetchSubscriptions,
    })
}

/**
 * Starts a credit purchase and hands off to the gateway's hosted checkout page.
 * On success the browser is redirected to payment_url; settlement happens via the
 * webhook, and the gateway returns the customer to redirect_url afterward.
 */
export function useBuyCredits() {
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (payload: PurchaseCreditsRequest) => billingService.purchaseCredits(payload),
        onSuccess: (res) => {
            window.location.assign(res.payment_url)
        },
        onError: () => toast.error(t("billing.toasts.purchaseFailed")),
    })
}
