/**
 * Promo codes — shared between the operator console (/admin/promo-codes) and the
 * tenant one (/billing/promotions).
 *
 * One module rather than two because the two surfaces describe the same object:
 * the admin decides what a code grants, and the tenant sees what it granted
 * them. Splitting the types would let those two descriptions drift, which is
 * exactly the kind of drift a customer notices and an operator does not.
 */

/** A code either tops up the wallet once, or discounts what the account launches. */
export type PromoKind = "credit" | "percent_off"

/** Stored lifecycle. `expired`/`exhausted`/`scheduled` are derived, never stored. */
export type PromoStatus = "active" | "paused"

/** The effective label the server computes, which is what every surface renders. */
export type PromoState = "active" | "paused" | "scheduled" | "expired" | "exhausted"

/** ChargeInput.Kind values a percent-off code can be scoped to. */
export type PromoScope =
  | "compute"
  | "storage"
  | "network"
  | "loadbalancer"
  | "hosting"
  | "managedapps"

export interface PromoCode {
  id: string
  code: string
  name: string
  description: string
  kind: PromoKind

  credit_amount: number
  discount_pct: number
  /** Empty array means every resource kind — see the backend entity. */
  applies_to: PromoScope[]
  duration_days: number

  max_redemptions: number
  per_account_limit: number
  redeemed_count: number
  /** null for an uncapped code: the UI shows "Unlimited", not a number. */
  remaining_seats: number | null

  new_accounts_only: boolean
  new_account_max_age_days: number

  starts_at: string | null
  ends_at: string | null

  status: PromoStatus
  state: PromoState

  credits_granted: number
  active_redemptions: number

  created_at: string
  updated_at: string
}

export interface CreatePromoCodeRequest {
  code: string
  name: string
  description?: string
  kind: PromoKind
  credit_amount?: number
  discount_pct?: number
  applies_to?: PromoScope[]
  duration_days?: number
  max_redemptions?: number
  per_account_limit?: number
  new_accounts_only?: boolean
  new_account_max_age_days?: number
  starts_at?: string | null
  ends_at?: string | null
  status?: PromoStatus
}

/**
 * Every field optional: the form posts only what changed. `clear_starts_at` /
 * `clear_ends_at` exist because a JSON null is indistinguishable from an absent
 * key on the server, and "run this with no end date after all" has to be
 * expressible.
 */
export interface UpdatePromoCodeRequest {
  name?: string
  description?: string
  credit_amount?: number
  discount_pct?: number
  applies_to?: PromoScope[]
  duration_days?: number
  max_redemptions?: number
  per_account_limit?: number
  new_accounts_only?: boolean
  new_account_max_age_days?: number
  starts_at?: string | null
  ends_at?: string | null
  clear_starts_at?: boolean
  clear_ends_at?: boolean
  status?: PromoStatus
}

export type RedemptionStatus = "active" | "expired" | "revoked"

export interface PromoRedemption {
  id: string
  promo_code_id: string
  code: string

  account_id: string
  account_name: string
  account_number: string
  user_id: string
  user_name: string
  user_email: string

  kind: PromoKind
  credit_amount: number
  discount_pct: number
  applies_to: PromoScope[]

  status: RedemptionStatus
  expires_at: string | null
  revoked_reason?: string
  redeemed_at: string
}

export interface PromoStats {
  total_codes: number
  active_codes: number
  total_redemptions: number
  credits_granted: number
  active_discounts: number
  accounts_reached: number
}

/* ── Tenant ─────────────────────────────────────────────────────────────── */

export interface RedeemResult {
  code: string
  kind: PromoKind
  description: string
  credit_amount?: number
  new_balance?: number
  discount_pct?: number
  applies_to?: PromoScope[]
  expires_at?: string | null
}

export interface MyPromotion {
  id: string
  code: string
  kind: PromoKind
  description: string
  credit_amount: number
  discount_pct: number
  applies_to: PromoScope[]
  status: RedemptionStatus
  expires_at: string | null
  redeemed_at: string
}

/**
 * Where the wallet balance came from. NOT a set of separate wallets — the
 * platform holds one balance and every charge draws on it. These are lifetime
 * totals per route in, which is why they can sum to more than `balance`.
 */
export interface WalletSplit {
  balance: number
  purchased: number
  granted: number
  adjusted: number
  spent: number
  /** Upper bound on how much of the CURRENT balance is still promotional. */
  granted_share: number
  active_promotions: number
}

/**
 * Machine-readable refusal reasons the redeem/preview endpoints return in the
 * body, so the console can explain the refusal in the user's language instead of
 * echoing the server's English.
 */
export type RedeemFailureReason =
  | "not_found"
  | "paused"
  | "not_started"
  | "expired"
  | "exhausted"
  | "already_redeemed"
  | "new_accounts_only"
