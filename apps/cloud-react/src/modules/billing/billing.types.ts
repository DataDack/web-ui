// Shapes mirror cloud-be-go: apps/billing/credits.
//
// Credits are billed at ₹1 = 1 credit. Monetary amounts that originate from a
// payment (base_amount / gst_amount / total_amount / amount) are in paise;
// `credits` and the wallet `balance` are in whole credits (₹).

export type PurchaseStatus = "pending" | "paid" | "failed" | "cancelled" | "expired"

/** Current wallet balance for the caller's billing account. */
export interface CreditBalance {
  account_id: string
  /** Wallet balance in credits (₹). */
  balance: number
  currency: string
}

/** One wallet top-up and its payment/settlement state. */
export interface CreditPurchase {
  id: string
  created_at: string
  updated_at: string
  account_id: string
  user_id: string
  /** Wallet value bought, in whole credits (₹). */
  credits: number
  base_amount: number
  gst_rate: number
  gst_amount: number
  total_amount: number
  currency: string
  status: PurchaseStatus
  payment_id: string
  razorpay_payment_id: string
  paid_at: string | null
}

/** Itemized cost of a purchase; monetary fields in paise. */
export interface Breakdown {
  credits: number
  base_amount: number
  gst_rate: number
  gst_amount: number
  total_amount: number
  currency: string
}

/**
 * A recurring monthly credit purchase (subscription-style top-up). Monetary
 * fields are in paise to match {@link CreditPurchase}. Mock-data only for now.
 */
export interface MonthlyPurchase {
  id: string
  /** Billing period the purchase covers, ISO month start (e.g. 2026-06-01). */
  period: string
  /** Plan name the recurring purchase belongs to. */
  plan: string
  /** Wallet value bought, in whole credits (₹). */
  credits: number
  gst_amount: number
  total_amount: number
  status: PurchaseStatus
  created_at: string
}

/**
 * Credits consumed by a single resource within the current month.
 * `creditsUsed` is in whole credits (₹). Mock-data only for now.
 */
export interface ResourceUsage {
  id: string
  /** Display name of the resource (e.g. an instance or volume). */
  resource: string
  /** Service the resource belongs to (Compute, Storage, Network…). */
  service: string
  region: string
  /** Human-readable consumed quantity (e.g. "320 hrs", "500 GB"). */
  quantity: string
  /** Human-readable unit rate (e.g. "₹0.80/hr"). */
  rate: string
  /** Credits spent on this resource this month (₹). */
  creditsUsed: number
}

/** One movement on the wallet — a top-up, a usage charge, or an adjustment. */
export type LedgerKind = "credit" | "debit"

/**
 * A single entry in the credit ledger. `amount` is always positive (₹); `kind`
 * carries the direction. `balance` is the running wallet balance after the
 * entry was applied. This is the view shape the table renders; it is mapped from
 * {@link LedgerApiEntry} returned by cloud-be-go.
 */
export interface LedgerEntry {
  id: string
  created_at: string
  description: string
  kind: LedgerKind
  /** Magnitude of the movement, in credits (₹). */
  amount: number
  /** Running wallet balance after this entry, in credits (₹). */
  balance: number
  /** Idempotency tag of automated postings (topup | usage | invoice | adjustment). */
  ref_type: string
}

/**
 * Raw ledger entry as returned by GET /billing/ledger/{accountId}
 * (apps/billing/ledger). `amount`/`balance_after` are in credits (₹).
 */
export interface LedgerApiEntry {
  id: string
  created_at: string
  account_id: string
  entry_type: LedgerKind
  amount: number
  currency: string
  balance_after: number
  description: string
  ref_type: string
  ref_id: string | null
}

// ── Invoices, usage, and subscriptions (apps/billing/invoices + apps/billing/charge) ──

export type InvoiceStatus = "draft" | "open" | "paid" | "void" | "overdue"

/** A billing invoice. Money fields are in ₹ (numeric, 2dp). */
export interface Invoice {
  id: string
  created_at: string
  account_id: string
  invoice_number: string
  period_start: string
  period_end: string
  subtotal: number
  tax: number
  total: number
  currency: string
  status: InvoiceStatus
  issued_at: string | null
  due_at: string | null
  paid_at: string | null
  emailed_at: string | null
}

/** One metered usage record (hourly resources). Cost is pre-tax ₹. */
export interface UsageRecordApi {
  id: string
  created_at: string
  account_id: string
  resource_urn: string
  service: string
  metric: string
  quantity: number
  unit: string
  unit_price: number
  cost: number
  period_start: string
  period_end: string
  invoice_item_id: string | null
}

export type SubscriptionStatus = "active" | "overdue" | "suspended" | "cancelled"

/** A recurring/metered billing subscription for one resource. */
export interface SubscriptionApi {
  id: string
  created_at: string
  account_id: string
  resource_urn: string
  resource_kind: string
  service: string
  description: string
  cycle: "monthly" | "hourly"
  monthly_amount: number
  hourly_rate: number
  currency: string
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  next_renewal_at: string | null
  grace_until: string | null
}

export interface PurchaseCreditsRequest {
  /** Whole number of credits to buy (1 credit = ₹1). */
  credits: number
  /** Where the gateway returns the browser after the hosted checkout completes. */
  redirect_url: string
}

/**
 * Returned by POST /billing/credits/purchase. The gateway hosts the checkout
 * page: redirect the browser to `payment_url`. The gateway opens Razorpay
 * Checkout there, settles the payment (crediting the wallet via the webhook),
 * and returns the customer to `redirect_url` with `?status=&payment_id=`.
 */
export interface PurchaseCreditsResponse {
  purchase_id: string
  payment_id: string
  /** Hosted checkout page — redirect the browser here. */
  payment_url: string
  /** Total charged, paise = the credit value (GST inclusive). */
  amount: number
  currency: string
  breakdown: Breakdown
}
