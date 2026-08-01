// Client-side wallet pre-flight for resource creation, mirroring the backend
// charge gates (apps/billing/charge) so the console can pop a dialog instead of
// letting the create request die on a raw 402.

import { GST_RATE } from "./billing.constants"
import type { CreditBalance, SubscriptionApi } from "./billing.types"

/** Minimum funded runway (hours of usage the wallet must cover) required to
 * launch an hourly resource. Mirrors hourlyRunwayHours in the backend charge
 * engine — the server enforces it with a 402; this client-side check just
 * surfaces it as a dialog before the request is made. */
export const HOURLY_RUNWAY_HOURS = 24

/** Below this many hours of remaining account-wide runway we warn the user
 * their account is about to go overdue (metering will start failing soon). */
export const LOW_RUNWAY_WARN_HOURS = 3

const round2 = (v: number) => Math.round(v * 100) / 100
const withGst = (base: number) => round2(base + (base * GST_RATE) / 100)

export type CreditGuardVerdict =
  | { kind: "overdue" }
  | { kind: "insufficient"; required: number; balance: number; shortfall: number }
  | { kind: "low-runway"; runwayHours: number; balance: number }

export interface CreditGuardInput {
  balance: CreditBalance | undefined
  subscriptions: SubscriptionApi[]
  /** Billing cycle of the resource about to be created. */
  cycle: "hourly" | "monthly"
  /** Pre-tax ₹/hour of the resource (hourly cycle). */
  hourlyRate: number
  /** Pre-tax ₹/month of the resource (monthly cycle). */
  monthlyAmount: number
}

/**
 * Pre-flight wallet check before creating a billable resource:
 *
 *  1. any overdue subscription → the account is overdue, block.
 *  2. monthly: balance < month upfront (incl. GST) → insufficient, block.
 *     hourly: balance < 24h runway (incl. GST) → insufficient, block.
 *  3. account-wide hourly burn (existing + new) leaves < 3h of runway →
 *     warn that the account is about to go overdue (continue allowed).
 *
 * Returns null when the wallet is healthy. Skips silently while the balance is
 * still loading — the server gate remains the authority.
 */
export function evaluateCreditGuard(input: CreditGuardInput): CreditGuardVerdict | null {
  const { balance, subscriptions, cycle, hourlyRate, monthlyAmount } = input
  if (!balance) return null

  if (subscriptions.some((s) => s.status === "overdue")) {
    return { kind: "overdue" }
  }

  const required =
    cycle === "hourly"
      ? withGst(round2(HOURLY_RUNWAY_HOURS * hourlyRate))
      : withGst(round2(monthlyAmount))
  if (required > 0 && balance.balance < required) {
    return {
      kind: "insufficient",
      required,
      balance: balance.balance,
      shortfall: round2(Math.max(0, required - balance.balance)),
    }
  }

  // Account-wide burn: every active hourly subscription keeps metering, and
  // the new resource adds its own rate the moment it launches.
  const existingBurn = subscriptions
    .filter((s) => s.cycle === "hourly" && s.status === "active")
    .reduce((sum, s) => sum + s.hourly_rate, 0)
  const burnPerHour = withGst(existingBurn + (cycle === "hourly" ? hourlyRate : 0))
  if (burnPerHour > 0) {
    const runwayHours = balance.balance / burnPerHour
    if (runwayHours < LOW_RUNWAY_WARN_HOURS) {
      return { kind: "low-runway", runwayHours, balance: balance.balance }
    }
  }
  return null
}
