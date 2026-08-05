import { UNLIMITED } from "./hosting.constants"
import type { HostingAccount, HostingPlan } from "./hosting.types"

/**
 * Renders a megabyte limit.
 *
 * -1 is "unlimited" and 0 is a genuine "none" — they are opposite ends of the
 * catalogue and must never render the same way, which is the whole reason the
 * sentinel is negative rather than zero.
 */
export function formatLimitMB(mb: number): string {
  if (mb === UNLIMITED) return "Unlimited"
  if (mb === 0) return "None"
  if (mb >= 1024 * 1024) return `${round(mb / 1024 / 1024)} TB`
  if (mb >= 1024) return `${round(mb / 1024)} GB`
  return `${round(mb)} MB`
}

/** Renders a plain count limit with the same unlimited/none distinction. */
export function formatCount(n: number): string {
  if (n === UNLIMITED) return "Unlimited"
  if (n === 0) return "None"
  return String(n)
}

function round(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

export function formatMoney(amount: number, currency = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount)
  } catch {
    // An unknown currency code must not blank out a price.
    return `${currency} ${amount}`
  }
}

/**
 * Percentage of a quota consumed, or null when there is no ceiling to be a
 * percentage of. Callers render null as "unlimited" rather than as a full bar.
 */
export function usagePct(used: number, limit: number): number | null {
  if (limit === UNLIMITED || limit <= 0) return null
  return Math.min(100, Math.round((used / limit) * 100))
}

/** Colour band for a usage bar. Amber from 80%, red from 95%. */
export function usageTone(pct: number | null): "ok" | "warn" | "danger" {
  if (pct === null) return "ok"
  if (pct >= 95) return "danger"
  if (pct >= 80) return "warn"
  return "ok"
}

/** The cheapest cycle a plan is actually sold on, for the "from ₹X" headline. */
export function entryPrice(plan: HostingPlan): { amount: number; cycle: string } | null {
  const options: { amount: number; cycle: string }[] = [
    { amount: plan.pricing.monthly, cycle: "monthly" },
    { amount: plan.pricing.quarterly, cycle: "quarterly" },
    { amount: plan.pricing.annual, cycle: "annual" },
  ].filter((o) => o.amount > 0)
  // Seeded with the first entry rather than a sentinel: a zero-amount seed
  // would win every comparison and report a price nobody is charged.
  const [first, ...rest] = options
  if (options.length === 0) return null
  return rest.reduce((lowest, o) => (o.amount < lowest.amount ? o : lowest), first)
}

/** Cycles a plan is offered on — a zero price means the cycle is not sold. */
export function soldCycles(plan: HostingPlan): string[] {
  const out: string[] = []
  if (plan.pricing.monthly > 0) out.push("monthly")
  if (plan.pricing.quarterly > 0) out.push("quarterly")
  if (plan.pricing.annual > 0) out.push("annual")
  return out
}

/**
 * Whether the control panel behind an account supports an action.
 *
 * Fails closed: an account whose module declared no capabilities can be asked
 * to do nothing, which is the right default for a server row naming a panel
 * this build does not know.
 */
export function hasCapability(account: HostingAccount, capability: string): boolean {
  return account.capabilities.includes(capability)
}

/**
 * The bar colour for a usage percentage, in one place.
 *
 * Inlining the thresholds as nested ternaries at each of the five call sites is
 * how "amber at 80" quietly becomes "amber at 75" on one page only.
 */
export function usageBarClass(pct: number | null): string {
  switch (usageTone(pct)) {
    case "danger":
      return "bg-destructive"
    case "warn":
      return "bg-amber-500"
    default:
      return "bg-emerald-500"
  }
}

/**
 * The one-line explanation of what an account is doing right now.
 *
 * Provisioning is deliberately reported separately from status: an account can
 * be ACTIVE with a suspension queued, and telling the customer only "active"
 * while their site is about to go off would be a lie of omission.
 */
export function accountSummary(account: HostingAccount): string {
  if (account.provisioning) return "Work in progress — this usually takes under a minute"
  switch (account.status) {
    case "PENDING":
      return "Waiting to be set up"
    case "ACTIVE":
      return "Live"
    case "SUSPENDED":
      return account.suspension_reason ? `Suspended — ${account.suspension_reason}` : "Suspended"
    case "TERMINATED":
      return "Terminated"
    case "FAILED":
      return "Setup failed — our team has been notified"
    default:
      return account.status
  }
}
