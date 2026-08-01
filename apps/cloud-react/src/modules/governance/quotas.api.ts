import { apiGet, apiPost } from "@/services/api/client"

import type { CreateQuotaRequestInput, EffectiveQuota, QuotaRequest } from "./quotas.types"

const BASE = "/quotas/quotas"

export const quotasApi = {
    /** Effective quotas for the active account (limit ⊕ overrides ⊕ usage). */
    list: async (): Promise<EffectiveQuota[]> => {
        const res = await apiGet<{ quotas?: EffectiveQuota[] }>(BASE)
        return res.quotas ?? []
    },

    /** The account's own increase requests, newest first. */
    listRequests: async (): Promise<QuotaRequest[]> => {
        // Tolerate both a bare array and a { requests } wrapper.
        const res = await apiGet<{ requests?: QuotaRequest[] } | QuotaRequest[]>(`${BASE}/requests`)
        return Array.isArray(res) ? res : (res.requests ?? [])
    },

    createRequest: (input: CreateQuotaRequestInput): Promise<QuotaRequest> =>
        apiPost<QuotaRequest>(`${BASE}/requests`, input),
}
