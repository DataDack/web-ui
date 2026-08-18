import type { Plan, PlanLimits } from "../../managed-apps.types"

/**
 * The sentinel the catalogue uses for "no ceiling".
 *
 * It cannot be 0, and reading it as such is the one mistake this whole module
 * is arranged to prevent: Starter sells ZERO custom domains while Developer Pro
 * sells unlimited ones. Rendering the free tier's hard zero as "Unlimited"
 * would promise something nobody bought.
 */
const UNLIMITED = -1
type LimitValue = number | null | undefined

function isKnownLimit(limit: LimitValue): limit is number {
  return typeof limit === "number" && Number.isFinite(limit)
}

export function isUnlimited(limit: LimitValue): boolean {
  return limit === UNLIMITED
}

/**
 * A quota as a human reads it. The three cases are genuinely distinct — no
 * ceiling, a real none, and a number — so each gets its own word.
 */
export function formatLimit(limit: LimitValue): string {
  if (!isKnownLimit(limit)) return "—"
  if (isUnlimited(limit)) return "Unlimited"
  if (limit === 0) return "None"
  return limit.toLocaleString()
}

/**
 * A monthly price.
 *
 * `price_inr_monthly` is in WHOLE RUPEES, as the pricing sheet states it —
 * there is no minor unit to divide by. A tier with no list price (-1, Enterprise)
 * says so in words: formatting it as a number would print "₹-1".
 *
 * Falls back to the ISO code for a currency the browser cannot format, which
 * beats throwing inside a render.
 */
export function formatPrice(
  plan: Pick<Plan, "price_inr_monthly" | "currency" | "is_custom_priced">,
): string {
  if (plan.is_custom_priced || plan.price_inr_monthly < 0) return "Custom"
  if (plan.price_inr_monthly === 0) return "Free"
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: plan.currency,
      maximumFractionDigits: 0,
    }).format(plan.price_inr_monthly)
  } catch {
    return `${plan.currency} ${plan.price_inr_monthly.toLocaleString()}`
  }
}

/**
 * A money amount already in MAJOR units (rupees), for the cost breakdown.
 *
 * Separate from `formatPrice` because the two answer different questions: a
 * catalogue price is a whole-rupee list figure, while an estimate is the exact
 * amount the wallet is debited, fractions and all.
 *
 * Fractions are always shown here: a breakdown that renders ₹71.86 as ₹72 no
 * longer adds up to the total printed beneath it.
 */
export function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export interface PlanHighlight {
  label: string
  value: string
}

export interface QuotaField {
  key: keyof PlanLimits
  label: string
  /** Appended to the number — "GB", "MB", "s". */
  suffix?: string
}

/**
 * Every quota in the catalogue, named once.
 *
 * One table rather than three lists: the picker, the detail panel and the
 * upgrade diff all describe the same eight numbers, and when the labels lived
 * in each of them separately they could disagree about what a number was
 * called. The first four are the ones a tier is chosen on — see planHighlights.
 */
export const QUOTA_FIELDS: QuotaField[] = [
  { key: "max_projects", label: "Projects" },
  { key: "bandwidth_gb", label: "Bandwidth", suffix: " GB" },
  { key: "build_minutes", label: "Build minutes" },
  { key: "max_custom_domains", label: "Custom domains" },
  { key: "max_static_sites", label: "Static sites" },
  { key: "max_edge_projects", label: "Edge projects" },
  { key: "request_timeout_seconds", label: "Request timeout", suffix: "s" },
  { key: "edge_requests", label: "Edge requests" },
]

function formatField(field: QuotaField, limits: PlanLimits): string {
  const limit = limits[field.key] as LimitValue
  if (!isKnownLimit(limit)) return "—"
  return `${formatLimit(limit)}${field.suffix ?? ""}`
}

/**
 * One quota's label and formatted value, looked up by key.
 *
 * The comparison table places each quota in the group it belongs to rather than
 * in one block, so it needs them one at a time — but it must not re-declare the
 * label or the suffix, which is exactly the disagreement QUOTA_FIELDS exists to
 * prevent. An unknown key returns undefined rather than throwing: the key set is
 * a compile-time union today, but this is the one seam a catalogue change could
 * widen without the table noticing.
 */
export function quotaField(key: keyof PlanLimits): QuotaField | undefined {
  return QUOTA_FIELDS.find((field) => field.key === key)
}

export function formatQuota(key: keyof PlanLimits, limits: PlanLimits): string {
  const field = quotaField(key)
  return field ? formatField(field, limits) : formatLimit(limits[key])
}

/**
 * The four quotas a tier is actually chosen on.
 *
 * The catalogue carries eight. Showing all of them turns a choice into a
 * spreadsheet, and the remaining four (upload body, request timeout, edge
 * requests, custom domains) only matter once something is already running —
 * they belong on the project's plan panel, not in the picker.
 */
export function planHighlights(limits: PlanLimits): PlanHighlight[] {
  return QUOTA_FIELDS.slice(0, 4).map((field) => ({
    label: field.label,
    value: formatField(field, limits),
  }))
}

/** Every quota, for the detail panel where the full picture is the point. */
export function planQuotaRows(limits: PlanLimits): PlanHighlight[] {
  return QUOTA_FIELDS.map((field) => ({
    label: field.label,
    value: formatField(field, limits),
  }))
}

export interface PlanQuotaDelta {
  label: string
  from: string
  to: string
  /** Whether the number moves in the account's favour. */
  direction: "up" | "down"
}

/**
 * What actually changes between two tiers.
 *
 * Only the quotas that differ, because a plan change is read to answer one
 * question — what do I gain, what do I lose — and eight unchanged rows bury
 * the two that moved. Unlimited compares as larger than every finite limit,
 * which is the one comparison the -1 sentinel would otherwise get backwards.
 */
export function planQuotaDeltas(from: PlanLimits, to: PlanLimits): PlanQuotaDelta[] {
  const rank = (value: number) => (isUnlimited(value) ? Infinity : value)
  return QUOTA_FIELDS.flatMap((field) => {
    const before = rank(from[field.key])
    const after = rank(to[field.key])
    if (before === after) return []
    return [
      {
        label: field.label,
        from: formatField(field, from),
        to: formatField(field, to),
        direction: after > before ? ("up" as const) : ("down" as const),
      },
    ]
  })
}
