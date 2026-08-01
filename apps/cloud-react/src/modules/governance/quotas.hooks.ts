import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { extractError } from "@/services/api/client"

import { quotasApi } from "./quotas.api"
import type { CreateQuotaRequestInput } from "./quotas.types"

export const QUOTAS_QUERY_KEYS = {
    quotas: ["governance", "quotas"] as const,
    quotaRequests: ["governance", "quota-requests"] as const,
}

export function useQuotas() {
    return useQuery({
        queryKey: QUOTAS_QUERY_KEYS.quotas,
        queryFn: () => quotasApi.list(),
    })
}

export function useQuotaRequests() {
    return useQuery({
        queryKey: QUOTAS_QUERY_KEYS.quotaRequests,
        queryFn: () => quotasApi.listRequests(),
    })
}

export function useRequestQuotaIncrease() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (input: CreateQuotaRequestInput) => quotasApi.createRequest(input),
        onSuccess: () => {
            // A pending request shows on the Requests tab and (once approved)
            // changes effective limits — refresh both.
            void queryClient.invalidateQueries({ queryKey: QUOTAS_QUERY_KEYS.quotaRequests })
            void queryClient.invalidateQueries({ queryKey: QUOTAS_QUERY_KEYS.quotas })
            toast.success(t("governance.quotas.toasts.requested"))
        },
        onError: (err) => {
            toast.error(extractError(err, t("governance.quotas.toasts.requestFailed")))
        },
    })
}
