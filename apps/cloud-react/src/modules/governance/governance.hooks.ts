import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { extractError } from "@/services/api/client"

import { governanceApi } from "./governance.api"
import { GOVERNANCE_QUERY_KEYS } from "./governance.constants"
import type { NamingRule } from "./governance.types"

export function useNamingPolicy() {
    return useQuery({
        queryKey: GOVERNANCE_QUERY_KEYS.namingPolicy,
        queryFn: governanceApi.getNamingPolicy,
    })
}

/** The live naming convention for the caller's org, wrapped as a `NamingRule`.
 * The `resourceKey` argument is accepted for backward compatibility with the
 * resource create forms but is ignored — one convention applies to every
 * resource. Falls back to the platform default while the policy loads. */
export function useNamingRule(
    // _resourceKey is accepted for call-site compatibility — one convention applies
    // to every resource, so the key is intentionally ignored.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _resourceKey?: string,
): { rule: NamingRule; isLoading: boolean } {
    const { data, isLoading } = useNamingPolicy()
    // Empty pattern means "allow any name" — the default until an admin sets one.
    const pattern = data?.namingConvention ?? ""
    return { rule: { pattern }, isLoading }
}

export function useUpdateNamingPolicy() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (pattern: string) => governanceApi.updateNamingPolicy(pattern),
        onSuccess: (policy) => {
            queryClient.setQueryData(GOVERNANCE_QUERY_KEYS.namingPolicy, policy)
            void queryClient.invalidateQueries({ queryKey: GOVERNANCE_QUERY_KEYS.namingPolicy })
            toast.success(t("naming.toasts.saved"))
        },
        onError: (err) => {
            toast.error(extractError(err, t("naming.toasts.saveFailed")))
        },
    })
}
