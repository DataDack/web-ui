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

/** An increase request. It IS a support ticket — `id` and `ticket_id` are the
 *  same value — so the review outcome and any conversation live on the thread
 *  the row links to, not on a field here. */
export interface QuotaRequest {
  id: string
  ticket_id: string
  quota_code: string
  quota_name: string
  /** The effective limit as it stood when the request was filed. */
  current_limit: number
  requested_limit: number
  /** What was actually granted; present only once approved. −1 = unlimited. */
  granted_limit?: number
  justification: string
  status: QuotaRequestStatus
  created_at: string
  reviewed_at?: string | null
}

export interface CreateQuotaRequestInput {
  quota_code: string
  requested_limit: number
  justification: string
}
