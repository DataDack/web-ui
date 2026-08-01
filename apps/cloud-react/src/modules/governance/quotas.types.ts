// Service quotas — account limits resolved by the backend quotas module
// (apps/quotas). Shapes mirror the Go DTOs 1:1 (snake_case, no mapping layer).

export type QuotaScope = "account" | "user"

export type QuotaSource = "default" | "increase_request" | "plan_change" | "admin_adjustment"

export type QuotaRequestStatus = "pending" | "approved" | "rejected"

/** One quota with its resolved limit and live usage — a row on the Quotas page. */
export interface EffectiveQuota {
    code: string
    name: string
    /** Registry module the code belongs to: compute | vpc | monitoring | … */
    module: string
    scope: QuotaScope
    /** −1 = unlimited */
    limit: number
    usage: number
    unit: string
    adjustable: boolean
    /** True only when an override is in force (never for plain defaults). */
    adjusted: boolean
    source: QuotaSource
    /** The would-be limit without the override; absent when not adjusted. */
    adjusted_from?: number | null
}

export interface QuotaRequest {
    id: string
    quota_code: string
    quota_name: string
    current_limit: number
    requested_limit: number
    justification: string
    status: QuotaRequestStatus
    created_at: string
    reviewed_at?: string | null
    review_note?: string
}

export interface CreateQuotaRequestInput {
    quota_code: string
    requested_limit: number
    justification: string
}
